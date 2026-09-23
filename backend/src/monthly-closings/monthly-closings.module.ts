import { Module } from '@nestjs/common';
import { MonthlyClosingsController } from './monthly-closings.controller';
import { MonthlyClosingsService } from './monthly-closings.service';

@Module({
  controllers: [MonthlyClosingsController],
  providers: [MonthlyClosingsService],
  exports: [MonthlyClosingsService],
})
export class MonthlyClosingsModule {}
