# Database ORM Patterns for Financial Applications

## Overview

This document outlines comprehensive database ORM patterns specifically designed for financial applications, focusing on portfolios, trades, and financial data modeling using TypeORM and Prisma. These patterns address the unique requirements of financial systems including data integrity, transaction handling, performance optimization, and regulatory compliance.

## 1. Schema Design for Financial Applications

### 1.1 Portfolio and Account Structure

#### TypeORM Entity Definitions

```typescript
// Base Entity with Audit Fields
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'varchar', length: 50, nullable: true })
    createdBy: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    updatedBy: string;
}

// Portfolio Entity
@Entity('portfolios')
export class Portfolio extends BaseEntity {
    @Column({ type: 'varchar', length: 100, unique: true })
    portfolioCode: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE', 'CLOSED'] })
    status: string;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    totalValue: number;

    @Column({ type: 'varchar', length: 3, default: 'USD' })
    baseCurrency: string;

    @Column({ type: 'jsonb', nullable: true })
    riskParameters: any;

    @OneToMany(() => Account, account => account.portfolio)
    accounts: Account[];

    @OneToMany(() => Trade, trade => trade.portfolio)
    trades: Trade[];
}

// Account Entity
@Entity('accounts')
export class Account extends BaseEntity {
    @Column({ type: 'varchar', length: 50, unique: true })
    accountNumber: string;

    @Column({ type: 'enum', enum: ['CASH', 'MARGIN', 'OPTION', 'FUTURES'] })
    accountType: string;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    balance: number;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    availableBalance: number;

    @ManyToOne(() => Portfolio, portfolio => portfolio.accounts)
    @JoinColumn({ name: 'portfolio_id' })
    portfolio: Portfolio;

    @OneToMany(() => Position, position => position.account)
    positions: Position[];
}
```

#### Prisma Schema for Financial Entities

```prisma
// Prisma schema for financial applications
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Portfolio {
  id              String   @id @default(uuid())
  portfolioCode   String   @unique @db.VarChar(100)
  name            String   @db.VarChar(255)
  status          Status   @default(ACTIVE)
  totalValue      Decimal  @default(0) @db.Decimal(18, 8)
  baseCurrency    String   @default("USD") @db.VarChar(3)
  riskParameters  Json?
  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)
  createdBy       String?  @db.VarChar(50)
  updatedBy       String?  @db.VarChar(50)

  accounts Account[]
  trades   Trade[]

  @@map("portfolios")
}

model Account {
  id               String      @id @default(uuid())
  accountNumber    String      @unique @db.VarChar(50)
  accountType      AccountType
  balance          Decimal     @default(0) @db.Decimal(18, 8)
  availableBalance Decimal     @default(0) @db.Decimal(18, 8)
  portfolioId      String
  createdAt        DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime    @updatedAt @db.Timestamptz(6)

  portfolio Portfolio  @relation(fields: [portfolioId], references: [id])
  positions Position[]

  @@map("accounts")
  @@index([portfolioId])
}

enum Status {
  ACTIVE
  INACTIVE
  CLOSED
}

enum AccountType {
  CASH
  MARGIN
  OPTION
  FUTURES
}
```

### 1.2 Trade and Position Modeling

#### TypeORM Trade Entities

```typescript
// Instrument Entity
@Entity('instruments')
export class Instrument extends BaseEntity {
    @Column({ type: 'varchar', length: 20, unique: true })
    symbol: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'enum', enum: ['STOCK', 'BOND', 'OPTION', 'FUTURE', 'FOREX', 'CRYPTO'] })
    assetType: string;

    @Column({ type: 'varchar', length: 10 })
    exchange: string;

    @Column({ type: 'varchar', length: 3 })
    currency: string;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    multiplier: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;
}

// Trade Entity
@Entity('trades')
export class Trade extends BaseEntity {
    @Column({ type: 'varchar', length: 50, unique: true })
    tradeId: string;

    @Column({ type: 'enum', enum: ['BUY', 'SELL'] })
    side: string;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    quantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    price: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    executedQuantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    executedValue: number;

    @Column({ type: 'enum', enum: ['PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'] })
    status: string;

    @Column({ type: 'timestamp with time zone' })
    executionTime: Date;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    commission: number;

    @ManyToOne(() => Portfolio, portfolio => portfolio.trades)
    @JoinColumn({ name: 'portfolio_id' })
    portfolio: Portfolio;

    @ManyToOne(() => Instrument)
    @JoinColumn({ name: 'instrument_id' })
    instrument: Instrument;

    @OneToMany(() => Execution, execution => execution.trade)
    executions: Execution[];
}

// Position Entity
@Entity('positions')
export class Position extends BaseEntity {
    @Column({ type: 'decimal', precision: 18, scale: 8 })
    quantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    averagePrice: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    marketValue: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    unrealizedPnL: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    realizedPnL: number;

    @ManyToOne(() => Account, account => account.positions)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @ManyToOne(() => Instrument)
    @JoinColumn({ name: 'instrument_id' })
    instrument: Instrument;
}
```

