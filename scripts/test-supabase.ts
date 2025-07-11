#!/usr/bin/env ts-node
/**
 * ALFALYZER - TESTE DE CONECTIVIDADE SUPABASE
 * 
 * Este script testa todas as funcionalidades do Supabase:
 * - Conexão básica
 * - Autenticação
 * - Operações CRUD
 * - Realtime subscriptions
 * - Storage (se configurado)
 * 
 * Execução: npm run test-supabase
 * Criado em: 11/07/2025
 */

import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente
dotenv.config();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

class SupabaseConnectivityTest {
  private supabase: SupabaseClient;
  private results: TestResult[] = [];
  private testUserId: string | null = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Credenciais do Supabase não configuradas');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'PASS',
        message: 'Teste executado com sucesso',
        duration
      });
      console.log(`✅ ${testName} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      this.results.push({
        test: testName,
        status: 'FAIL',
        message,
        duration
      });
      console.log(`❌ ${testName} - ${message} - ${duration}ms`);
    }
  }

  async testBasicConnection(): Promise<void> {
    await this.runTest('Conexão Básica', async () => {
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Erro na conexão: ${error.message}`);
      }
    });
  }

  async testAuthentication(): Promise<void> {
    await this.runTest('Autenticação', async () => {
      // Testar criação de usuário de teste
      const testEmail = `test-${Date.now()}@alfalyzer.com`;
      const testPassword = 'TestPassword123!';

      const { data, error } = await this.supabase.auth.signUp({
        email: testEmail,
        password: testPassword
      });

      if (error) {
        throw new Error(`Erro na autenticação: ${error.message}`);
      }

      if (data.user) {
        this.testUserId = data.user.id;
        console.log(`   👤 Usuário de teste criado: ${data.user.email}`);
      }
    });
  }

  async testCRUDOperations(): Promise<void> {
    await this.runTest('Operações CRUD', async () => {
      // CREATE - Criar watchlist de teste
      const testWatchlist = {
        user_id: this.testUserId,
        name: 'Test Watchlist',
        description: 'Watchlist para teste de conectividade',
        is_public: false
      };

      const { data: createData, error: createError } = await this.supabase
        .from('watchlists')
        .insert(testWatchlist)
        .select()
        .single();

      if (createError) {
        throw new Error(`Erro no CREATE: ${createError.message}`);
      }

      const watchlistId = createData.id;
      console.log(`   📝 Watchlist criada: ID ${watchlistId}`);

      // READ - Ler watchlist criada
      const { data: readData, error: readError } = await this.supabase
        .from('watchlists')
        .select('*')
        .eq('id', watchlistId)
        .single();

      if (readError) {
        throw new Error(`Erro no READ: ${readError.message}`);
      }

      console.log(`   📖 Watchlist lida: ${readData.name}`);

      // UPDATE - Atualizar watchlist
      const { data: updateData, error: updateError } = await this.supabase
        .from('watchlists')
        .update({ name: 'Updated Test Watchlist' })
        .eq('id', watchlistId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erro no UPDATE: ${updateError.message}`);
      }

      console.log(`   ✏️  Watchlist atualizada: ${updateData.name}`);

      // DELETE - Deletar watchlist
      const { error: deleteError } = await this.supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);

      if (deleteError) {
        throw new Error(`Erro no DELETE: ${deleteError.message}`);
      }

      console.log(`   🗑️  Watchlist deletada: ID ${watchlistId}`);
    });
  }

  async testRealtimeSubscription(): Promise<void> {
    await this.runTest('Realtime Subscription', async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout na subscription'));
        }, 5000);

        const subscription = this.supabase
          .channel('test-channel')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'watchlists'
          }, (payload) => {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve();
          })
          .subscribe();

        // Trigger uma mudança para testar a subscription
        setTimeout(async () => {
          try {
            await this.supabase
              .from('watchlists')
              .insert({
                user_id: this.testUserId,
                name: 'Realtime Test',
                description: 'Teste de subscription',
                is_public: false
              });
          } catch (error) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            reject(error);
          }
        }, 1000);
      });
    });
  }

  async testRowLevelSecurity(): Promise<void> {
    await this.runTest('Row Level Security', async () => {
      // Testar acesso sem autenticação (deve falhar)
      const anonSupabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );

      const { data, error } = await anonSupabase
        .from('watchlists')
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   🔒 RLS ativo: ${error.message}`);
      } else {
        console.log(`   ⚠️  RLS pode não estar configurado corretamente`);
      }
    });
  }

  async testStorageAccess(): Promise<void> {
    await this.runTest('Storage Access', async () => {
      // Testar listagem de buckets
      const { data, error } = await this.supabase.storage.listBuckets();

      if (error) {
        throw new Error(`Erro no storage: ${error.message}`);
      }

      console.log(`   📦 Buckets encontrados: ${data.length}`);
      data.forEach(bucket => {
        console.log(`     - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
      });
    });
  }

  async testDatabaseSchema(): Promise<void> {
    await this.runTest('Schema da Database', async () => {
      // Testar tabelas principais
      const tables = [
        'users',
        'watchlists',
        'portfolios',
        'stocks',
        'user_preferences'
      ];

      for (const table of tables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error && error.message.includes('does not exist')) {
          console.log(`   ⚠️  Tabela ${table} não existe`);
        } else if (error) {
          console.log(`   ❌ Erro na tabela ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ Tabela ${table} acessível`);
        }
      }
    });
  }

  async cleanup(): Promise<void> {
    await this.runTest('Limpeza', async () => {
      // Limpar dados de teste
      if (this.testUserId) {
        // Deletar watchlists de teste
        await this.supabase
          .from('watchlists')
          .delete()
          .eq('user_id', this.testUserId);

        // Deletar usuário de teste
        await this.supabase.auth.admin.deleteUser(this.testUserId);
        
        console.log(`   🧹 Dados de teste removidos`);
      }
    });
  }

  generateReport(): void {
    console.log('\n📊 RELATÓRIO DE TESTES SUPABASE');
    console.log('===============================');

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`\n📈 ESTATÍSTICAS:`);
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   ✅ Passou: ${passed}`);
    console.log(`   ❌ Falhou: ${failed}`);
    console.log(`   ⏭️  Pulou: ${skipped}`);

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`   ⏱️  Duração total: ${totalDuration}ms`);

    if (failed > 0) {
      console.log(`\n🚨 TESTES FALHARAM:`);
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    console.log(`\n${failed === 0 ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
  }

  async run(): Promise<void> {
    console.log('🚀 ALFALYZER - TESTE DE CONECTIVIDADE SUPABASE');
    console.log('==============================================');
    console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
    console.log(`Usando Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Sim' : 'Não'}`);

    try {
      await this.testBasicConnection();
      await this.testAuthentication();
      await this.testCRUDOperations();
      await this.testRealtimeSubscription();
      await this.testRowLevelSecurity();
      await this.testStorageAccess();
      await this.testDatabaseSchema();
      await this.cleanup();
    } catch (error) {
      console.error('❌ Erro fatal nos testes:', error);
    }

    this.generateReport();
  }
}

// Executar teste se este arquivo for executado diretamente
const tester = new SupabaseConnectivityTest();
tester.run().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

export { SupabaseConnectivityTest };