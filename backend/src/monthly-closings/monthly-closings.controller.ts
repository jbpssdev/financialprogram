import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateMonthlyClosingDto } from './dto/create-monthly-closing.dto';
import { PreviewMonthlyClosingDto } from './dto/preview-monthly-closing.dto';
import { QueryMonthlyClosingDto } from './dto/query-monthly-closing.dto';
import { MonthlyClosingsService } from './monthly-closings.service';

@Controller('monthly-closings')
export class MonthlyClosingsController {
  constructor(private readonly monthlyClosingsService: MonthlyClosingsService) {}

  @Get('preview')
  preview(@Query() query: PreviewMonthlyClosingDto) {
    return this.monthlyClosingsService.preview(query);
  }

  @Post()
  create(@Body() dto: CreateMonthlyClosingDto) {
    return this.monthlyClosingsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryMonthlyClosingDto) {
    return this.monthlyClosingsService.findAll(query);
  }

  @Get('period/:year/:month')
  findByPeriod(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.monthlyClosingsService.findByPeriod(year, month);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyClosingsService.findOne(id);
  }
}
