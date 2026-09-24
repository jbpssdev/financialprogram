import { Module } from '@nestjs/common';
import { MonthlyClosingsModule } from '../monthly-closings/monthly-closings.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [MonthlyClosingsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
