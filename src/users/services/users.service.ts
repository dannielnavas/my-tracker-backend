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
import { CreateUserDto } from '../dtos/user.dto';
import { Users } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    // @Inject('PG') private client: Client, para usar querys con postgres
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
      subscriptionPlan: {
        subscription_plan_id: data.subscription_plan_id,
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
}
