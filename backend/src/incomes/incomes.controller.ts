import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateIncomeDto } from './dto/create-income.dto';
import { QueryIncomesDto } from './dto/query-incomes.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  create(@Body() dto: CreateIncomeDto) {
    return this.incomesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryIncomesDto) {
    return this.incomesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIncomeDto) {
    return this.incomesService.update(id, dto);
  }
}
