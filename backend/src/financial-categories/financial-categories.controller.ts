import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { QueryFinancialCategoriesDto } from './dto/query-financial-categories.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';
import { FinancialCategoriesService } from './financial-categories.service';

@Controller('financial-categories')
export class FinancialCategoriesController {
  constructor(private readonly financialCategoriesService: FinancialCategoriesService) {}

  @Post()
  create(@Body() dto: CreateFinancialCategoryDto) {
    return this.financialCategoriesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryFinancialCategoriesDto) {
    return this.financialCategoriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.financialCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFinancialCategoryDto) {
    return this.financialCategoriesService.update(id, dto);
  }
}
