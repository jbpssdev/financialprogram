import { Module } from '@nestjs/common';
import { MonthlyClosingsController } from './monthly-closings.controller';
import { MonthlyClosingsService } from './monthly-closings.service';
import { PeriodLockService } from './period-lock.service';

@Module({
  controllers: [MonthlyClosingsController],
  providers: [MonthlyClosingsService, PeriodLockService],
  exports: [MonthlyClosingsService, PeriodLockService],
})
export class MonthlyClosingsModule {}