#### Prisma Trade Schema

```prisma
model Instrument {
  id         String   @id @default(uuid())
  symbol     String   @unique @db.VarChar(20)
  name       String   @db.VarChar(100)
  assetType  AssetType
  exchange   String   @db.VarChar(10)
  currency   String   @db.VarChar(3)
  multiplier Decimal  @db.Decimal(18, 8)
  metadata   Json?
  createdAt  DateTime @default(now()) @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @db.Timestamptz(6)

  trades    Trade[]
  positions Position[]

  @@map("instruments")
  @@index([symbol])
  @@index([assetType, exchange])
}

model Trade {
  id               String      @id @default(uuid())
  tradeId          String      @unique @db.VarChar(50)
  side             TradeSide
  quantity         Decimal     @db.Decimal(18, 8)
  price            Decimal     @db.Decimal(18, 8)
  executedQuantity Decimal     @db.Decimal(18, 8)
  executedValue    Decimal     @db.Decimal(18, 8)
  status           TradeStatus
  executionTime    DateTime    @db.Timestamptz(6)
  commission       Decimal     @default(0) @db.Decimal(18, 8)
  portfolioId      String
  instrumentId     String
  createdAt        DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime    @updatedAt @db.Timestamptz(6)

  portfolio  Portfolio   @relation(fields: [portfolioId], references: [id])
  instrument Instrument  @relation(fields: [instrumentId], references: [id])
  executions Execution[]

  @@map("trades")
  @@index([portfolioId, executionTime])
  @@index([instrumentId, executionTime])
  @@index([status, executionTime])
}

model Position {
  id            String     @id @default(uuid())
  quantity      Decimal    @db.Decimal(18, 8)
  averagePrice  Decimal    @db.Decimal(18, 8)
  marketValue   Decimal    @db.Decimal(18, 8)
  unrealizedPnL Decimal    @db.Decimal(18, 8)
  realizedPnL   Decimal    @db.Decimal(18, 8)
  accountId     String
  instrumentId  String
  createdAt     DateTime   @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime   @updatedAt @db.Timestamptz(6)

  account    Account    @relation(fields: [accountId], references: [id])
  instrument Instrument @relation(fields: [instrumentId], references: [id])

  @@map("positions")
  @@unique([accountId, instrumentId])
  @@index([accountId])
}

enum AssetType {
  STOCK
  BOND
  OPTION
  FUTURE
  FOREX
  CRYPTO
}

enum TradeSide {
  BUY
  SELL
}

enum TradeStatus {
  PENDING
  FILLED
  PARTIALLY_FILLED
  CANCELLED
  REJECTED
}
```

## 2. Migration Strategies

### 2.1 TypeORM Migration Patterns

