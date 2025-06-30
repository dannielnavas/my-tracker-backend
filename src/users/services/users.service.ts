import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import config from 'src/config';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    // @Inject('PG') private client: Client, para usar querys con postgres
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}
  async create(data: CreateUserDto) {
    const hashPassword = await bcrypt.hashSync(data.password, 10);
    const newUser = this.userRepo.create({
      ...data,
      password: hashPassword,
      subscription_plan_id: {
        subscription_plan_id: data.subscription_plan_id,
      },
    });
    return this.userRepo.save(newUser);
  }

  async findOneByEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
