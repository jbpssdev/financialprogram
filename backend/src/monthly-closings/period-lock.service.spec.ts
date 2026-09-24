import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ClosingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PeriodLockService } from './period-lock.service';

describe('PeriodLockService', () => {
  let service: PeriodLockService;
  let mockPrisma: {
    monthlyClosing: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      monthlyClosing: {
        findFirst: jest.fn(),
      },
    };

    service = new PeriodLockService(mockPrisma as unknown as PrismaService);
  });

  describe('getReferenceMonth', () => {
    it('deve extrair YYYY-MM corretamente em UTC para objeto Date', () => {
      const date = new Date(Date.UTC(2026, 8, 15, 12, 0, 0)); // Mês 8 é Setembro (0-indexed)
      expect(service.getReferenceMonth(date)).toBe('2026-09');
    });

    it('deve extrair YYYY-MM corretamente em UTC para string ISO', () => {
      expect(service.getReferenceMonth('2026-01-01T00:00:00.000Z')).toBe('2026-01');
      expect(service.getReferenceMonth('2026-12-31T23:59:59.999Z')).toBe('2026-12');
    });

    it('deve lançar BadRequestException para data inválida', () => {
      expect(() => service.getReferenceMonth('data-invalida')).toThrow(BadRequestException);
    });
  });

  describe('assertPeriodOpen', () => {
    it('deve passar sem erro quando a data for nula ou indefinida', async () => {
      await expect(service.assertPeriodOpen(null)).resolves.toBeUndefined();
      await expect(service.assertPeriodOpen(undefined)).resolves.toBeUndefined();
      expect(mockPrisma.monthlyClosing.findFirst).not.toHaveBeenCalled();
    });

    it('deve permitir operação se o período não possuir fechamento', async () => {
      mockPrisma.monthlyClosing.findFirst.mockResolvedValue(null);

      await expect(service.assertPeriodOpen(new Date('2026-09-15'))).resolves.toBeUndefined();
      expect(mockPrisma.monthlyClosing.findFirst).toHaveBeenCalledWith({
        where: {
          referenceMonth: '2026-09',
          status: ClosingStatus.OFFICIAL,
          isCurrent: true,
        },
      });
    });

    it('deve permitir operação se o período foi reaberto (status = SUPERSEDED ou isCurrent = false)', async () => {
      mockPrisma.monthlyClosing.findFirst.mockResolvedValue(null);

      await expect(service.assertPeriodOpen(new Date('2026-09-15'))).resolves.toBeUndefined();
    });

    it('deve bloquear operação com HTTP 422 UnprocessableEntityException se o período possuir MonthlyClosing OFFICIAL ativo', async () => {
      mockPrisma.monthlyClosing.findFirst.mockResolvedValue({
        id: 'closing-1',
        referenceMonth: '2026-09',
        status: ClosingStatus.OFFICIAL,
        isCurrent: true,
      });

      await expect(service.assertPeriodOpen(new Date('2026-09-15'))).rejects.toThrow(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );
    });
  });

  describe('assertAllPeriodsOpen', () => {
    it('deve validar todos os períodos distintos informados', async () => {
      mockPrisma.monthlyClosing.findFirst.mockResolvedValue(null);

      const dates = [
        new Date('2026-08-10'),
        new Date('2026-08-20'), // mesmo mês
        new Date('2026-09-05'),
        null,
      ];

      await service.assertAllPeriodsOpen(dates);
      expect(mockPrisma.monthlyClosing.findFirst).toHaveBeenCalledTimes(2);
    });

    it('deve lançar HTTP 422 se qualquer um dos períodos estiver fechado', async () => {
      mockPrisma.monthlyClosing.findFirst.mockImplementation(({ where }) => {
        if (where.referenceMonth === '2026-08') {
          return Promise.resolve({
            id: 'closing-aug',
            referenceMonth: '2026-08',
            status: ClosingStatus.OFFICIAL,
            isCurrent: true,
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.assertAllPeriodsOpen([new Date('2026-09-10'), new Date('2026-08-15')]),
      ).rejects.toThrow(
        new UnprocessableEntityException('Período 2026-08 está fechado. Reabra o mês antes de realizar alterações.'),
      );
    });
  });

  describe('Garantias de Concorrência & Advisory Lock (Requisitos A a E)', () => {
    // A. Operação adquire advisory lock ANTES de consultar OFFICIAL
    it('A. deve adquirir advisory lock no banco ANTES de consultar se existe fechamento OFFICIAL', async () => {
      const callOrder: string[] = [];

      const executeRawMock = jest.fn().mockImplementation(() => {
        callOrder.push('executeRaw_advisory_lock');
        return Promise.resolve(1);
      });
      const findFirstMock = jest.fn().mockImplementation(() => {
        callOrder.push('findFirst_monthlyClosing');
        return Promise.resolve(null);
      });

      const txMock = {
        $executeRaw: executeRawMock,
        monthlyClosing: {
          findFirst: findFirstMock,
        },
      } as unknown as Prisma.TransactionClient;

      await service.lockAndAssertPeriodOpen(txMock, new Date('2026-09-15'));

      expect(callOrder).toEqual(['executeRaw_advisory_lock', 'findFirst_monthlyClosing']);
      expect(executeRawMock).toHaveBeenCalled();
      expect(findFirstMock).toHaveBeenCalledWith({
        where: {
          referenceMonth: '2026-09',
          status: ClosingStatus.OFFICIAL,
          isCurrent: true,
        },
      });
    });

    // B. MonthlyClosing e lançamento do mesmo período compartilham a mesma chave de advisory lock
    it('B. deve compartilhar a mesma chave de advisory lock com MonthlyClosing (monthly_closing:YYYY-MM)', async () => {
      let rawSqlParam: any;

      const txMock = {
        $executeRaw: jest.fn().mockImplementation((strings: TemplateStringsArray, ...values: any[]) => {
          rawSqlParam = values[0];
          return Promise.resolve(1);
        }),
        monthlyClosing: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as unknown as Prisma.TransactionClient;

      await service.lockAndAssertPeriodOpen(txMock, '2026-09-15T12:00:00.000Z');

      expect(rawSqlParam).toBe('monthly_closing:2026-09');
    });

    // C. Alteração envolvendo múltiplos meses adquire locks em ordem determinística
    it('C. deve ordenar deterministicamente (sort alfabético) os meses antes de adquirir advisory locks', async () => {
      const lockedMonths: string[] = [];

      const txMock = {
        $executeRaw: jest.fn().mockImplementation((_strings: any, ...values: any[]) => {
          lockedMonths.push(values[0]);
          return Promise.resolve(1);
        }),
        monthlyClosing: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as unknown as Prisma.TransactionClient;

      // Passa datas em ordem decrescente (setembro depois agosto)
      const dates = [
        new Date('2026-09-20'),
        new Date('2026-08-10'),
        new Date('2026-10-01'),
        new Date('2026-08-15'), // duplicado
      ];

      await service.lockAndAssertAllPeriodsOpen(txMock, dates);

      // Deve ter adquirido locks exatamente na ordem classificada: 2026-08, 2026-09, 2026-10
      expect(lockedMonths).toEqual([
        'monthly_closing:2026-08',
        'monthly_closing:2026-09',
        'monthly_closing:2026-10',
      ]);
    });

    // D. Retorna meses bloqueados e valida atomicamente sob a mesma transação
    it('D. deve abortar com HTTP 422 se o mês for fechado enquanto a transação aguardava o lock', async () => {
      const txMock = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        monthlyClosing: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'closing-official',
            referenceMonth: '2026-09',
            status: ClosingStatus.OFFICIAL,
            isCurrent: true,
          }),
        },
      } as unknown as Prisma.TransactionClient;

      await expect(
        service.lockAndAssertPeriodOpen(txMock, new Date('2026-09-15')),
      ).rejects.toThrow(
        new UnprocessableEntityException('Período 2026-09 está fechado. Reabra o mês antes de realizar alterações.'),
      );
    });

    // E. Simulação conceitual de serialização entre fechamento e mutação concorrentes
    it('E. garante serialização sem corrida: se o fechamento comitar primeiro, mutação é rejeitada com 422', async () => {
      let isClosed = false;

      // Simula o fechamento oficial adquirindo o advisory lock e comitando
      const txClosing = {
        $executeRaw: jest.fn().mockImplementation(async () => {
          isClosed = true;
          return 1;
        }),
      };
      await txClosing.$executeRaw();

      // Simula a mutação chegando e adquirindo o advisory lock após o commit do fechamento
      const txMutation = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        monthlyClosing: {
          findFirst: jest.fn().mockImplementation(async () => {
            if (isClosed) {
              return {
                id: 'closing-concurrent',
                referenceMonth: '2026-09',
                status: ClosingStatus.OFFICIAL,
                isCurrent: true,
              };
            }
            return null;
          }),
        },
      } as unknown as Prisma.TransactionClient;

      // Mutação deve ler status OFFICIAL atualizado pós-lock e ser rejeitada com 422
      await expect(
        service.lockAndAssertPeriodOpen(txMutation, new Date('2026-09-15')),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
