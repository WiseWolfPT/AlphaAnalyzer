Aqui vai o plano completo e actualizado para o teu Alfalyzer, com dados confirmados para Agosto de 2025 através de pesquisas em sites oficiais e fontes fiáveis (usei ferramentas de busca para verificar limites exactos, como docs de pricing e análises recentes). Não houve mudanças radicais: tiers gratuitos continuam limitados para uso pessoal/testes, com foco em WebSockets (WS) para updates push reais (subsegundo em volatilidade) e polling batch para backups. Limites ajustados: Finnhub ~50 símbolos no WS free (60 calls/min REST, 30/sec global);
<argument name="citation_id">2</argument>

<argument name="citation_id">4</argument>
 Polygon.io WS ilimitado free (REST 5/min, cobertura SIP parcial);
<argument name="citation_id">7</argument>

<argument name="citation_id">8</argument>
 FMP 250 calls/dia sem real-time full (só EOD/quotes com delay possível, batch até 100 símbolos);
<argument name="citation_id">17</argument>

<argument name="citation_id">18</argument>

<argument name="citation_id">19</argument>
 Tiingo 500 calls/hora e 500 símbolos/mês;
<argument name="citation_id">28</argument>

<argument name="citation_id">29</argument>
 Alpha Vantage 25 calls/dia com delay 1-15min.
<argument name="citation_id">36</argument>

<argument name="citation_id">37</argument>

<argument name="citation_id">38</argument>

<argument name="citation_id">46</argument>
 Para uso diário, optimiza com caching no Redis/Supabase (TTL 30s) e worker no Hetzner para subscrições únicas. Regista-te para chaves free e testa, pois limites podem variar por conta. Com caching e worker, os preços actualizam-se de forma efectiva a cada 30 segundos (push WS mais rápido em volatilidade; polling garante mínimo), visíveis no frontend via TanStack Query (refetchInterval: 30000) e Supabase Realtime para notificações reactivas.

### Divisão por Stocks e Providers (Híbrida para 50-100 Acções)
Dividi para cobrir até 100 acções principais (S&P 500/Nasdaq) com tiers gratuitos, priorizando WS para push (mais rápido que 30s em volatilidade) e polling batch para robustez. Total diário ~250-500 calls, dentro dos limites se batchado. Atribui stocks por prioridade (top activas primeiro).

| Provider | Até Quantos Stocks (Limite Free Actualizado) | Como Usar (Método e Limitações) | Adequação Diária |
|----------|---------------------------------------------|---------------------------------|------------------|
| **Finnhub** | Até 50 stocks (top activas, ex.: AAPL, TSLA, GOOG) | WS para trades/quotes (push subsegundo; free ~50 símbolos simultâneos, 60 calls/min REST fallback, 30 calls/sec global). Subscreve persistentemente no worker. | Viável diário para testes; generoso no free, monitoriza excedentes com Sentry. |
| **Polygon.io** | De 51 a 90 stocks (até 40 adicionais, ex.: MSFT, NVDA) | WS ilimitado free (real-time US exchanges, cobertura SIP parcial); REST 5 calls/min para batch polling (ex.: 100 símbolos/call). Usa WS principal. | Excelente para volume médio; diário ok, sem limite WS rígido. |
| **Financial Modeling Prep (FMP)** | De 91 a 100 stocks (até 10, ajustado sem real-time full) | REST batch quotes (100 símbolos/call, 250 calls/dia; sem real-time, só EOD/quotes com delay possível). Polling a 30s ~24 calls/dia para 10. | Viável diário com cache; usa como fallback para EOD, não para push. |
| **Tiingo** | Fallback para 10-20 se necessário (ex.: menos voláteis) | REST quase real-time (500 calls/hora, 500 símbolos/mês free); polling batch. Sem WS full free. | Bom suplemento diário, mas limita a polling. |
| **Alpha Vantage** | Apenas on-demand (até 5-10, ex.: emergências) | REST quase real-time (25 calls/dia, 5/min; delay 1-15min). Não para polling constante. | Limitado; usa só fallback diário para poucas, com delay possível. |

**Notas na Divisão**: Atribui stocks dinamicamente no código (ex.: array topStocks para Finnhub, midStocks para Polygon). Para 50 stocks, usa só Finnhub + Polygon. Consumo diário ajustado com batch (ex.: 1 call para 50 símbolos no polling).

