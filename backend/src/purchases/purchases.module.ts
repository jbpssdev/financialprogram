import { Module } from '@nestjs/common';
import { MonthlyClosingsModule } from '../monthly-closings/monthly-closings.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [MonthlyClosingsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
