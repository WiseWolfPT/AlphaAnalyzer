/**
 * Script para testar a publicação de eventos realtime do backend
 * Execute com: npx tsx test-realtime-publishing.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealtimePublishing() {
  console.log('🚀 Iniciando teste de publicação realtime...\n');

  // 1. Testar conexão com Supabase
  console.log('1️⃣ Testando conexão com Supabase...');
  const { data: healthCheck, error: healthError } = await supabase
    .from('realtime_quotes')
    .select('count')
    .limit(1);

  if (healthError) {
    console.error('❌ Erro ao conectar com Supabase:', healthError);
    return;
  }
  console.log('✅ Conexão com Supabase OK\n');

  // 2. Inscrever no canal realtime
  console.log('2️⃣ Inscrevendo no canal realtime...');
  const channel = supabase
    .channel('stock-quotes')
    .on(
      'broadcast',
      { event: 'quote-update' },
      (payload) => {
        console.log('📨 Evento recebido:', {
          symbol: payload.payload.symbol,
          price: payload.payload.price,
          change: payload.payload.change,
          timestamp: new Date(payload.payload.timestamp).toLocaleString()
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Status da inscrição:', status);
    });

  // 3. Aguardar inscrição
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Fazer chamada ao backend para gerar evento
  console.log('\n3️⃣ Fazendo chamada ao backend para gerar evento realtime...');
  
  // Try local server
  const endpoints = [
    'http://localhost:3001/api/market-data/quote/AAPL'
  ];
  
  let response;
  let selectedEndpoint;
  
  for (const endpoint of endpoints) {
    console.log(`   Tentando: ${endpoint}`);
    try {
      response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json'
        }
      });
      selectedEndpoint = endpoint;
      if (response.ok) {
        console.log(`   ✅ Conectado a: ${endpoint}`);
        break;
      }
    } catch (err) {
      console.log(`   ❌ Falha ao conectar: ${err.message}`);
    }
  }
  
  if (!response) {
    console.error('❌ Nenhum servidor disponível');
    return;
  }

  try {
    
    // Check content type
    const contentType = response.headers.get('content-type');
    console.log('   Content-Type:', contentType);
    console.log('   Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Erro na resposta:', text.substring(0, 200) + '...');
      return;
    }
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log('📊 Resposta do backend:', {
        symbol: data.symbol,
        price: data.price,
        source: data._source || 'unknown'
      });
    } else {
      const text = await response.text();
      console.error('❌ Resposta não é JSON:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('❌ Erro ao chamar backend:', error);
  }

  // 5. Aguardar possíveis eventos
  console.log('\n⏳ Aguardando eventos realtime por 10 segundos...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 6. Verificar se há dados no cache (schema cache)
  console.log('\n4️⃣ Verificando cache no Supabase (schema cache)...');
  const { data: cacheData, error: cacheError } = await supabase
    .from('cache.stock_quotes')
    .select('*')
    .eq('symbol', 'AAPL')
    .single();

  if (cacheError) {
    console.error('❌ Erro ao verificar cache:', cacheError);
  } else if (cacheData) {
    console.log('✅ Dados encontrados no cache:', {
      symbol: cacheData.symbol,
      timestamp: new Date(cacheData.created_at).toLocaleString(),
      expires_at: new Date(cacheData.expires_at).toLocaleString(),
      data: cacheData.quote_data
    });
  } else {
    console.log('⚠️ Nenhum dado encontrado no cache');
  }

  // 7. Verificar tabela realtime_quotes
  console.log('\n5️⃣ Verificando tabela realtime_quotes...');
  const { data: realtimeData, error: realtimeError } = await supabase
    .from('realtime_quotes')
    .select('*')
    .eq('symbol', 'AAPL')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (realtimeError) {
    console.error('❌ Erro ao verificar realtime_quotes:', realtimeError);
  } else if (realtimeData && realtimeData.length > 0) {
    console.log('✅ Dados encontrados em realtime_quotes:');
    realtimeData.forEach((quote, index) => {
      console.log(`   ${index + 1}. ${quote.symbol}: $${quote.price} (${new Date(quote.timestamp).toLocaleString()})`);
    });
  } else {
    console.log('⚠️ Nenhum dado encontrado em realtime_quotes');
  }

  // Limpar
  console.log('\n🏁 Teste concluído. Cancelando inscrição...');
  await channel.unsubscribe();
  process.exit(0);
}

// Executar teste
testRealtimePublishing().catch(console.error);