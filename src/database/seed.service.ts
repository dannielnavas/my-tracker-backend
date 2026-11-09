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
    // Idempotent per-id upsert + repair — safe if table partially filled or
    // contains NULL names/descriptions (prod rows created before NOT NULL).
    const plans = [
      {
        subscription_plan_id: 1,
        name: 'free',
        price: 0.0,
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
        price: 59.0,
        description: 'Plan de por vida: Acceso total permanente.',
      },
    ];
    for (const plan of plans) {
      const existing = await this.planRepo.findOne({
        where: { subscription_plan_id: plan.subscription_plan_id },
      });
      if (!existing) {
        await this.planRepo.save(plan);
        this.logger.log(
          `Seeded subscription plan ${plan.subscription_plan_id} (${plan.name})`,
        );
        continue;
      }
      const needsRepair =
        !existing.name ||
        existing.name !== plan.name ||
        !existing.description ||
        existing.description !== plan.description ||
        existing.price == null ||
        Number(existing.price) !== plan.price;
      if (needsRepair) {
        existing.name = plan.name;
        existing.price = plan.price;
        existing.description = plan.description;
        await this.planRepo.save(existing);
        this.logger.log(
          `Repaired subscription plan ${plan.subscription_plan_id} (${plan.name})`,
        );
      }
    }
  }

  private async seedStatusTasks() {
    // Sacred IDs: 1=Pending, 2=In Progress, 3=Completed
    const statuses = [
      { status_task_id: 1, name: 'Pending' },
      { status_task_id: 2, name: 'In Progress' },
      { status_task_id: 3, name: 'Completed' },
    ];
    for (const status of statuses) {
      const existing = await this.statusRepo.findOne({
        where: { status_task_id: status.status_task_id },
      });
      if (!existing) {
        await this.statusRepo.save(status);
        this.logger.log(
          `Seeded task status ${status.status_task_id} (${status.name})`,
        );
        continue;
      }
      if (!existing.name || existing.name !== status.name) {
        existing.name = status.name;
        await this.statusRepo.save(existing);
        this.logger.log(
          `Repaired task status ${status.status_task_id} (${status.name})`,
        );
      }
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
    }
  }
}
