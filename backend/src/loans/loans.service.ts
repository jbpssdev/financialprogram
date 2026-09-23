import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus, LoanPaymentStatus, LoanStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CancelLoanPaymentDto } from './dto/cancel-loan-payment.dto';
import { CreateLoanInstallmentDto } from './dto/create-loan-installment.dto';
import { CreateLoanPaymentDto } from './dto/create-loan-payment.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { QueryLoansDto } from './dto/query-loans.dto';
import { UpdateLoanInstallmentDto } from './dto/update-loan-installment.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // LOANS
  // ==========================================

  async create(dto: CreateLoanDto) {
    if (dto.principalAmount <= 0) {
      throw new BadRequestException('O valor do principal (principalAmount) deve ser estritamente maior que zero.');
    }

    const principalAmount = new Prisma.Decimal(dto.principalAmount);
    const totalPayable = dto.totalPayable ? new Prisma.Decimal(dto.totalPayable) : principalAmount;

    if (totalPayable.lessThan(principalAmount)) {
      throw new BadRequestException('O valor total a pagar (totalPayable) não pode ser menor que o principal do empréstimo.');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    return this.prisma.loan.create({
      data: {
        lenderName: dto.lenderName.trim(),
        description: dto.description?.trim() ?? null,
        principalAmount,
        totalPayable,
        remainingPrincipal: principalAmount,
        installments: dto.installments ?? 1,
        startDate,
        status: LoanStatus.ACTIVE,
        notes: dto.notes?.trim() ?? null,
      },
    });
  }

  async findAll(query?: QueryLoansDto) {
    const where: Prisma.LoanWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.startDate || query?.endDate) {
      where.startDate = {};
      if (query.startDate) {
        where.startDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startDate.lte = new Date(query.endDate);
      }
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        installmentsList: true,
        payments: true,
      },
      orderBy: { startDate: 'desc' },
    });

    const now = new Date();

    let totalPrincipal = new Prisma.Decimal(0);
    let totalRemainingPrincipal = new Prisma.Decimal(0);
    let totalPrincipalPaid = new Prisma.Decimal(0);
    let totalInterestPaid = new Prisma.Decimal(0);
    let totalPaid = new Prisma.Decimal(0);

    const enrichedLoans = loans.map((loan) => {
      let loanInterestPaid = new Prisma.Decimal(0);
      let loanPrincipalPaid = new Prisma.Decimal(0);

      // Only count CONFIRMED payments
      for (const p of loan.payments) {
        if (p.status === LoanPaymentStatus.CONFIRMED) {
          loanPrincipalPaid = loanPrincipalPaid.plus(p.principalPaid);
          loanInterestPaid = loanInterestPaid.plus(p.interestPaid);
        }
      }

      const loanTotalPaid = loanPrincipalPaid.plus(loanInterestPaid);

      let installmentsPending = 0;
      let installmentsPaid = 0;
      let installmentsOverdue = 0;

      for (const inst of loan.installmentsList) {
        if (inst.status === InstallmentStatus.PAID) {
          installmentsPaid++;
        } else if (inst.status !== InstallmentStatus.CANCELED) {
          installmentsPending++;
          if (inst.dueDate < now) {
            installmentsOverdue++;
          }
        }
      }

      totalPrincipal = totalPrincipal.plus(loan.principalAmount);
      totalRemainingPrincipal = totalRemainingPrincipal.plus(loan.remainingPrincipal);
      totalPrincipalPaid = totalPrincipalPaid.plus(loanPrincipalPaid);
      totalInterestPaid = totalInterestPaid.plus(loanInterestPaid);
      totalPaid = totalPaid.plus(loanTotalPaid);

      return {
        ...loan,
        principalPaid: loanPrincipalPaid.toFixed(2),
        totalInterestPaid: loanInterestPaid.toFixed(2),
        totalPaid: loanTotalPaid.toFixed(2),
        installmentsPending,
        installmentsPaid,
        installmentsOverdue,
      };
    });

    return {
      data: enrichedLoans,
      summary: {
        totalPrincipal: totalPrincipal.toFixed(2),
        totalRemainingPrincipal: totalRemainingPrincipal.toFixed(2),
        totalPrincipalPaid: totalPrincipalPaid.toFixed(2),
        totalInterestPaid: totalInterestPaid.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
      },
    };
  }

  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        installmentsList: {
          orderBy: { installmentNumber: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException(`Empréstimo com ID "${id}" não foi encontrado.`);
    }

    const now = new Date();
    let totalInterestPaid = new Prisma.Decimal(0);
    let principalPaid = new Prisma.Decimal(0);

    for (const p of loan.payments) {
      if (p.status === LoanPaymentStatus.CONFIRMED) {
        principalPaid = principalPaid.plus(p.principalPaid);
        totalInterestPaid = totalInterestPaid.plus(p.interestPaid);
      }
    }

    const totalPaid = principalPaid.plus(totalInterestPaid);
    let installmentsOverdue = 0;

    const installments = loan.installmentsList.map((inst) => {
      const isOverdue =
        inst.dueDate < now &&
        inst.status !== InstallmentStatus.PAID &&
        inst.status !== InstallmentStatus.CANCELED;

      if (isOverdue) {
        installmentsOverdue++;
      }

      const remainingAmount = inst.expectedAmount.minus(inst.paidAmount);

      return {
        ...inst,
        isOverdue,
        remainingAmount: remainingAmount.toFixed(2),
      };
    });

    return {
      ...loan,
      principalPaid: principalPaid.toFixed(2),
      totalInterestPaid: totalInterestPaid.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      installmentsOverdue,
      installmentsList: installments,
    };
  }

  async update(id: string, dto: UpdateLoanDto) {
    const loan = await this.findOne(id);

    const updateData: Prisma.LoanUpdateInput = {};

    if (dto.lenderName !== undefined) {
      updateData.lenderName = dto.lenderName.trim();
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes ? dto.notes.trim() : null;
    }

    if (dto.status !== undefined) {
      if (dto.status === LoanStatus.PAID && Number(loan.remainingPrincipal) > 0) {
        throw new BadRequestException(
          'Não é possível marcar o empréstimo como PAID enquanto houver saldo principal devedor.',
        );
      }
      updateData.status = dto.status;
    }

    return this.prisma.loan.update({
      where: { id },
      data: updateData,
    });
  }

  // ==========================================
  // INSTALLMENTS
  // ==========================================

  async createInstallment(loanId: string, dto: CreateLoanInstallmentDto) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException(`Empréstimo com ID "${loanId}" não foi encontrado.`);
    }

    if (loan.status === LoanStatus.PAID) {
      throw new BadRequestException('Não é possível adicionar parcelas a um empréstimo já quitado (PAID).');
    }

    if (loan.status === LoanStatus.RENEGOTIATED) {
      throw new BadRequestException('Não é possível adicionar parcelas a um empréstimo renegociado.');
    }

    const existingInstallment = await this.prisma.loanInstallment.findUnique({
      where: {
        loanId_installmentNumber: {
          loanId,
          installmentNumber: dto.installmentNumber,
        },
      },
    });

    if (existingInstallment) {
      throw new ConflictException(
        `Já existe a parcela de número ${dto.installmentNumber} cadastrada neste empréstimo.`,
      );
    }

    const principalExpected = new Prisma.Decimal(dto.principalExpected);
    const interestExpected = new Prisma.Decimal(dto.interestExpected ?? 0);
    const calculatedTotal = principalExpected.plus(interestExpected);

    if (dto.expectedAmount !== undefined) {
      const providedTotal = new Prisma.Decimal(dto.expectedAmount);
      if (!providedTotal.equals(calculatedTotal)) {
        throw new BadRequestException(
          `expectedAmount (${providedTotal.toFixed(2)}) deve ser exatamente igual a principalExpected + interestExpected (${calculatedTotal.toFixed(2)}).`,
        );
      }
    }

    return this.prisma.loanInstallment.create({
      data: {
        loanId,
        installmentNumber: dto.installmentNumber,
        dueDate: new Date(dto.dueDate),
        principalExpected,
        interestExpected,
        expectedAmount: calculatedTotal,
        paidAmount: new Prisma.Decimal(0),
        status: InstallmentStatus.PENDING,
        notes: dto.notes?.trim() ?? null,
      },
    });
  }

  async findAllInstallments(loanId: string) {
    await this.findOne(loanId);

    const installments = await this.prisma.loanInstallment.findMany({
      where: { loanId },
      orderBy: { installmentNumber: 'asc' },
    });

    const now = new Date();

    return installments.map((inst) => {
      const isOverdue =
        inst.dueDate < now &&
        inst.status !== InstallmentStatus.PAID &&
        inst.status !== InstallmentStatus.CANCELED;

      return {
        ...inst,
        isOverdue,
        remainingAmount: inst.expectedAmount.minus(inst.paidAmount).toFixed(2),
      };
    });
  }

  async findOneInstallment(loanId: string, installmentId: string) {
    await this.findOne(loanId);

    const installment = await this.prisma.loanInstallment.findUnique({
      where: { id: installmentId },
    });

    if (!installment || installment.loanId !== loanId) {
      throw new NotFoundException(`Parcela com ID "${installmentId}" não foi encontrada no empréstimo "${loanId}".`);
    }

    const now = new Date();
    const isOverdue =
      installment.dueDate < now &&
      installment.status !== InstallmentStatus.PAID &&
      installment.status !== InstallmentStatus.CANCELED;

    return {
      ...installment,
      isOverdue,
      remainingAmount: installment.expectedAmount.minus(installment.paidAmount).toFixed(2),
    };
  }

  async updateInstallment(loanId: string, installmentId: string, dto: UpdateLoanInstallmentDto) {
    const existing = await this.findOneInstallment(loanId, installmentId);

    const updateData: Prisma.LoanInstallmentUpdateInput = {};

    if (dto.dueDate !== undefined) {
      updateData.dueDate = new Date(dto.dueDate);
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes ? dto.notes.trim() : null;
    }

    if (dto.status !== undefined) {
      if (dto.status === InstallmentStatus.CANCELED && Number(existing.paidAmount) > 0) {
        throw new BadRequestException('Parcelas que já possuem pagamentos efetuados não podem ser canceladas.');
      }
      updateData.status = dto.status;
    }

    return this.prisma.loanInstallment.update({
      where: { id: installmentId },
      data: updateData,
    });
  }

  // ==========================================
  // PAYMENTS & ATOMIC TRANSACTIONS
  // ==========================================

  async createPayment(loanId: string, installmentId: string, dto: CreateLoanPaymentDto) {
    const rawAmount = dto.amountPaid ?? dto.amount;

    if (rawAmount === undefined || rawAmount <= 0) {
      throw new BadRequestException('O valor do pagamento (amountPaid ou amount) deve ser estritamente maior que zero.');
    }

    const amountDecimal = new Prisma.Decimal(rawAmount);
    const principalPaidDecimal = new Prisma.Decimal(dto.principalPaid);
    const interestPaidDecimal = new Prisma.Decimal(dto.interestPaid);

    if (!amountDecimal.equals(principalPaidDecimal.plus(interestPaidDecimal))) {
      throw new BadRequestException(
        `O valor pago (${amountDecimal.toFixed(2)}) deve ser exatamente igual à soma de principalPaid (${principalPaidDecimal.toFixed(2)}) + interestPaid (${interestPaidDecimal.toFixed(2)}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Deterministic row locking: Lock Loan first, then Installment
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM loan_installments WHERE id = ${installmentId} FOR UPDATE`;

      const loan = await tx.loan.findUnique({
        where: { id: loanId },
      });

      if (!loan) {
        throw new NotFoundException(`Empréstimo com ID "${loanId}" não foi encontrado.`);
      }

      if (loan.status === LoanStatus.PAID) {
        throw new BadRequestException('Este empréstimo já se encontra totalmente quitado (PAID).');
      }

      if (loan.status === LoanStatus.RENEGOTIATED) {
        throw new BadRequestException('Empréstimo renegociado não aceita pagamentos diretos.');
      }

      const installment = await tx.loanInstallment.findUnique({
        where: { id: installmentId },
      });

      if (!installment) {
        throw new NotFoundException(`Parcela com ID "${installmentId}" não foi encontrada.`);
      }

      if (installment.loanId !== loanId) {
        throw new BadRequestException('A parcela informada não pertence ao empréstimo especificado.');
      }

      if (installment.status === InstallmentStatus.CANCELED) {
        throw new BadRequestException('Parcela cancelada não pode receber pagamentos.');
      }

      if (installment.status === InstallmentStatus.PAID) {
        throw new BadRequestException('Esta parcela já está totalmente quitada.');
      }

      // Check overpayment on installment
      const remainingInstallment = installment.expectedAmount.minus(installment.paidAmount);
      if (amountDecimal.greaterThan(remainingInstallment)) {
        throw new BadRequestException(
          `Valor do pagamento (${amountDecimal.toFixed(2)}) excede o saldo restante da parcela (${remainingInstallment.toFixed(2)}).`,
        );
      }

      // Check principal against loan remaining principal
      if (principalPaidDecimal.greaterThan(loan.remainingPrincipal)) {
        throw new BadRequestException(
          `O principal amortizado (${principalPaidDecimal.toFixed(2)}) excede o saldo devedor principal do empréstimo (${loan.remainingPrincipal.toFixed(2)}).`,
        );
      }

      // 1. Create Payment
      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      const payment = await tx.loanPayment.create({
        data: {
          loanId,
          loanInstallmentId: installmentId,
          amountPaid: amountDecimal,
          principalPaid: principalPaidDecimal,
          interestPaid: interestPaidDecimal,
          paymentDate,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.PIX,
          status: LoanPaymentStatus.CONFIRMED,
          notes: dto.notes?.trim() ?? null,
        },
      });

      // 2. Update Installment
      const newPaidAmount = installment.paidAmount.plus(amountDecimal);
      const newInstallmentStatus = newPaidAmount.equals(installment.expectedAmount)
        ? InstallmentStatus.PAID
        : InstallmentStatus.PARTIALLY_PAID;

      const updatedInstallment = await tx.loanInstallment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaidAmount,
          status: newInstallmentStatus,
        },
      });

      // 3. Update Loan remainingPrincipal and status
      const newRemainingPrincipal = loan.remainingPrincipal.minus(principalPaidDecimal);
      const newLoanStatus = newRemainingPrincipal.isZero() ? LoanStatus.PAID : loan.status;

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingPrincipal: newRemainingPrincipal,
          status: newLoanStatus,
        },
      });

      return {
        payment,
        installment: {
          ...updatedInstallment,
          remainingAmount: updatedInstallment.expectedAmount.minus(updatedInstallment.paidAmount).toFixed(2),
        },
        loan: {
          ...updatedLoan,
          remainingPrincipal: updatedLoan.remainingPrincipal.toFixed(2),
        },
      };
    });
  }

  async cancelPayment(loanId: string, paymentId: string, dto: CancelLoanPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock Loan
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId} FOR UPDATE`;

      const loan = await tx.loan.findUnique({
        where: { id: loanId },
      });

      if (!loan) {
        throw new NotFoundException(`Empréstimo com ID "${loanId}" não foi encontrado.`);
      }

      // 2. Fetch payment
      const payment = await tx.loanPayment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException(`Pagamento com ID "${paymentId}" não foi encontrado.`);
      }

      if (payment.loanId !== loanId) {
        throw new BadRequestException('O pagamento informado não pertence ao empréstimo especificado.');
      }

      if (payment.status === LoanPaymentStatus.CANCELED) {
        throw new BadRequestException('Este pagamento já se encontra cancelado.');
      }

      // 3. Lock Installment if exists
      if (payment.loanInstallmentId) {
        await tx.$queryRaw`SELECT id FROM loan_installments WHERE id = ${payment.loanInstallmentId} FOR UPDATE`;
      }

      // 4. Lock Payment
      await tx.$queryRaw`SELECT id FROM loan_payments WHERE id = ${paymentId} FOR UPDATE`;

      // 5. Update Payment to CANCELED
      const canceledPayment = await tx.loanPayment.update({
        where: { id: paymentId },
        data: {
          status: LoanPaymentStatus.CANCELED,
          canceledAt: new Date(),
          cancellationReason: dto.reason.trim(),
        },
      });

      // 6. Recalculate Installment considering only CONFIRMED payments
      let updatedInstallment = null;
      if (payment.loanInstallmentId) {
        const installment = await tx.loanInstallment.findUniqueOrThrow({
          where: { id: payment.loanInstallmentId },
        });

        const confirmedInstallmentPayments = await tx.loanPayment.findMany({
          where: {
            loanInstallmentId: payment.loanInstallmentId,
            status: LoanPaymentStatus.CONFIRMED,
          },
        });

        let newPaidAmount = new Prisma.Decimal(0);
        for (const p of confirmedInstallmentPayments) {
          newPaidAmount = newPaidAmount.plus(p.amountPaid);
        }

        let newInstallmentStatus: InstallmentStatus;
        if (newPaidAmount.isZero()) {
          newInstallmentStatus = InstallmentStatus.PENDING;
        } else if (newPaidAmount.equals(installment.expectedAmount)) {
          newInstallmentStatus = InstallmentStatus.PAID;
        } else {
          newInstallmentStatus = InstallmentStatus.PARTIALLY_PAID;
        }

        const savedInst = await tx.loanInstallment.update({
          where: { id: payment.loanInstallmentId },
          data: {
            paidAmount: newPaidAmount,
            status: newInstallmentStatus,
          },
        });

        updatedInstallment = {
          ...savedInst,
          remainingAmount: savedInst.expectedAmount.minus(savedInst.paidAmount).toFixed(2),
        };
      }

      // 7. Recalculate Loan considering only CONFIRMED payments
      const confirmedLoanPayments = await tx.loanPayment.findMany({
        where: {
          loanId,
          status: LoanPaymentStatus.CONFIRMED,
        },
      });

      let totalPrincipalPaid = new Prisma.Decimal(0);
      for (const p of confirmedLoanPayments) {
        totalPrincipalPaid = totalPrincipalPaid.plus(p.principalPaid);
      }

      let newRemainingPrincipal = loan.principalAmount.minus(totalPrincipalPaid);
      if (newRemainingPrincipal.lessThan(0)) {
        newRemainingPrincipal = new Prisma.Decimal(0);
      }
      if (newRemainingPrincipal.greaterThan(loan.principalAmount)) {
        newRemainingPrincipal = loan.principalAmount;
      }

      let newLoanStatus = loan.status;
      if (newRemainingPrincipal.isZero()) {
        newLoanStatus = LoanStatus.PAID;
      } else if (loan.status === LoanStatus.PAID && newRemainingPrincipal.greaterThan(0)) {
        // Return to ACTIVE
        newLoanStatus = LoanStatus.ACTIVE;
      }
      // If loan is RENEGOTIATED, do not alter status automatically

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingPrincipal: newRemainingPrincipal,
          status: newLoanStatus,
        },
      });

      return {
        payment: canceledPayment,
        installment: updatedInstallment,
        loan: {
          ...updatedLoan,
          remainingPrincipal: updatedLoan.remainingPrincipal.toFixed(2),
        },
      };
    });
  }
}
