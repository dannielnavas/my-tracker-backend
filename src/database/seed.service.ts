import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlans } from '../users/entities/subscriptionPlans';
import { StatusTasks } from '../tasks/entities/statusTasks.entity';
import { Prompt } from '../prompt/entities/prompt.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(SubscriptionPlans)
    private readonly planRepo: Repository<SubscriptionPlans>,
    @InjectRepository(StatusTasks)
    private readonly statusRepo: Repository<StatusTasks>,
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Starting database seeding check...');

    try {
      await this.seedSubscriptionPlans();
      await this.seedStatusTasks();
      await this.seedDefaultPrompt();
      this.logger.log('Database seeding check finished successfully.');
    } catch (error) {
      this.logger.error('Failed to seed database:', error);
    }
  }

  private async seedSubscriptionPlans() {
    const count = await this.planRepo.count();
    if (count === 0) {
      this.logger.log('Seeding initial subscription plans...');
      const plans = [
        {
          subscription_plan_id: 1,
          name: 'free',
          price: 0.00,
          description: 'Plan Gratuito: Límite de 2 sprints y 30 tareas.',
        },
        {
          subscription_plan_id: 2,
          name: 'monthly',
          price: 5.99,
          description: 'Plan Mensual: Sprints y tareas ilimitadas.',
        },
        {
          subscription_plan_id: 3,
          name: 'lifetime',
          price: 59.00,
          description: 'Plan de por vida: Acceso total permanente.',
        },
      ];

      for (const plan of plans) {
        await this.planRepo.save(plan);
      }
      this.logger.log('Subscription plans seeded successfully.');
    } else {
      this.logger.log('Subscription plans table already seeded.');
    }
  }

  private async seedStatusTasks() {
    const count = await this.statusRepo.count();
    if (count === 0) {
      this.logger.log('Seeding mandatory task statuses...');
      const statuses = [
        { status_task_id: 1, name: 'Pending' },
        { status_task_id: 2, name: 'In Progress' },
        { status_task_id: 3, name: 'Completed' },
      ];

      for (const status of statuses) {
        await this.statusRepo.save(status);
      }
      this.logger.log('Task statuses seeded successfully.');
    } else {
      this.logger.log('Task statuses already seeded.');
    }
  }

  private async seedDefaultPrompt() {
    const count = await this.promptRepo.count();
    if (count === 0) {
      this.logger.log('Seeding default AI daily prompt...');
      const defaultPrompt = this.promptRepo.create({
        prompt: `You are an AI assistant helping a software team with their daily updates. Please generate a daily progress report (in markdown format) summarizing what was achieved yesterday (tasks completed) and what is planned for today.`,
      });
      await this.promptRepo.save(defaultPrompt);
      this.logger.log('Default AI prompt seeded successfully.');
    } else {
      this.logger.log('AI prompt table already seeded.');
    }
  }
}
