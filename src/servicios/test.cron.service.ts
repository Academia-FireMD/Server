import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TestStatus } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class TestExpirationService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateExpiredTests() {
    const now = new Date();
    await this.prisma.test.updateMany({
      where: {
        endsAt: { lt: now },
        status: { in: ['CREADO', 'EMPEZADO'] },
      },
      data: {
        status: TestStatus.FINALIZADO,
      },
    });
  }
}
