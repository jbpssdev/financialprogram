import { Module } from '@nestjs/common';
import { MonthlyClosingsModule } from '../monthly-closings/monthly-closings.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [MonthlyClosingsModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
