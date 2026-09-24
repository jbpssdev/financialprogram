import { Module } from '@nestjs/common';
import { MonthlyClosingsModule } from '../monthly-closings/monthly-closings.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [MonthlyClosingsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
