import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Carrega .env se existir
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        const key = arg.slice(2, equalIndex);
        const value = arg.slice(equalIndex + 1);
        parsed[key] = value;
      } else {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          parsed[key] = nextArg;
          i++;
        } else {
          parsed[key] = 'true';
        }
      }
    }
  }

  return parsed;
}

class PromptReader {
  private rlNonTty: readline.Interface | null = null;
  private nonTtyIterator: AsyncIterableIterator<string> | null = null;

  async askHidden(promptText: string): Promise<string> {
    process.stdout.write(promptText);

    if (process.stdin.isTTY) {
      return new Promise((resolve) => {
        let input = '';
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const onData = (chunk: string) => {
          for (const char of chunk) {
            if (char === '\r' || char === '\n') {
              process.stdin.setRawMode(false);
              process.stdin.pause();
              process.stdin.removeListener('data', onData);
              process.stdout.write('\n');
              resolve(input);
              return;
            } else if (char === '\u0003') {
              process.stdin.setRawMode(false);
              process.stdout.write('\n');
              process.exit(130);
            } else if (char === '\b' || char === '\x7f') {
              if (input.length > 0) {
                input = input.slice(0, -1);
              }
            } else {
              input += char;
            }
          }
        };

        process.stdin.on('data', onData);
      });
    } else {
      if (!this.rlNonTty) {
        this.rlNonTty = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false,
        });
        this.nonTtyIterator = this.rlNonTty[Symbol.asyncIterator]();
      }
      const next = await this.nonTtyIterator!.next();
      const answer = (next.value ?? '').trim();
      process.stdout.write('\n');
      return answer;
    }
  }

  close() {
    if (this.rlNonTty) {
      this.rlNonTty.close();
      this.rlNonTty = null;
    }
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const hasPasswordArg = rawArgs.some((arg) => arg.startsWith('--password'));

  if (hasPasswordArg) {
    console.error(
      'ERRO DE SEGURANÇA: Por motivos de segurança, a senha não deve ser informada via argumento de linha de comando (--password).\n' +
        'Argumentos de linha de comando ficam expostos no histórico do shell, em logs e na lista de processos do sistema.\n' +
        'Execute sem --password para digitar a senha de forma interativa e oculta:\n' +
        '  npm run admin:create -- --email=admin@empresa.com --name="Administrador"',
    );
    process.exit(1);
  }

  const args = parseArgs();
  const name = args.name || process.env.ADMIN_NAME || 'Administrador';
  const email = (args.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();

  if (!email || !email.includes('@')) {
    console.error('ERRO: Email inválido ou não informado. Use --email=admin@empresa.com ou defina ADMIN_EMAIL.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const reader = new PromptReader();

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`AVISO: Usuário com o email "${email}" já existe (ID: ${existing.id}). Nenhuma alteração realizada.`);
      process.exit(0);
    }

    const password = await reader.askHidden('Password: ');

    if (!password || password.length < 8) {
      console.error('ERRO: A senha deve possuir no mínimo 8 caracteres.');
      process.exit(1);
    }

    const confirmPassword = await reader.askHidden('Confirm password: ');

    if (password !== confirmPassword) {
      console.error('ERRO: As senhas não coincidem. Operação cancelada.');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        isActive: true,
      },
    });

    console.log(`SUCESSO: Usuário administrador criado com sucesso!`);
    console.log(`ID: ${user.id}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Ativo: ${user.isActive}`);
  } catch (error) {
    console.error('ERRO ao criar usuário administrador:', error);
    process.exit(1);
  } finally {
    reader.close();
    await prisma.$disconnect();
  }
}

main();
