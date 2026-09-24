import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClosingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PeriodLockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converte qualquer data (Date ou string ISO) para o referenceMonth padrão 'YYYY-MM' em UTC.
   */
  getReferenceMonth(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      throw new BadRequestException('Data inválida para verificação de período contábil.');
    }
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Adquire advisory lock transacional exclusivo do referenceMonth e valida se o período está aberto.
   * Deve ser executado DENTRO de uma transação Prisma.
   */
  async lockAndAssertPeriodOpen(
    tx: Prisma.TransactionClient,
    date: Date | string | null | undefined,
  ): Promise<string | null> {
    if (!date) return null;
    const months = await this.lockAndAssertAllPeriodsOpen(tx, [date]);
    return months[0] ?? null;
  }

  /**
   * Adquire advisory lock transacional exclusivo para múltiplos períodos ordenados deterministicamente
   * e valida se todos estão abertos (sem MonthlyClosing OFFICIAL e isCurrent = true).
   * Deve ser executado DENTRO de uma transação Prisma.
   */
  async lockAndAssertAllPeriodsOpen(
    tx: Prisma.TransactionClient,
    dates: (Date | string | null | undefined)[],
  ): Promise<string[]> {
    const validMonths = [
      ...new Set(
        dates
          .filter((d): d is Date | string => d !== null && d !== undefined)
          .map((d) => this.getReferenceMonth(d)),
      ),
    ].sort();

    if (validMonths.length === 0) return [];

    // 1. Adquire advisory locks em ordem determinística (alfabética) para prevenir deadlocks
    for (const referenceMonth of validMonths) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly_closing:${referenceMonth}`}))`;
    }

    // 2. Sob a proteção atômica do lock, verifica se algum mês possui fechamento OFFICIAL ativo
    for (const referenceMonth of validMonths) {
      const officialClosing = await tx.monthlyClosing.findFirst({
        where: {
          referenceMonth,
          status: ClosingStatus.OFFICIAL,
          isCurrent: true,
        },
      });

      if (officialClosing) {
        throw new UnprocessableEntityException(
          `Período ${referenceMonth} está fechado. Reabra o mês antes de realizar alterações.`,
        );
      }
    }

    return validMonths;
  }

  /**
   * Valida se o período da data informada está aberto.
   * Se um TransactionClient for fornecido, executa o bloqueio transacional (pg_advisory_xact_lock) preventivo.
   */
  async assertPeriodOpen(
    date: Date | string | null | undefined,
    client?: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    if (!date) return;
    await this.assertAllPeriodsOpen([date], client);
  }

  /**
   * Valida múltiplos períodos em lote com ordenação determinística.
   * Se um TransactionClient for fornecido, executa o bloqueio transacional (pg_advisory_xact_lock) preventivo.
   */
  async assertAllPeriodsOpen(
    dates: (Date | string | null | undefined)[],
    client?: Prisma.TransactionClient | PrismaService,
  ): Promise<void> {
    const validMonths = [
      ...new Set(
        dates
          .filter((d): d is Date | string => d !== null && d !== undefined)
          .map((d) => this.getReferenceMonth(d)),
      ),
    ].sort();

    if (validMonths.length === 0) return;

    const db = client || this.prisma;

    // Se estiver sob transação com $executeRaw, adquire advisory locks em ordem determinística
    if ('$executeRaw' in db && typeof db.$executeRaw === 'function') {
      for (const referenceMonth of validMonths) {
        await (db as Prisma.TransactionClient).$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly_closing:${referenceMonth}`}))`;
      }
    }

    for (const referenceMonth of validMonths) {
      const officialClosing = await db.monthlyClosing.findFirst({
        where: {
          referenceMonth,
          status: ClosingStatus.OFFICIAL,
          isCurrent: true,
        },
      });

      if (officialClosing) {
        throw new UnprocessableEntityException(
          `Período ${referenceMonth} está fechado. Reabra o mês antes de realizar alterações.`,
        );
      }
    }
  }
}
