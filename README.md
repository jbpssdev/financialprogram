# FinancialProgram

Aplicação web de gestão financeira e operacional para pequenos estabelecimentos, construída com Angular e NestJS.

---

### Sobre o projeto

O **FinancialProgram** é um sistema projetado para centralizar e simplificar a gestão de pequenos e médios estabelecimentos comerciais e de serviços (como bares, lanchonetes e casas de eventos). 

O sistema pretende centralizar:
* Produtos e serviços;
* Categorias;
* Fornecedores;
* Estoque físico e fichas de controle;
* Histórico de custos e evolução de preços;
* Compras de mercadorias;
* Pagamentos a fornecedores e contas a pagar;
* Vendas detalhadas e consolidadas;
* Despesas operacionais e retiradas pessoais;
* Receitas e rendas extras;
* Controle de empréstimos e cronograma de amortização;
* Análise financeira em tempo real (Lucro Bruto vs Fluxo de Caixa);
* Fechamento mensal com snapshots contábeis imutáveis.

> [!NOTE]
> O projeto encontra-se atualmente em fase ativa de desenvolvimento.

---

### Stack

* **Frontend**:
  * Angular 22
  * Tailwind CSS
* **Backend**:
  * NestJS 12
  * TypeScript
  * Prisma ORM
* **Banco de Dados**:
  * PostgreSQL
  * Neon (ambiente remoto gerenciado para desenvolvimento)
* **Ferramentas**:
  * Git
  * npm

---

### Estrutura

```text
FinancialProgram/
├── frontend/
├── backend/
└── README.md
```

Frontend e backend vivem de forma unificada em um único repositório Git (monorepo simples), permitindo sincronia de versionamento sem overhead de ferramentas complexas.

---

### Funcionalidades já implementadas

Atualmente, o primeiro núcleo funcional de cadastros, compras e estoque está completamente modelado, implementado e testado:

* **Categorias**: Cadastro, consulta e inativação lógica de categorias de produtos e serviços;
* **Fornecedores**: Cadastro e manutenção de fornecedores comerciais;
* **Produtos e Serviços**: Cadastro com controle de tipos (`PRODUCT_STOCK`, `TOKEN_QUANTITY`, `SERVICE`) e unidades de medida fracionadas;
* **Histórico de Preço**: Rastreamento automático de alterações de preços com preservação de margens e custos históricos (`PriceHistory`);
* **Estoque Inicial**: Procedimento atômico para implantação de saldo inicial (`INITIAL_BALANCE`) com validação de unicidade;
* **Compras**: Registro de compras de múltiplos itens com cálculo automático de totais no backend;
* **Custo Médio Ponderado Móvel (CMP)**: Atualização automática e transacional do custo médio e patrimônio em estoque a cada compra;
* **Movimentações de Estoque**: Livro-razão (*ledger*) de entradas e saídas no nível do item com rastreabilidade completa;
* **Pagamentos de Compras**: Registro de pagamentos integrais, parciais ou posteriores amortizando o saldo devedor;
* **Validações de Domínio**: Validação estrita de tipos com `class-validator`, bloqueio de estoque para serviços e proteção contra saldo negativo;
* **Integração Real**: Conexão validada e sincronizada via migrations com o PostgreSQL remoto no Neon.

---

### Desenvolvimento local

#### 1. Instalação das dependências

Na raiz do repositório:
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

#### 2. Configuração de Variáveis de Ambiente

Crie o arquivo `backend/.env` com base no `backend/.env.example`. As variáveis necessárias são:

```env
NODE_ENV=
PORT=
FRONTEND_URL=
DATABASE_URL=
DIRECT_URL=
```

* `DATABASE_URL`: Conexão com pooling (PgBouncer) usada em runtime pelo NestJS / Prisma Client.
* `DIRECT_URL`: Conexão direta sem pooling usada pelo Prisma Migrate para migrações e operações DDL.

#### 3. Execução

Para iniciar o backend e o frontend simultaneamente em modo de desenvolvimento:
```bash
npm run dev
```

Ou individualmente:
```bash
# Iniciar apenas o backend (NestJS na porta configurada)
npm run dev:backend

# Iniciar apenas o frontend (Angular na porta 4200)
npm run dev:frontend
```

#### 4. Compilação e Testes

```bash
# Compilar ambos
npm run build

# Compilar individualmente
npm run build:backend
npm run build:frontend

# Executar testes unitários do backend
npm test --prefix backend

# Executar linter do backend
npm run lint --prefix backend
```

---

### Banco de dados

O projeto utiliza o **Prisma ORM** com **PostgreSQL**.

As migrações são gerenciadas de forma declarativa e versionada:
```bash
# Verificar status das migrações
npm run prisma:status

# Aplicar migrações pendentes em desenvolvimento/produção
npm run prisma:migrate:deploy

# Gerar tipos do Prisma Client
npm run prisma:generate
```

No ambiente de desenvolvimento, utiliza-se uma instância remota gerenciada no **Neon** via conexão segura SSL.

---

### Status

`Em desenvolvimento`

---

### Licença

A licença ainda será definida.
