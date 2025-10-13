import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
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
  ) {}
  async create(data: CreateUserDto) {
    const user = await this.findOneByEmail(data.email);
    if (user) {
      throw new BadRequestException('User already exists');
    }
    const hashPassword = await bcrypt.hashSync(data.password, 10);
    const newUser = this.userRepo.create({
      ...data,
      password: hashPassword,
      role: 'user',
      profile_image:
        data.profile_image ||
        'https://ui-avatars.com/api/?name=' + data.full_name,
      subscriptionPlan: {
        subscription_plan_id: 1,
      },
    });
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
    this.userRepo.update(id, data);
    return this.userRepo.save(user);
  }

  async changePassword(id: number, password: string) {
    const user = await this.findOne(id);
    const hashPassword = await bcrypt.hashSync(password, 10);
    user.password = hashPassword;
    return this.userRepo.save(user);
  }
}
