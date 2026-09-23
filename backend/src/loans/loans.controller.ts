import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CancelLoanPaymentDto } from './dto/cancel-loan-payment.dto';
import { CreateLoanInstallmentDto } from './dto/create-loan-installment.dto';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { QueryLoansDto } from './dto/query-loans.dto';
import { UpdateLoanInstallmentDto } from './dto/update-loan-installment.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { LoansService } from './loans.service';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  // Loans endpoints
  @Post()
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryLoansDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return this.loansService.update(id, dto);
  }

  // Installments endpoints
  @Post(':loanId/installments')
  createInstallment(@Param('loanId') loanId: string, @Body() dto: CreateLoanInstallmentDto) {
    return this.loansService.createInstallment(loanId, dto);
  }

  @Get(':loanId/installments')
  findAllInstallments(@Param('loanId') loanId: string) {
    return this.loansService.findAllInstallments(loanId);
  }

  @Get(':loanId/installments/:installmentId')
  findOneInstallment(
    @Param('loanId') loanId: string,
    @Param('installmentId') installmentId: string,
  ) {
    return this.loansService.findOneInstallment(loanId, installmentId);
  }

  @Patch(':loanId/installments/:installmentId')
  updateInstallment(
    @Param('loanId') loanId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: UpdateLoanInstallmentDto,
  ) {
    return this.loansService.updateInstallment(loanId, installmentId, dto);
  }

  // Payments endpoints
  @Post(':loanId/installments/:installmentId/payments')
  createPayment(
    @Param('loanId') loanId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: CreateLoanPaymentDto,
  ) {
    return this.loansService.createPayment(loanId, installmentId, dto);
  }

  @Post(':loanId/payments/:paymentId/cancel')
  cancelPayment(
    @Param('loanId') loanId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: CancelLoanPaymentDto,
  ) {
    return this.loansService.cancelPayment(loanId, paymentId, dto);
  }
}
