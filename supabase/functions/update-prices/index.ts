import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PriceUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
}

// Função para buscar preços da Alpha Vantage
async function fetchFromAlphaVantage(symbols: string[], apiKey: string): Promise<PriceUpdate[]> {
  const updates: PriceUpdate[] = []
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      )
      
      const data = await response.json()
      const quote = data['Global Quote']
      
      if (quote && quote['05. price']) {
        const price = parseFloat(quote['05. price'])
        const change = parseFloat(quote['09. change'])
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))
        const volume = parseInt(quote['06. volume'])
        
        updates.push({
          symbol,
          price,
          change,
          changePercent,
          volume,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error(`Erro ao buscar ${symbol} da Alpha Vantage:`, error)
    }
    
    // Rate limiting - Alpha Vantage permite 5 calls por minuto
    await new Promise(resolve => setTimeout(resolve, 12000))
  }
  
  return updates
}

// Função para buscar preços do Finnhub
async function fetchFromFinnhub(symbols: string[], apiKey: string): Promise<PriceUpdate[]> {
  const updates: PriceUpdate[] = []
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      )
      
      const data = await response.json()
      
      if (data.c && data.c > 0) { // c = current price
        updates.push({
          symbol,
          price: data.c,
          change: data.d, // d = change
          changePercent: data.dp, // dp = percent change
          volume: data.v || 0, // v = volume
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error(`Erro ao buscar ${symbol} do Finnhub:`, error)
    }
    
    // Rate limiting - Finnhub permite 60 calls por minuto
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return updates
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Autorização necessária')
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Obter lista de ações ativas de watchlists
    const { data: activeSymbols, error: symbolsError } = await supabase
      .from('watchlist_stocks')
      .select('stock_symbol')
      .group('stock_symbol')

    if (symbolsError) {
      throw symbolsError
    }

    const symbols = [...new Set(activeSymbols?.map(s => s.stock_symbol) || [])]
    console.log(`📊 Atualizando preços para ${symbols.length} símbolos:`, symbols)

    // Buscar chaves de API
    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY')

    let priceUpdates: PriceUpdate[] = []

    // Tentar Finnhub primeiro (mais rápido)
    if (finnhubKey && finnhubKey !== 'demo') {
      console.log('🚀 Buscando preços do Finnhub...')
      priceUpdates = await fetchFromFinnhub(symbols, finnhubKey)
    }

    // Fallback para Alpha Vantage se necessário
    if (priceUpdates.length === 0 && alphaVantageKey && alphaVantageKey !== 'demo') {
      console.log('🔄 Fallback: Buscando preços da Alpha Vantage...')
      priceUpdates = await fetchFromAlphaVantage(symbols, alphaVantageKey)
    }

    if (priceUpdates.length === 0) {
      throw new Error('Nenhuma API disponível para buscar preços')
    }

    // Atualizar tabela de preços em tempo real
    const { error: updateError } = await supabase
      .from('real_time_prices')
      .upsert(
        priceUpdates.map(update => ({
          symbol: update.symbol,
          price: update.price,
          change: update.change,
          change_percent: update.changePercent,
          volume: update.volume,
          updated_at: update.timestamp
        })),
        { onConflict: 'symbol' }
      )

    if (updateError) {
      throw updateError
    }

    // Atualizar cache de preços
    const { error: cacheError } = await supabase
      .from('price_cache')
      .upsert(
        priceUpdates.map(update => ({
          symbol: update.symbol,
          data: JSON.stringify(update),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutos
        })),
        { onConflict: 'symbol' }
      )

    if (cacheError) {
      console.warn('⚠️ Erro ao atualizar cache:', cacheError)
    }

    // Triggerar notificações em tempo real via Supabase Realtime
    await supabase
      .channel('price-updates')
      .send({
        type: 'broadcast',
        event: 'price-update',
        payload: { symbols: priceUpdates.map(u => u.symbol), count: priceUpdates.length }
      })

    console.log(`✅ Atualizados ${priceUpdates.length} preços com sucesso`)

    return new Response(
      JSON.stringify({
        success: true,
        updated: priceUpdates.length,
        symbols: priceUpdates.map(u => u.symbol),
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erro na atualização de preços:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})