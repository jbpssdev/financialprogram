import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { OpeningBalanceDto } from './dto/opening-balance.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('opening-balance')
  setOpeningBalance(@Body() dto: OpeningBalanceDto) {
    return this.inventoryService.setOpeningBalance(dto);
  }

  @Post('adjustments')
  createAdjustment(@Body() dto: CreateStockAdjustmentDto) {
    return this.inventoryService.createAdjustment(dto);
  }

  @Get()
  getInventoryOverview() {
    return this.inventoryService.getInventoryOverview();
  }

  @Get(':productId')
  getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Get(':productId/movements')
  getProductMovements(@Param('productId') productId: string) {
    return this.inventoryService.getProductMovements(productId);
  }
}
