import { BadRequestException } from '@nestjs/common';
import { InstallmentStatus, LoanPaymentStatus, LoanStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoansService } from './loans.service';

describe('LoansService', () => {
  let service: LoansService;
  let prisma: {
    loan: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    loanInstallment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    loanPayment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      loan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      loanInstallment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      loanPayment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new LoansService(prisma as unknown as PrismaService);
  });

  // A. Loan exige lenderName
  it('A. should create a Loan requiring lenderName with ACTIVE status', async () => {
    prisma.loan.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'loan-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      lenderName: 'Banco Alfa',
      description: 'Capital de Giro',
      principalAmount: 10000,
      totalPayable: 12000,
      installments: 10,
    });

    expect(result.id).toBe('loan-1');
    expect(result.lenderName).toBe('Banco Alfa');
    expect(result.description).toBe('Capital de Giro');
    expect(result.principalAmount).toEqual(new Prisma.Decimal(10000));
    expect(result.remainingPrincipal).toEqual(new Prisma.Decimal(10000));
    expect(result.totalPayable).toEqual(new Prisma.Decimal(12000));
    expect(result.status).toBe(LoanStatus.ACTIVE);
  });

  // B. description pode ser omitida
  it('B. should create a Loan when description is omitted', async () => {
    prisma.loan.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'loan-2',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      lenderName: 'Investidor Anjo',
      principalAmount: 5000,
    });

    expect(result.lenderName).toBe('Investidor Anjo');
    expect(result.description).toBeNull();
    expect(result.principalAmount).toEqual(new Prisma.Decimal(5000));
    expect(result.remainingPrincipal).toEqual(new Prisma.Decimal(5000));
  });

  // C. Pagamento novo inicia CONFIRMED
  it('C. should create a LoanPayment with status CONFIRMED', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(10000),
          status: LoanStatus.ACTIVE,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'loan-1',
            principalAmount: new Prisma.Decimal(10000),
            remainingPrincipal: data.remainingPrincipal,
            status: data.status,
          }),
        ),
      },
      loanInstallment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inst-1',
          loanId: 'loan-1',
          expectedAmount: new Prisma.Decimal(1200),
          paidAmount: new Prisma.Decimal(0),
          status: InstallmentStatus.PENDING,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-1',
            loanId: 'loan-1',
            expectedAmount: new Prisma.Decimal(1200),
            paidAmount: data.paidAmount,
            status: data.status,
          }),
        ),
      },
      loanPayment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-1',
            ...data,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.createPayment('loan-1', 'inst-1', {
      amount: 600,
      principalPaid: 500,
      interestPaid: 100,
      paymentMethod: PaymentMethod.PIX,
    });

    expect(result.payment.status).toBe(LoanPaymentStatus.CONFIRMED);
    expect(result.installment.status).toBe(InstallmentStatus.PARTIALLY_PAID);
    expect(result.installment.paidAmount).toEqual(new Prisma.Decimal(600));
    expect(result.loan.remainingPrincipal).toBe('9500.00');
  });

  // D. Cancelar pagamento parcial:
  // - pagamento -> CANCELED
  // - paidAmount da parcela recalculado
  // - remainingPrincipal restaurado corretamente
  // - juros cancelados deixam de aparecer nos totais.
  it('D. should cancel partial payment, restore remainingPrincipal and recalculate installment paidAmount', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(9500),
          status: LoanStatus.ACTIVE,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(9500),
          status: LoanStatus.ACTIVE,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'loan-1',
            principalAmount: new Prisma.Decimal(10000),
            remainingPrincipal: data.remainingPrincipal,
            status: data.status,
          }),
        ),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-1',
          loanId: 'loan-1',
          loanInstallmentId: 'inst-1',
          amountPaid: new Prisma.Decimal(600),
          principalPaid: new Prisma.Decimal(500),
          interestPaid: new Prisma.Decimal(100),
          status: LoanPaymentStatus.CONFIRMED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-1',
            status: data.status,
            cancellationReason: data.cancellationReason,
            canceledAt: data.canceledAt,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]), // No other confirmed payments
      },
      loanInstallment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'inst-1',
          expectedAmount: new Prisma.Decimal(1200),
          paidAmount: new Prisma.Decimal(600),
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-1',
            expectedAmount: new Prisma.Decimal(1200),
            paidAmount: data.paidAmount,
            status: data.status,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.cancelPayment('loan-1', 'pay-1', {
      reason: 'Lançamento duplicado',
    });

    expect(result.payment.status).toBe(LoanPaymentStatus.CANCELED);
    expect(result.installment?.paidAmount).toEqual(new Prisma.Decimal(0));
    expect(result.installment?.status).toBe(InstallmentStatus.PENDING);
    expect(result.loan.remainingPrincipal).toBe('10000.00');
  });

  // E. Cancelar um dos dois pagamentos de uma parcela:
  // - parcela volta de PAID para PARTIALLY_PAID quando apropriado.
  it('E. should regress installment from PAID to PARTIALLY_PAID when one of two payments is canceled', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(9000),
          status: LoanStatus.ACTIVE,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(9000),
          status: LoanStatus.ACTIVE,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'loan-1',
            principalAmount: new Prisma.Decimal(10000),
            remainingPrincipal: data.remainingPrincipal,
            status: data.status,
          }),
        ),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-2',
          loanId: 'loan-1',
          loanInstallmentId: 'inst-1',
          amountPaid: new Prisma.Decimal(600),
          principalPaid: new Prisma.Decimal(500),
          interestPaid: new Prisma.Decimal(100),
          status: LoanPaymentStatus.CONFIRMED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-2',
            status: data.status,
            cancellationReason: data.cancellationReason,
          }),
        ),
        // pay-1 remains confirmed: 600 amount, 500 principal
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pay-1',
            amountPaid: new Prisma.Decimal(600),
            principalPaid: new Prisma.Decimal(500),
            interestPaid: new Prisma.Decimal(100),
            status: LoanPaymentStatus.CONFIRMED,
          },
        ]),
      },
      loanInstallment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'inst-1',
          expectedAmount: new Prisma.Decimal(1200),
          paidAmount: new Prisma.Decimal(1200),
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-1',
            expectedAmount: new Prisma.Decimal(1200),
            paidAmount: data.paidAmount,
            status: data.status,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.cancelPayment('loan-1', 'pay-2', {
      reason: 'Estorno de pagamento excedente',
    });

    expect(result.installment?.paidAmount).toEqual(new Prisma.Decimal(600));
    expect(result.installment?.status).toBe(InstallmentStatus.PARTIALLY_PAID);
    expect(result.loan.remainingPrincipal).toBe('9500.00');
  });

  // F. Cancelar único pagamento:
  // - parcela volta para PENDING.
  it('F. should regress installment to PENDING when its sole payment is canceled', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(1000),
          remainingPrincipal: new Prisma.Decimal(0),
          status: LoanStatus.PAID,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(1000),
          remainingPrincipal: new Prisma.Decimal(0),
          status: LoanStatus.PAID,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'loan-1',
            principalAmount: new Prisma.Decimal(1000),
            remainingPrincipal: data.remainingPrincipal,
            status: data.status,
          }),
        ),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-sole',
          loanId: 'loan-1',
          loanInstallmentId: 'inst-1',
          amountPaid: new Prisma.Decimal(1200),
          principalPaid: new Prisma.Decimal(1000),
          interestPaid: new Prisma.Decimal(200),
          status: LoanPaymentStatus.CONFIRMED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-sole',
            status: data.status,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
      loanInstallment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'inst-1',
          expectedAmount: new Prisma.Decimal(1200),
          paidAmount: new Prisma.Decimal(1200),
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-1',
            expectedAmount: new Prisma.Decimal(1200),
            paidAmount: data.paidAmount,
            status: data.status,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.cancelPayment('loan-1', 'pay-sole', {
      reason: 'Cancelamento total',
    });

    expect(result.installment?.status).toBe(InstallmentStatus.PENDING);
    expect(result.installment?.paidAmount).toEqual(new Prisma.Decimal(0));
  });

  // G. Cancelar pagamento que quitou o Loan:
  // - Loan volta de PAID para ACTIVE;
  // - remainingPrincipal é restaurado.
  it('G. should regress Loan status from PAID to ACTIVE when payoff payment is canceled', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(5000),
          remainingPrincipal: new Prisma.Decimal(0),
          status: LoanStatus.PAID,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'loan-1',
          principalAmount: new Prisma.Decimal(5000),
          remainingPrincipal: new Prisma.Decimal(0),
          status: LoanStatus.PAID,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'loan-1',
            principalAmount: new Prisma.Decimal(5000),
            remainingPrincipal: data.remainingPrincipal,
            status: data.status,
          }),
        ),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-final',
          loanId: 'loan-1',
          loanInstallmentId: 'inst-final',
          amountPaid: new Prisma.Decimal(5500),
          principalPaid: new Prisma.Decimal(5000),
          interestPaid: new Prisma.Decimal(500),
          status: LoanPaymentStatus.CONFIRMED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-final',
            status: data.status,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
      loanInstallment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'inst-final',
          expectedAmount: new Prisma.Decimal(5500),
          paidAmount: new Prisma.Decimal(5500),
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-final',
            expectedAmount: new Prisma.Decimal(5500),
            paidAmount: data.paidAmount,
            status: data.status,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.cancelPayment('loan-1', 'pay-final', {
      reason: 'Estorno do pagamento final',
    });

    expect(result.loan.status).toBe(LoanStatus.ACTIVE);
    expect(result.loan.remainingPrincipal).toBe('5000.00');
  });

  // H. Duplo cancelamento: rejeitar
  it('H. should reject duplicate cancellation of an already canceled payment', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          status: LoanStatus.ACTIVE,
        }),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-1',
          loanId: 'loan-1',
          status: LoanPaymentStatus.CANCELED, // Already canceled
        }),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    await expect(
      service.cancelPayment('loan-1', 'pay-1', {
        reason: 'Tentativa duplicada',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // I. Cancelar pagamento de outro loan: rejeitar
  it('I. should reject canceling a payment that belongs to another loan', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-1',
          status: LoanStatus.ACTIVE,
        }),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-99',
          loanId: 'loan-other', // Belongs to different loan
          status: LoanPaymentStatus.CONFIRMED,
        }),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    await expect(
      service.cancelPayment('loan-1', 'pay-99', {
        reason: 'Pagamento de outro empréstimo',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // J. Payment CANCELED continua armazenado e consultável no histórico
  // K. Agregações consideram somente CONFIRMED
  it('J & K. should keep CANCELED payment in history but exclude it from totals and calculations', async () => {
    prisma.loan.findMany.mockResolvedValue([
      {
        id: 'loan-1',
        principalAmount: new Prisma.Decimal(10000),
        remainingPrincipal: new Prisma.Decimal(9500),
        installmentsList: [
          {
            id: 'inst-1',
            status: InstallmentStatus.PARTIALLY_PAID,
            dueDate: new Date('2026-10-10'),
          },
        ],
        payments: [
          {
            id: 'pay-conf',
            principalPaid: new Prisma.Decimal(500),
            interestPaid: new Prisma.Decimal(100),
            status: LoanPaymentStatus.CONFIRMED,
          },
          {
            id: 'pay-canc',
            principalPaid: new Prisma.Decimal(500),
            interestPaid: new Prisma.Decimal(100),
            status: LoanPaymentStatus.CANCELED,
            cancellationReason: 'Estornado',
          },
        ],
      },
    ]);

    const result = await service.findAll();

    expect(result.data).toHaveLength(1);
    // Principal paid deve computar apenas o confirmado (500)
    expect(result.data[0].principalPaid).toBe('500.00');
    // Juros pagos deve computar apenas o confirmado (100)
    expect(result.data[0].totalInterestPaid).toBe('100.00');
    // Total pago deve ser 600 (500 + 100), ignorando o cancelado
    expect(result.data[0].totalPaid).toBe('600.00');
    expect(result.summary.totalPrincipalPaid).toBe('500.00');
    expect(result.summary.totalInterestPaid).toBe('100.00');
  });

  // L. Loan RENEGOTIATED não deve ser reativado automaticamente sem regra explícita
  it('L. should preserve RENEGOTIATED status when canceling a payment in a renegotiated loan', async () => {
    const mockTx = {
      $queryRaw: jest.fn(),
      loan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'loan-reneg',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(2000),
          status: LoanStatus.RENEGOTIATED,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'loan-reneg',
          principalAmount: new Prisma.Decimal(10000),
          remainingPrincipal: new Prisma.Decimal(2000),
          status: LoanStatus.RENEGOTIATED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'loan-reneg',
            principalAmount: new Prisma.Decimal(10000),
            remainingPrincipal: data.remainingPrincipal,
            status: data.status,
          }),
        ),
      },
      loanPayment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-reneg',
          loanId: 'loan-reneg',
          loanInstallmentId: 'inst-1',
          amountPaid: new Prisma.Decimal(1200),
          principalPaid: new Prisma.Decimal(1000),
          interestPaid: new Prisma.Decimal(200),
          status: LoanPaymentStatus.CONFIRMED,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-reneg',
            status: data.status,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
      },
      loanInstallment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'inst-1',
          expectedAmount: new Prisma.Decimal(1200),
          paidAmount: new Prisma.Decimal(1200),
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'inst-1',
            expectedAmount: new Prisma.Decimal(1200),
            paidAmount: data.paidAmount,
            status: data.status,
          }),
        ),
      },
    };

    prisma.$transaction.mockImplementation((callback) => callback(mockTx));

    const result = await service.cancelPayment('loan-reneg', 'pay-reneg', {
      reason: 'Estorno em renegociado',
    });

    expect(result.loan.status).toBe(LoanStatus.RENEGOTIATED);
  });
});
