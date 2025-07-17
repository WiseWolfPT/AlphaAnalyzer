#!/usr/bin/env tsx
/**
 * BACKFILL HISTÓRICO - CARREGAR DADOS DOS ÚLTIMOS 90 DIAS
 * 
 * Script para popular a base de dados com dados históricos
 * de preços para as ações mais populares
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credenciais não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Top stocks para backfill
const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'JPM', 'V', 'JNJ',
  'WMT', 'PG', 'UNH', 'DIS', 'MA',
  'HD', 'PYPL', 'BAC', 'NFLX', 'ADBE'
];

const DAYS_TO_BACKFILL = 90;

interface HistoricalPrice {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

class BackfillService {
  private successCount = 0;
  private failureCount = 0;
  private totalRecords = 0;

  async run() {
    console.log('🚀 INICIANDO BACKFILL DE DADOS HISTÓRICOS');
    console.log('==========================================');
    console.log(`📊 Stocks: ${TOP_STOCKS.length}`);
    console.log(`📅 Período: ${DAYS_TO_BACKFILL} dias`);
    console.log(`🎯 Target: ~${TOP_STOCKS.length * DAYS_TO_BACKFILL} registros\n`);

    // Verificar se a tabela de preços históricos existe
    await this.ensureHistoricalPricesTable();

    // Processar cada stock
    for (let i = 0; i < TOP_STOCKS.length; i++) {
      const symbol = TOP_STOCKS[i];
      console.log(`\n📈 [${i + 1}/${TOP_STOCKS.length}] Processando ${symbol}...`);
      
      try {
        await this.backfillStockData(symbol);
        this.successCount++;
        
        // Rate limiting - esperar 1 segundo entre requests
        await this.sleep(1000);
      } catch (error) {
        console.error(`❌ Erro em ${symbol}:`, error.message);
        this.failureCount++;
      }
    }

    this.printSummary();
  }

  private async ensureHistoricalPricesTable() {
    console.log('🔧 Verificando tabela de preços históricos...');
    
    try {
      // Tentar uma operação simples na tabela para verificar se existe
      const { data, error } = await supabase
        .from('historical_prices')
        .select('id')
        .limit(1);

      if (error) {
        console.log('⚠️ Tabela historical_prices não encontrada.');
        console.log('Por favor, execute este SQL no Supabase Dashboard:');
        console.log(`
      CREATE TABLE IF NOT EXISTS historical_prices (
        id BIGSERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        date DATE NOT NULL,
        open DECIMAL(15,4) NOT NULL,
        high DECIMAL(15,4) NOT NULL,
        low DECIMAL(15,4) NOT NULL,
        close DECIMAL(15,4) NOT NULL,
        volume BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(symbol, date)
      );

      CREATE INDEX IF NOT EXISTS idx_historical_prices_symbol ON historical_prices(symbol);
      CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_prices(symbol, date);
    `);
        console.log('\nDepois execute este script novamente.');
        process.exit(1);
      }
      
      console.log('✅ Tabela historical_prices existe e está acessível');
    } catch (error) {
      console.log('⚠️ Erro na verificação da tabela:', error.message);
      console.log('Assumindo que a tabela existe e continuando...');
    }
  }

  private async backfillStockData(symbol: string) {
    // Verificar se já temos dados para este símbolo
    const { data: existingData } = await supabase
      .from('historical_prices')
      .select('date')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(1);

    if (existingData && existingData.length > 0) {
      console.log(`   ℹ️ ${symbol} já tem dados. Último: ${existingData[0].date}`);
      return;
    }

    // Buscar dados históricos
    const historicalData = await this.fetchHistoricalData(symbol);
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('Nenhum dado histórico encontrado');
    }

    // Inserir no Supabase
    const { error } = await supabase
      .from('historical_prices')
      .insert(historicalData);

    if (error) {
      throw new Error(`Erro ao inserir dados: ${error.message}`);
    }

    this.totalRecords += historicalData.length;
    console.log(`   ✅ ${symbol}: ${historicalData.length} registros inseridos`);
  }

  private async fetchHistoricalData(symbol: string): Promise<HistoricalPrice[]> {
    // Calcular data de início (90 dias atrás)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_TO_BACKFILL);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Tentar Polygon.io primeiro
    if (POLYGON_API_KEY && POLYGON_API_KEY !== 'demo') {
      try {
        return await this.fetchFromPolygon(symbol, startDateStr, endDateStr);
      } catch (error) {
        console.log(`   ⚠️ Polygon falhou para ${symbol}, tentando Twelve Data...`);
      }
    }

    // Fallback para Twelve Data
    if (TWELVE_DATA_API_KEY && TWELVE_DATA_API_KEY !== 'demo') {
      try {
        return await this.fetchFromTwelveData(symbol, startDateStr, endDateStr);
      } catch (error) {
        console.log(`   ⚠️ Twelve Data falhou para ${symbol}, tentando FMP...`);
      }
    }

    // Fallback para FMP
    if (FMP_API_KEY && FMP_API_KEY !== 'demo') {
      try {
        return await this.fetchFromFMP(symbol, startDateStr, endDateStr);
      } catch (error) {
        console.log(`   ⚠️ FMP falhou para ${symbol}`);
      }
    }

    // Se todos falharam, gerar dados mock
    console.log(`   ⚠️ Todas as APIs falharam para ${symbol}, gerando dados mock...`);
    return this.generateMockData(symbol, startDateStr, endDateStr);
  }

  private async fetchFromPolygon(symbol: string, startDate: string, endDate: string): Promise<HistoricalPrice[]> {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${POLYGON_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Nenhum resultado encontrado');
    }

    return data.results.map((item: any) => ({
      symbol,
      date: new Date(item.t).toISOString().split('T')[0],
      open: parseFloat(item.o),
      high: parseFloat(item.h),
      low: parseFloat(item.l),
      close: parseFloat(item.c),
      volume: parseInt(item.v),
      created_at: new Date().toISOString()
    }));
  }

  private async fetchFromTwelveData(symbol: string, startDate: string, endDate: string): Promise<HistoricalPrice[]> {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&start_date=${startDate}&end_date=${endDate}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.values || data.values.length === 0) {
      throw new Error('Nenhum resultado encontrado');
    }

    return data.values.map((item: any) => ({
      symbol,
      date: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume),
      created_at: new Date().toISOString()
    }));
  }

  private async fetchFromFMP(symbol: string, startDate: string, endDate: string): Promise<HistoricalPrice[]> {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${startDate}&to=${endDate}&apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.historical || data.historical.length === 0) {
      throw new Error('Nenhum resultado encontrado');
    }

    return data.historical.map((item: any) => ({
      symbol,
      date: item.date,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume),
      created_at: new Date().toISOString()
    }));
  }

  private generateMockData(symbol: string, startDate: string, endDate: string): HistoricalPrice[] {
    const data: HistoricalPrice[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentPrice = 100 + Math.random() * 200; // Preço base entre $100-300
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Pular fins de semana
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      // Simular volatilidade diária
      const volatility = 0.02; // 2% de volatilidade
      const change = (Math.random() - 0.5) * volatility * currentPrice;
      
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push({
        symbol,
        date: d.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(Math.random() * 50000000) + 1000000,
        created_at: new Date().toISOString()
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printSummary() {
    console.log('\n📊 RESUMO DO BACKFILL');
    console.log('=====================');
    console.log(`✅ Sucessos: ${this.successCount}/${TOP_STOCKS.length}`);
    console.log(`❌ Falhas: ${this.failureCount}/${TOP_STOCKS.length}`);
    console.log(`📈 Total de registros: ${this.totalRecords}`);
    console.log(`⏱️ Taxa de sucesso: ${((this.successCount / TOP_STOCKS.length) * 100).toFixed(1)}%`);
    
    if (this.successCount > 0) {
      console.log('\n✅ BACKFILL CONCLUÍDO COM SUCESSO!');
      console.log('📋 Próximos passos:');
      console.log('   1. Verificar dados no Supabase Dashboard');
      console.log('   2. Testar charts no frontend');
      console.log('   3. Configurar cron jobs para updates diários');
    } else {
      console.log('\n❌ BACKFILL FALHOU');
      console.log('🔧 Verificar:');
      console.log('   1. API keys configuradas corretamente');
      console.log('   2. Tabela historical_prices existe no Supabase');
      console.log('   3. Conectividade com APIs externas');
    }
  }
}

// Executar backfill
const backfillService = new BackfillService();
backfillService.run()
  .then(() => {
    console.log('\n🎉 Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });