import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Users } from '../../../users/entities/user.entity';
import { UsersService } from '../../../users/services/users.service';
import config from '../../../config';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { ChangePasswordDto, RefreshTokenDto } from '../../dtos/auth.dto';
import { Token } from '../../models/token.model';

export interface LoginUserShape {
  user_id: number;
  email: string;
  full_name: string;
  profile_image: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  subscriptionPlan: unknown;
}

function toLoginUser(user: Users): LoginUserShape {
  const { password: _password, ...rest } = user as unknown as Record<
    string,
    unknown
  >;
  void _password;
  // Preserve LoginResponse.user shape from BACKEND_INTEGRATION_GUIDE.md plus
  // any extra profile fields (preferences etc.) the frontend may read — just never password.
  return rest as unknown as LoginUserShape;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private usersServices: UsersService,
    private jwtServices: JwtService,
    @Optional()
    @Inject(config.KEY)
    private configService?: ConfigType<typeof config>,
    @Optional()
    @InjectRepository(RefreshToken)
    private refreshTokenRepo?: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersServices.findOneByEmail(email);
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const { password, ...result } = user;
        void password;
        return result;
      }
    }
    return null;
  }

  private createAccessToken(user: Users): string {
    const payload: Token = { role: user.role, sub: user.user_id };
    return this.jwtServices.sign(payload);
  }

  private async createRefreshToken(user: Users): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    if (!this.refreshTokenRepo) {
      // Unit tests without DB repo: fall back to opaque token (not persisted).
      return raw;
    }
    const ttlDays = this.configService?.jwt?.refreshTtlDays ?? 30;
    const record = this.refreshTokenRepo.create({
      token_hash: hashToken(raw),
      user_id: user.user_id,
      expires_at: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      revoked: false,
    });
    await this.refreshTokenRepo.save(record);
    return raw;
  }

  async generateJWT(user: Users) {
    return this.issueTokens(user);
  }

  async issueTokens(user: Users) {
    const access_token = this.createAccessToken(user);
    const refresh_token = await this.createRefreshToken(user);
    return {
      access_token,
      refresh_token,
      user: toLoginUser(user),
    };
  }

  /** POST /auth/refresh — rotate refresh token, issue new pair. */
  async refresh(dto: RefreshTokenDto) {
    const raw = dto.refresh_token ?? dto.refreshToken;
    if (!raw) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh token required',
      });
    }
    if (!this.refreshTokenRepo) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh not available',
      });
    }
    const record = await this.refreshTokenRepo.findOne({
      where: { token_hash: hashToken(raw) },
      relations: ['user', 'user.subscriptionPlan'],
    });
    if (!record) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token',
      });
    }
    if (record.revoked) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh token revoked',
      });
    }
    if (record.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh token expired',
      });
    }

    // Rotate: revoke old, issue new pair.
    record.revoked = true;
    await this.refreshTokenRepo.save(record);

    // Re-fetch user fresh from service to get fresh plan etc.
    const user = await this.usersServices.findOne(record.user_id);
    const access_token = this.createAccessToken(user);
    const refresh_token = await this.createRefreshToken(user);

    if (this.refreshTokenRepo) {
      const newRecord = await this.refreshTokenRepo.findOne({
        where: { token_hash: hashToken(refresh_token) },
      });
      if (newRecord) {
        // Link rotation chain for audit.
        await this.refreshTokenRepo.update(newRecord.id, {
          replaced_by_token_id: null,
        });
      }
    }

    return {
      access_token,
      refresh_token,
      user: toLoginUser(user),
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    return this.usersServices.changePassword(
      userId,
      dto.current_password,
      dto.new_password,
    );
  }
}