### Implementação Geral (Detalhada e Actualizada)
- **Preparação**: Regista-te nas APIs para chaves free (Finnhub.io, Polygon.io, etc.). Verifica TOS – free para pessoal, contacta para uso comunitário (Whop inicial). Migra frontend para Netlify se CORS persistir (config headers em netlify.toml).
- **Worker no Hetzner (Node.js/Express + Coolify)**: Dockeriza para persistência. Usa ws package para WS: 
  ```javascript
  const WebSocket = require('ws');
  const wsFinnhub = new WebSocket('wss://ws.finnhub.io?token=chave');
  wsFinnhub.on('open', () => {
    topStocks.forEach(symbol => wsFinnhub.send(JSON.stringify({ type: 'subscribe', symbol })));
  });
  wsFinnhub.on('message', data => {
    const parsed = JSON.parse(data);
    parsed.data.forEach(trade => redis.set(trade.s, JSON.stringify({ price: trade.p, time: Date.now() }), { EX: 30 })); // TTL 30s
  });
  ```
  Similar para Polygon (wss://socket.polygon.io/stocks). Para polling: Node Cron `cron.schedule('*/30 * * * * *', async () => { const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${bottomStocks.join(',')}?apikey=chave`); // Processa e armazena no Redis });`. Adiciona try-catch para errors (ex.: 429 → fallback).
- **Caching e BD (Redis + Supabase)**: Redis TTL 30s para preços; Supabase para históricos (Drizzle ORM inserts batch). Usa LRU Cache para performance extra. Compression no Express para responses.
- **Backend Endpoints**: `/prices/:symbol` consulta Redis/Supabase; se não cached, trigger on-demand fallback. CORS middleware: `app.use(cors({ origin: ['https://teu-app.netlify.app', 'http://localhost:3000'], credentials: true }));`. Rate Limit para segurança.
- **Frontend (React/Vite + Netlify)**: TanStack Query para fetch: 
  ```javascript
  useQuery({
    queryKey: ['prices', symbol],
    queryFn: () => axios.get(`/api/prices/${symbol}`),
    refetchInterval: 30000, // 30s
    onSuccess: data => zustandStore.updatePrice(symbol, data.price) // Actualiza state reactivo
  });
  ```
  Integra Supabase Realtime: `supabase.channel('prices').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stocks' }, payload => { // Actualiza Zustand/Framer Motion para animações visíveis }).subscribe();`. Wouter routing para páginas de stocks; Zod valida dados.
- **Segurança e Monitoring**: JWT/BCrypt para auth; Helmet/Rate Limit em endpoints. Winston/Sentry logs quotas/errors (ex.: alert se calls >80% diário).
- **Testes**: Vitest para unit (ex.: mock WS); Playwright E2E para updates 30s; Supertest para API. Husky git hooks para runs pré-commit.
- **Custo Inicial**: Zero além Hetzner; ~250-500 calls/dia total.
- **Escala**: Para 50-100 acções diárias, testa quotas com Bundle Analyzer. Migra paid (ex.: Polygon $49/mês ilimitado) ao monetizar via Stripe.

### Plano B Caso Alguma Falhe (Detalhado)
Mantém robustez com automação no worker:
1. **Fallback Imediato**: Se Finnhub falhar (ex.: 429 ou disconnect), muda para Polygon (if-else: try wsFinnhub, catch subscribe Polygon WS para mesmos stocks).
2. **Polling Manual como Reserva**: Reduz frequência para 1min (cron dynamic) e usa cache old (ex.: if error, return redis.get(lastKnownPrice), TTL 5min estendido).
3. **Yahoo como Último Recurso**: Integra yfinance on-demand: `if allFail, const yfinance = require('yfinance'); await yfinance.getQuote(symbol);` – com rate limiting interno (max 10/min, rotating user agents via Axios headers para evitar bans). Limita a 10-20 stocks/dia devido a issues (429, IP bans).
4. **Notificações e Degradation**: Sentry envia alerts (ex.: email/slack para admins); frontend mostra "Dados atrasados" (com cached values via Zustand) e animação Lottie para loading. Para downtime total, fallback EOD de Alpha Vantage (25 calls/dia, delay 1-15min).
5. **Redundância Híbrida**: Array dinâmico de providers por símbolo (ex.: { symbol: 'AAPL', providers: ['finnhub', 'polygon', 'yfinance'] }); roda semanalmente testes com Vitest para simular falhas. Se tudo falhar, pausa updates automáticos e notifica utilizadores via i18next (mensagem i18n PT/EN).

Este plano é completo, alinhado com a tua stack e dados de Agosto de 2025 – implementa passo a passo e monitoriza com Sentry. Com a divisão híbrida, actualizações a 30s são viáveis e visíveis no frontend. Se quiseres código específico (ex.: worker full ou netlify.toml), diz.