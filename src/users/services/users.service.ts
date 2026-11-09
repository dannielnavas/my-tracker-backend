import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from 'src/cloudinary/service/cloudinary.service';
import { EmailsService } from 'src/emails/services/emails.service';
import { Repository } from 'typeorm';
import config from '../../config';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';
import { Users } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    @InjectRepository(Users) private userRepo: Repository<Users>,
    private emailsService: EmailsService,
    @Optional() private cloudinaryService?: CloudinaryService,
  ) {}

  async create(data: CreateUserDto) {
    const user = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (user) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'User already exists',
      });
    }
    const hashPassword = await bcrypt.hash(data.password, 10);

    // role / subscription_plan_id / stripe_customer_id from client are always ignored:
    const {
      role: _r,
      subscription_plan_id: _p,
      stripe_customer_id: _s,
      ...safe
    } = data as any;
    void _r;
    void _p;
    void _s;

    const newUser: Users = this.userRepo.create({
      ...safe,
      password: hashPassword,
      role: 'user',
      profile_image:
        (data as any).profile_image ||
        'https://ui-avatars.com/api/?name=' +
          encodeURIComponent(data.full_name),
      subscriptionPlan: {
        subscription_plan_id: 1,
      },
    }) as unknown as Users;
    await this.emailsService.sendEmail(
      newUser.email,
      'Welcome to Focus Loop',
      newUser.full_name,
    );
    return this.userRepo.save(newUser);
  }

  async findOneByEmail(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['subscriptionPlan'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneByStripeCustomerId(stripeCustomerId: string) {
    const user = await this.userRepo.findOne({
      where: { stripe_customer_id: stripeCustomerId },
      relations: ['subscriptionPlan'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { user_id: id },
      relations: ['subscriptionPlan'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: number, data: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Client must never set role / plan / password / stripe id via profile PATCH.
    // Internal callers (Stripe webhook, mock checkout) use subscription_plan_id / stripe_customer_id directly from service.
    const {
      subscription_plan_id,
      role: _role,
      password: _pw,
      stripe_customer_id,
      ...rest
    } = data as any;
    void _role;
    void _pw;

    if (rest.email && rest.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: rest.email },
      });
      if (existing && existing.user_id !== id) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Email already in use',
        });
      }
    }

    // Base64 image -> storage URL
    if (
      rest.profile_image &&
      typeof rest.profile_image === 'string' &&
      rest.profile_image.startsWith('data:image/')
    ) {
      if (this.cloudinaryService) {
        const url = await this.cloudinaryService.uploadBase64(
          rest.profile_image,
          id,
        );
        // Cloudinary configured -> store URL; else keep data URI as fallback (profile_image is TEXT)
        rest.profile_image = url ?? rest.profile_image;
      }
      // If no cloudinary service (unit tests) keep data URI as-is (TEXT column).
    }

    // Merge preference / profile fields only
    const allowed: Record<string, unknown> = {};
    for (const key of [
      'full_name',
      'email',
      'profile_image',
      'preferences',
      'accept_terms',
    ] as const) {
      if (rest[key] !== undefined) allowed[key] = rest[key];
    }

    if (subscription_plan_id) {
      user.subscriptionPlan = { subscription_plan_id } as any;
    }
    if (stripe_customer_id) {
      user.stripe_customer_id = stripe_customer_id;
    }

    this.userRepo.merge(user, allowed as any);

    try {
      return await this.userRepo.save(user);
    } catch (err: any) {
      if (err?.code === '23505' || err?.driverError?.code === '23505') {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Email already in use',
        });
      }
      throw err;
    }
  }

  async changePassword(id: number, currentPass: string, newPass: string) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Current password does not match',
      });
    }

    const hashPassword = await bcrypt.hash(newPass, 10);
    user.password = hashPassword;
    await this.userRepo.save(user);
    return { message: 'Password changed successfully' };
  }
}