#### Financial Data Migration Example

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateFinancialTables1647875400000 implements MigrationInterface {
    name = 'CreateFinancialTables1647875400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create portfolios table
        await queryRunner.createTable(new Table({
            name: "portfolios",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()"
                },
                {
                    name: "portfolio_code",
                    type: "varchar",
                    length: "100",
                    isUnique: true
                },
                {
                    name: "name",
                    type: "varchar",
                    length: "255"
                },
                {
                    name: "status",
                    type: "enum",
                    enum: ["ACTIVE", "INACTIVE", "CLOSED"],
                    default: "'ACTIVE'"
                },
                {
                    name: "total_value",
                    type: "decimal",
                    precision: 18,
                    scale: 8,
                    default: 0
                },
                {
                    name: "base_currency",
                    type: "varchar",
                    length: "3",
                    default: "'USD'"
                },
                {
                    name: "risk_parameters",
                    type: "jsonb",
                    isNullable: true
                },
                {
                    name: "created_at",
                    type: "timestamp with time zone",
                    default: "now()"
                },
                {
                    name: "updated_at",
                    type: "timestamp with time zone",
                    default: "now()"
                }
            ]
        }), true);

        // Create performance indexes
        await queryRunner.createIndex("portfolios", new TableIndex({
            name: "IDX_PORTFOLIO_STATUS_CREATED",
            columnNames: ["status", "created_at"]
        }));

        // Create trades table with partitioning support
        await queryRunner.query(`
            CREATE TABLE trades (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                trade_id varchar(50) UNIQUE NOT NULL,
                side varchar(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
                quantity decimal(18,8) NOT NULL,
                price decimal(18,8) NOT NULL,
                executed_quantity decimal(18,8) NOT NULL DEFAULT 0,
                executed_value decimal(18,8) NOT NULL DEFAULT 0,
                status varchar(20) NOT NULL DEFAULT 'PENDING',
                execution_time timestamp with time zone NOT NULL,
                commission decimal(18,8) NOT NULL DEFAULT 0,
                portfolio_id uuid NOT NULL REFERENCES portfolios(id),
                instrument_id uuid NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now()
            ) PARTITION BY RANGE (execution_time);
        `);

        // Create monthly partitions for trades
        const currentYear = new Date().getFullYear();
        for (let month = 1; month <= 12; month++) {
            const startDate = `${currentYear}-${month.toString().padStart(2, '0')}-01`;
            const endDate = month === 12 ? `${currentYear + 1}-01-01` : `${currentYear}-${(month + 1).toString().padStart(2, '0')}-01`;
            
            await queryRunner.query(`
                CREATE TABLE trades_${currentYear}_${month.toString().padStart(2, '0')} 
                PARTITION OF trades 
                FOR VALUES FROM ('${startDate}') TO ('${endDate}');
            `);
        }

        // Create optimized indexes for financial queries
        await queryRunner.query(`
            CREATE INDEX CONCURRENTLY idx_trades_portfolio_execution_time 
            ON trades (portfolio_id, execution_time DESC);
            
            CREATE INDEX CONCURRENTLY idx_trades_instrument_execution_time 
            ON trades (instrument_id, execution_time DESC);
            
            CREATE INDEX CONCURRENTLY idx_trades_status_execution_time 
            ON trades (status, execution_time DESC) 
            WHERE status IN ('PENDING', 'PARTIALLY_FILLED');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("trades", true);
        await queryRunner.dropTable("portfolios", true);
    }
}
```

### 2.2 Prisma Migration Strategies

#### Prisma Migration for Financial Schema

```sql
-- Migration: 20240101000000_init_financial_schema
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');
CREATE TYPE "AccountType" AS ENUM ('CASH', 'MARGIN', 'OPTION', 'FUTURES');
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'BOND', 'OPTION', 'FUTURE', 'FOREX', 'CRYPTO');
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "portfolio_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "total_value" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "base_currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "risk_parameters" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" VARCHAR(50),
    "updated_by" VARCHAR(50),

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable with partitioning
CREATE TABLE "trades" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "trade_id" VARCHAR(50) NOT NULL,
    "side" "TradeSide" NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "executed_quantity" DECIMAL(18,8) NOT NULL,
    "executed_value" DECIMAL(18,8) NOT NULL,
    "status" "TradeStatus" NOT NULL,
    "execution_time" TIMESTAMPTZ(6) NOT NULL,
    "commission" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "portfolio_id" UUID NOT NULL,
    "instrument_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id", "execution_time")
) PARTITION BY RANGE ("execution_time");

-- Create partitions for current and next year
CREATE TABLE "trades_2024" PARTITION OF "trades" 
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE "trades_2025" PARTITION OF "trades" 
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_portfolio_code_key" ON "portfolios"("portfolio_code");
CREATE INDEX "portfolios_status_created_at_idx" ON "portfolios"("status", "created_at");

CREATE UNIQUE INDEX "trades_trade_id_key" ON "trades"("trade_id");
CREATE INDEX "trades_portfolio_id_execution_time_idx" ON "trades"("portfolio_id", "execution_time" DESC);
CREATE INDEX "trades_instrument_id_execution_time_idx" ON "trades"("instrument_id", "execution_time" DESC);
CREATE INDEX "trades_status_execution_time_idx" ON "trades"("status", "execution_time" DESC) 
WHERE "status" IN ('PENDING', 'PARTIALLY_FILLED');

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

## 3. Transaction Handling Patterns

### 3.1 TypeORM Transaction Management

#### Financial Transaction Service

```typescript
import { DataSource, QueryRunner } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FinancialTransactionService {
    constructor(private dataSource: DataSource) {}

    async executeTradeWithPositions(tradeData: CreateTradeDto): Promise<Trade> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction('SERIALIZABLE');

        try {
            // 1. Create the trade
            const trade = queryRunner.manager.create(Trade, {
                ...tradeData,
                status: 'PENDING'
            });
            await queryRunner.manager.save(trade);

            // 2. Lock account for balance check
            const account = await queryRunner.manager.findOne(Account, {
                where: { id: tradeData.accountId },
                lock: { mode: 'pessimistic_write' }
            });

            if (!account) {
                throw new Error('Account not found');
            }

            // 3. Validate sufficient balance for buy orders
            if (tradeData.side === 'BUY') {
                const requiredAmount = tradeData.quantity * tradeData.price + tradeData.commission;
                if (account.availableBalance < requiredAmount) {
                    throw new Error('Insufficient balance');
                }
                
                // Reserve funds
                account.availableBalance -= requiredAmount;
                await queryRunner.manager.save(account);
            }

            // 4. Update or create position
            let position = await queryRunner.manager.findOne(Position, {
                where: { 
                    accountId: tradeData.accountId, 
                    instrumentId: tradeData.instrumentId 
                },
                lock: { mode: 'pessimistic_write' }
            });

            if (!position) {
                position = queryRunner.manager.create(Position, {
                    accountId: tradeData.accountId,
                    instrumentId: tradeData.instrumentId,
                    quantity: 0,
                    averagePrice: 0,
                    marketValue: 0,
                    unrealizedPnL: 0,
                    realizedPnL: 0
                });
            }

            // Update position based on trade side
            if (tradeData.side === 'BUY') {
                const newQuantity = position.quantity + tradeData.quantity;
                position.averagePrice = ((position.quantity * position.averagePrice) + 
                                       (tradeData.quantity * tradeData.price)) / newQuantity;
                position.quantity = newQuantity;
            } else {
                position.quantity -= tradeData.quantity;
                // Calculate realized P&L
                position.realizedPnL += (tradeData.price - position.averagePrice) * tradeData.quantity;
            }

            await queryRunner.manager.save(position);

            // 5. Update trade status
            trade.status = 'FILLED';
            trade.executedQuantity = tradeData.quantity;
            trade.executedValue = tradeData.quantity * tradeData.price;
            trade.executionTime = new Date();
            await queryRunner.manager.save(trade);

            // 6. Create execution record
            const execution = queryRunner.manager.create(Execution, {
                tradeId: trade.id,
                quantity: tradeData.quantity,
                price: tradeData.price,
                executionTime: new Date(),
                executionId: `EXE_${Date.now()}`
            });
            await queryRunner.manager.save(execution);

            await queryRunner.commitTransaction();
            return trade;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async batchUpdatePortfolioValues(portfolioUpdates: PortfolioValueUpdate[]): Promise<void> {
        await this.dataSource.transaction('SERIALIZABLE', async manager => {
            for (const update of portfolioUpdates) {
                const portfolio = await manager.findOne(Portfolio, {
                    where: { id: update.portfolioId },
                    lock: { mode: 'pessimistic_write' }
                });

                if (portfolio) {
                    portfolio.totalValue = update.newValue;
                    portfolio.updatedAt = new Date();
                    await manager.save(portfolio);
                }
            }
        });
    }
}
```

### 3.2 Prisma Transaction Patterns

#### Prisma Financial Transaction Service

```typescript
import { PrismaClient, Trade, Position } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaFinancialService {
    constructor(private prisma: PrismaClient) {}

    async executeTradeTransaction(tradeData: CreateTradeDto): Promise<Trade> {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Create pending trade
            const trade = await tx.trade.create({
                data: {
                    ...tradeData,
                    status: 'PENDING',
                    executedQuantity: 0,
                    executedValue: 0
                }
            });

            // 2. Get account with lock (using raw query for PostgreSQL row locking)
            const [account] = await tx.$queryRaw`
                SELECT * FROM accounts 
                WHERE id = ${tradeData.accountId} 
                FOR UPDATE
            `;

            if (!account) {
                throw new Error('Account not found');
            }

            // 3. Validate balance for buy orders
            if (tradeData.side === 'BUY') {
                const requiredAmount = tradeData.quantity * tradeData.price + tradeData.commission;
                if (account.availableBalance < requiredAmount) {
                    throw new Error('Insufficient balance');
                }

                // Update available balance
                await tx.account.update({
                    where: { id: tradeData.accountId },
                    data: {
                        availableBalance: {
                            decrement: requiredAmount
                        }
                    }
                });
            }

            // 4. Upsert position
            const position = await tx.position.upsert({
                where: {
                    accountId_instrumentId: {
                        accountId: tradeData.accountId,
                        instrumentId: tradeData.instrumentId
                    }
                },
                update: {},
                create: {
                    accountId: tradeData.accountId,
                    instrumentId: tradeData.instrumentId,
                    quantity: 0,
                    averagePrice: 0,
                    marketValue: 0,
                    unrealizedPnL: 0,
                    realizedPnL: 0
                }
            });

            // 5. Calculate new position values
            let newQuantity: number;
            let newAveragePrice: number;
            let realizedPnL = position.realizedPnL;

            if (tradeData.side === 'BUY') {
                newQuantity = position.quantity + tradeData.quantity;
                newAveragePrice = ((position.quantity * position.averagePrice) + 
                                 (tradeData.quantity * tradeData.price)) / newQuantity;
            } else {
                newQuantity = position.quantity - tradeData.quantity;
                newAveragePrice = position.averagePrice;
                realizedPnL += (tradeData.price - position.averagePrice) * tradeData.quantity;
            }

            // 6. Update position
            await tx.position.update({
                where: {
                    accountId_instrumentId: {
                        accountId: tradeData.accountId,
                        instrumentId: tradeData.instrumentId
                    }
                },
                data: {
                    quantity: newQuantity,
                    averagePrice: newAveragePrice,
                    realizedPnL: realizedPnL
                }
            });

            // 7. Update trade to filled
            const updatedTrade = await tx.trade.update({
                where: { id: trade.id },
                data: {
                    status: 'FILLED',
                    executedQuantity: tradeData.quantity,
                    executedValue: tradeData.quantity * tradeData.price,
                    executionTime: new Date()
                }
            });

            // 8. Create execution record
            await tx.execution.create({
                data: {
                    tradeId: trade.id,
                    quantity: tradeData.quantity,
                    price: tradeData.price,
                    executionTime: new Date(),
                    executionId: `EXE_${Date.now()}`
                }
            });

            return updatedTrade;
        }, {
            isolationLevel: 'Serializable',
            timeout: 10000
        });
    }

    async batchUpdatePortfolios(updates: PortfolioValueUpdate[]): Promise<void> {
        // Use array transaction for independent operations
        const operations = updates.map(update => 
            this.prisma.portfolio.update({
                where: { id: update.portfolioId },
                data: { 
                    totalValue: update.newValue,
                    updatedAt: new Date()
                }
            })
        );

        await this.prisma.$transaction(operations);
    }

    async interactiveTransactionExample(): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            // Get all pending trades
            const pendingTrades = await tx.trade.findMany({
                where: { status: 'PENDING' },
                include: { instrument: true }
            });

            for (const trade of pendingTrades) {
                // Check market conditions (this depends on previous query results)
                const marketPrice = await this.getMarketPrice(trade.instrument.symbol);
                
                if (this.shouldExecuteTrade(trade, marketPrice)) {
                    await tx.trade.update({
                        where: { id: trade.id },
                        data: { 
                            status: 'FILLED',
                            executionTime: new Date(),
                            price: marketPrice
                        }
                    });
                }
            }
        });
    }
}
```

## 4. Query Optimization for Large Datasets

### 4.1 TypeORM Performance Patterns

#### Optimized Repository Patterns

```typescript
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OptimizedTradeRepository {
    constructor(
        private tradeRepository: Repository<Trade>
    ) {}

    // Optimized query with proper indexing
    async getPortfolioTradeHistory(
        portfolioId: string, 
        startDate: Date, 
        endDate: Date,
        limit: number = 1000,
        offset: number = 0
    ): Promise<{ trades: Trade[], total: number }> {
        const queryBuilder = this.tradeRepository
            .createQueryBuilder('trade')
            .leftJoinAndSelect('trade.instrument', 'instrument')
            .where('trade.portfolioId = :portfolioId', { portfolioId })
            .andWhere('trade.executionTime BETWEEN :startDate AND :endDate', { 
                startDate, 
                endDate 
            })
            .orderBy('trade.executionTime', 'DESC')
            .skip(offset)
            .take(limit);

        // Use parallel queries for count and data
        const [trades, total] = await Promise.all([
            queryBuilder.getMany(),
            queryBuilder.getCount()
        ]);

        return { trades, total };
    }

    // Aggregate query with GROUP BY optimization
    async getPortfolioSummary(portfolioId: string): Promise<PortfolioSummary> {
        const result = await this.tradeRepository
            .createQueryBuilder('trade')
            .select([
                'instrument.assetType as assetType',
                'SUM(CASE WHEN trade.side = \'BUY\' THEN trade.executedValue ELSE -trade.executedValue END) as netValue',
                'SUM(trade.executedQuantity) as totalQuantity',
                'COUNT(*) as tradeCount'
            ])
            .leftJoin('trade.instrument', 'instrument')
            .where('trade.portfolioId = :portfolioId', { portfolioId })
            .andWhere('trade.status = :status', { status: 'FILLED' })
            .groupBy('instrument.assetType')
            .getRawMany();

        return this.mapToPortfolioSummary(result);
    }

    // Streaming large datasets
    async streamTradeData(
        criteria: TradeSearchCriteria,
        callback: (trade: Trade) => Promise<void>
    ): Promise<void> {
        const queryBuilder = this.buildTradeQuery(criteria);
        
        const stream = await queryBuilder.stream();
        
        for await (const trade of stream) {
            await callback(trade);
        }
    }

    // Batch operations for performance
    async batchUpdateTradeStatus(
        tradeIds: string[], 
        status: TradeStatus
    ): Promise<void> {
        await this.tradeRepository
            .createQueryBuilder()
            .update(Trade)
            .set({ 
                status, 
                updatedAt: () => 'CURRENT_TIMESTAMP' 
            })
            .where('id IN (:...tradeIds)', { tradeIds })
            .execute();
    }

    // Raw SQL for complex analytics
    async getPerformanceMetrics(
        portfolioId: string, 
        period: 'daily' | 'weekly' | 'monthly'
    ): Promise<PerformanceMetric[]> {
        const intervalClause = {
            daily: "date_trunc('day', execution_time)",
            weekly: "date_trunc('week', execution_time)",
            monthly: "date_trunc('month', execution_time)"
        }[period];

        return await this.tradeRepository.query(`
            WITH trade_pnl AS (
                SELECT 
                    ${intervalClause} as period,
                    instrument_id,
                    SUM(CASE 
                        WHEN side = 'BUY' THEN -executed_value - commission
                        ELSE executed_value - commission
                    END) as realized_pnl,
                    AVG(price) as avg_price,
                    SUM(executed_quantity) as total_quantity
                FROM trades 
                WHERE portfolio_id = $1 
                  AND status = 'FILLED'
                  AND execution_time >= CURRENT_DATE - INTERVAL '1 year'
                GROUP BY period, instrument_id
            )
            SELECT 
                period,
                SUM(realized_pnl) as total_pnl,
                COUNT(DISTINCT instrument_id) as instruments_traded,
                SUM(total_quantity) as total_volume
            FROM trade_pnl
            GROUP BY period
            ORDER BY period DESC
        `, [portfolioId]);
    }
}
```

### 4.2 Prisma Performance Optimization

#### Optimized Prisma Queries

```typescript
import { PrismaClient, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OptimizedPrismaService {
    constructor(private prisma: PrismaClient) {}

    // Cursor-based pagination for large datasets
    async getPaginatedTrades(
        portfolioId: string,
        cursor?: string,
        take: number = 100
    ): Promise<{ trades: Trade[], nextCursor?: string }> {
        const trades = await this.prisma.trade.findMany({
            where: { portfolioId },
            include: { 
                instrument: {
                    select: { symbol: true, name: true, assetType: true }
                }
            },
            orderBy: { executionTime: 'desc' },
            take: take + 1, // Take one extra to determine if there are more results
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1 // Skip the cursor
            })
        });

        let nextCursor: string | undefined;
        if (trades.length > take) {
            const nextItem = trades.pop();
            nextCursor = nextItem!.id;
        }

        return { trades, nextCursor };
    }

    // Optimized aggregation queries
    async getPortfolioMetrics(portfolioId: string): Promise<PortfolioMetrics> {
        const [
            tradeStats,
            positionStats,
            performanceData
        ] = await Promise.all([
            // Trade statistics
            this.prisma.trade.aggregate({
                where: { 
                    portfolioId,
                    status: 'FILLED'
                },
                _sum: { 
                    executedValue: true,
                    commission: true
                },
                _count: { id: true },
                _avg: { price: true }
            }),

            // Position statistics
            this.prisma.position.aggregate({
                where: {
                    account: { portfolioId }
                },
                _sum: { 
                    marketValue: true,
                    unrealizedPnL: true,
                    realizedPnL: true
                }
            }),

            // Performance data using raw SQL for complex calculations
            this.prisma.$queryRaw<PerformanceRow[]>`
                WITH daily_returns AS (
                    SELECT 
                        DATE(execution_time) as trade_date,
                        SUM(CASE 
                            WHEN side = 'BUY' THEN -executed_value - commission
                            ELSE executed_value - commission
                        END) as daily_pnl
                    FROM trades t
                    WHERE t.portfolio_id = ${portfolioId}
                      AND t.status = 'FILLED'
                      AND t.execution_time >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY DATE(execution_time)
                )
                SELECT 
                    AVG(daily_pnl) as avg_daily_return,
                    STDDEV(daily_pnl) as volatility,
                    MAX(daily_pnl) as best_day,
                    MIN(daily_pnl) as worst_day
                FROM daily_returns
            `
        ]);

        return {
            totalTrades: tradeStats._count.id,
            totalValue: tradeStats._sum.executedValue?.toNumber() || 0,
            totalCommissions: tradeStats._sum.commission?.toNumber() || 0,
            averagePrice: tradeStats._avg.price?.toNumber() || 0,
            totalMarketValue: positionStats._sum.marketValue?.toNumber() || 0,
            totalUnrealizedPnL: positionStats._sum.unrealizedPnL?.toNumber() || 0,
            totalRealizedPnL: positionStats._sum.realizedPnL?.toNumber() || 0,
            ...performanceData[0]
        };
    }

    // Batch operations with transactions
    async processBatchTrades(trades: CreateTradeDto[]): Promise<Trade[]> {
        // Split into smaller batches to avoid timeout
        const batchSize = 100;
        const results: Trade[] = [];

        for (let i = 0; i < trades.length; i += batchSize) {
            const batch = trades.slice(i, i + batchSize);
            
            const batchResults = await this.prisma.$transaction(
                batch.map(trade => 
                    this.prisma.trade.create({
                        data: trade,
                        include: { instrument: true }
                    })
                )
            );
            
            results.push(...batchResults);
        }

        return results;
    }

    // Optimized search with full-text search
    async searchInstruments(query: string, limit: number = 20): Promise<Instrument[]> {
        return await this.prisma.instrument.findMany({
            where: {
                OR: [
                    { symbol: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: limit,
            orderBy: [
                { symbol: 'asc' },
                { name: 'asc' }
            ]
        });
    }

    // Memory-efficient data export
    async exportTradeData(
        portfolioId: string,
        callback: (batch: Trade[]) => Promise<void>
    ): Promise<void> {
        const batchSize = 1000;
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const batch = await this.prisma.trade.findMany({
                where: { portfolioId },
                include: { instrument: true },
                orderBy: { executionTime: 'asc' },
                take: batchSize,
                ...(cursor && {
                    cursor: { id: cursor },
                    skip: 1
                })
            });

            if (batch.length === 0) {
                hasMore = false;
            } else {
                await callback(batch);
                
                if (batch.length < batchSize) {
                    hasMore = false;
                } else {
                    cursor = batch[batch.length - 1].id;
                }
            }
        }
    }
}
```

## 5. Data Validation and Business Rules

### 5.1 Financial Data Validation

#### TypeORM Validation Decorators

```typescript
import { Entity, Column, BeforeInsert, BeforeUpdate, Check } from 'typeorm';
import { IsPositive, IsEnum, ValidateIf, Min, Max } from 'class-validator';

@Entity('trades')
@Check(`"quantity" > 0`)
@Check(`"price" > 0`)
@Check(`"executed_quantity" >= 0`)
@Check(`"executed_quantity" <= "quantity"`)
export class Trade extends BaseEntity {
    @Column({ type: 'varchar', length: 50, unique: true })
    tradeId: string;

    @Column({ type: 'enum', enum: ['BUY', 'SELL'] })
    @IsEnum(['BUY', 'SELL'])
    side: string;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    @IsPositive()
    @Min(0.00000001) // Minimum trade quantity
    quantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    @IsPositive()
    @Min(0.01) // Minimum price
    price: number;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    @Min(0)
    @ValidateIf(o => o.executedQuantity <= o.quantity)
    executedQuantity: number;

    @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
    @Min(0)
    commission: number;

    @BeforeInsert()
    @BeforeUpdate()
    validateTrade() {
        // Business rule validations
        if (this.executedQuantity > this.quantity) {
            throw new Error('Executed quantity cannot exceed order quantity');
        }

        if (this.side === 'BUY' && this.price <= 0) {
            throw new Error('Buy orders must have positive price');
        }

        // Risk management rules
        if (this.quantity * this.price > 1000000) { // $1M limit
            throw new Error('Trade value exceeds maximum limit');
        }
    }

    @BeforeUpdate()
    validateStatusTransition() {
        // Ensure valid status transitions
        const validTransitions = {
            'PENDING': ['FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'],
            'PARTIALLY_FILLED': ['FILLED', 'CANCELLED'],
            'FILLED': [], // No transitions allowed from FILLED
            'CANCELLED': [],
            'REJECTED': []
        };

        // This would require access to previous state
        // Implementation depends on your specific needs
    }
}
```

### 5.2 Prisma Validation Middleware

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient().$extends({
    query: {
        trade: {
            async create({ model, operation, args, query }) {
                // Pre-validation
                const data = args.data;
                
                // Business rule validations
                if (data.quantity <= 0) {
                    throw new Error('Quantity must be positive');
                }
                
                if (data.price <= 0) {
                    throw new Error('Price must be positive');
                }
                
                if (data.quantity * data.price > 1000000) {
                    throw new Error('Trade value exceeds maximum limit');
                }
                
                // Risk management check
                const portfolio = await prisma.portfolio.findUnique({
                    where: { id: data.portfolioId },
                    select: { totalValue: true, riskParameters: true }
                });
                
                if (portfolio) {
                    const tradeValue = data.quantity * data.price;
                    const riskLimit = portfolio.riskParameters?.maxTradeValue || 50000;
                    
                    if (tradeValue > riskLimit) {
                        throw new Error(`Trade value exceeds risk limit of ${riskLimit}`);
                    }
                }
                
                return query(args);
            },
            
            async update({ model, operation, args, query }) {
                // Validate status transitions
                if (args.data.status) {
                    const currentTrade = await prisma.trade.findUnique({
                        where: args.where,
                        select: { status: true }
                    });
                    
                    if (currentTrade) {
                        const validTransitions = {
                            'PENDING': ['FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'],
                            'PARTIALLY_FILLED': ['FILLED', 'CANCELLED'],
                            'FILLED': [],
                            'CANCELLED': [],
                            'REJECTED': []
                        };
                        
                        const allowedStatuses = validTransitions[currentTrade.status] || [];
                        if (!allowedStatuses.includes(args.data.status)) {
                            throw new Error(`Invalid status transition from ${currentTrade.status} to ${args.data.status}`);
                        }
                    }
                }
                
                return query(args);
            }
        },
        
        position: {
            async update({ model, operation, args, query }) {
                // Validate position updates
                const data = args.data;
                
                if (data.quantity !== undefined && data.quantity < 0) {
                    // Allow negative positions for short selling, but validate limits
                    const account = await prisma.account.findFirst({
                        where: { positions: { some: args.where } },
                        select: { accountType: true }
                    });
                    
                    if (account?.accountType !== 'MARGIN') {
                        throw new Error('Short positions only allowed in margin accounts');
                    }
                }
                
                return query(args);
            }
        }
    }
});
```

## 6. Performance Monitoring and Alerting

### 6.1 Query Performance Monitoring

```typescript
// TypeORM Query Performance Monitor
import { Logger } from 'typeorm';

export class QueryPerformanceLogger implements Logger {
    private slowQueryThreshold = 1000; // 1 second

    logQuery(query: string, parameters?: any[]) {
        const startTime = Date.now();
        
        return {
            end: () => {
                const duration = Date.now() - startTime;
                if (duration > this.slowQueryThreshold) {
                    console.warn(`Slow query detected (${duration}ms):`, {
                        query: query.substring(0, 500),
                        parameters,
                        duration
                    });
                    
                    // Send to monitoring system
                    this.sendMetric('slow_query', {
                        duration,
                        query_type: this.extractQueryType(query)
                    });
                }
            }
        };
    }

    private extractQueryType(query: string): string {
        const lowerQuery = query.toLowerCase().trim();
        if (lowerQuery.startsWith('select')) return 'SELECT';
        if (lowerQuery.startsWith('insert')) return 'INSERT';
        if (lowerQuery.startsWith('update')) return 'UPDATE';
        if (lowerQuery.startsWith('delete')) return 'DELETE';
        return 'OTHER';
    }

    private sendMetric(name: string, data: any) {
        // Implementation depends on your monitoring system
        // e.g., StatsD, CloudWatch, Prometheus
    }
}

// Prisma Performance Monitoring
const prismaWithMetrics = new PrismaClient().$extends({
    query: {
        $allOperations({ operation, model, args, query }) {
            const start = Date.now();
            
            return query(args).finally(() => {
                const duration = Date.now() - start;
                
                if (duration > 1000) {
                    console.warn(`Slow Prisma query detected:`, {
                        model,
                        operation,
                        duration
                    });
                }
                
                // Send metrics
                sendMetric('prisma_query_duration', duration, {
                    model,
                    operation
                });
            });
        }
    }
});
```

## Conclusion

This comprehensive guide provides enterprise-ready ORM patterns for financial applications using both TypeORM and Prisma. Key takeaways include:

1. **Schema Design**: Use proper data types (DECIMAL for financial values), implement audit trails, and design for scalability with partitioning.

2. **Migrations**: Implement safe migration strategies with proper rollback plans and data validation.

3. **Transactions**: Use appropriate isolation levels (SERIALIZABLE for financial data) and implement proper error handling.

4. **Performance**: Optimize queries with proper indexing, use pagination for large datasets, and implement connection pooling.

5. **Validation**: Implement business rules at the database and application level to ensure data integrity.

6. **Monitoring**: Track query performance and implement alerting for critical financial operations.

These patterns ensure your financial application maintains data consistency, performance, and regulatory compliance while scaling to handle large transaction volumes.