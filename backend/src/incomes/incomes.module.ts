import { Module } from '@nestjs/common';
import { MonthlyClosingsModule } from '../monthly-closings/monthly-closings.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

@Module({
  imports: [MonthlyClosingsModule],
  controllers: [IncomesController],
  providers: [IncomesService],
  exports: [IncomesService],
})
export class IncomesModule {}
