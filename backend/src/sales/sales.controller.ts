import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSaleDto) {
    return this.salesService.cancel(id, dto);
  }

  @Get()
  findAll(@Query() query: QuerySalesDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
