# 🌱 Alfalyzer Database Seeding System

Sistema completo de seed para popular o banco de dados com dados iniciais para desenvolvimento e testes.

## 🚀 Quick Start

```bash
# Seed completo (recomendado para primeira vez)
npm run seed

# Verificar se os dados foram criados
npm run seed:verify

# Reset e reseed (limpa tudo e recria)
npm run seed:reseed
```

## 📋 Comandos Disponíveis

### Comandos Principais

```bash
npm run seed          # Executa seed completo (base + histórico)
npm run seed:reset    # Remove todos os dados de seed
npm run seed:reseed   # Reset + seed (útil para refresh completo)
npm run seed:verify   # Verifica integridade dos dados
npm run seed:refresh  # Atualiza preços em tempo real (futuro)
```

### Comandos Específicos

```bash
npm run seed:db       # Seed apenas dados base (stocks, usuários, etc)
npm run seed:history  # Seed apenas histórico de preços (30 dias)
```

## 📊 Dados Incluídos

### 1. **Ações Portuguesas (PSI20)**
- 15 principais empresas portuguesas
- Incluindo: Galp, EDP, Jerónimo Martins, BCP, etc.

### 2. **Ações Americanas (S&P 500)**
- Top 20 empresas americanas
- Incluindo: Apple, Microsoft, Google, Amazon, etc.

### 3. **Criptomoedas**
- 5 principais: Bitcoin, Ethereum, BNB, Tether, Solana

### 4. **Índices de Mercado**
- PSI20, S&P 500, Dow Jones, NASDAQ, FTSE 100, DAX

### 5. **Dados de Demonstração**
- Usuário demo: `demo@alfalyzer.com` / `demo123`
- Watchlist exemplo com 5 ações tech
- Portfolio exemplo com 5 posições

### 6. **Histórico de Preços**
- 30 dias de dados OHLCV
- Padrões realistas de volume
- Volatilidade apropriada por tipo de ativo

## 🔧 Estrutura do Sistema

```
server/seeds/
├── README.md              # Esta documentação
├── index.ts              # Script mestre de seed
├── seed-database.ts      # Seed de dados base
├── seed-price-history.ts # Seed de histórico
└── data/
    └── initial-assets.json # Dados iniciais de ativos
```

## 🎯 Casos de Uso

### Desenvolvimento Local
```bash
# Primeira vez configurando o projeto
npm run migrate        # Criar tabelas
npm run seed          # Popular com dados

# Após mudanças no código
npm run seed:reseed   # Limpar e recriar dados
```

### Testes
```bash
# Antes de rodar testes
npm run seed:reset    # Limpar dados antigos
npm run seed         # Criar dados limpos

# Verificar integridade
npm run seed:verify  # Confirmar que dados estão corretos
```

### Demo/Apresentação
```bash
# Preparar ambiente de demo
npm run seed:reseed  # Dados frescos
npm run dev         # Iniciar aplicação
```

## 📈 Dados Gerados

### Tabelas Populadas

1. **users** - Usuário demo
2. **stocks** - ~50 ações (PT, US, Crypto)
3. **stock_quotes_cache** - Preços atuais
4. **market_indices_cache** - Valores dos índices
5. **price_history** - 30 dias de OHLCV
6. **price_summary_stats** - Estatísticas calculadas
7. **watchlists** - Lista de observação demo
8. **watchlist_stocks** - Ações na watchlist
9. **portfolios** - Portfolio demo
10. **portfolio_holdings** - Posições do portfolio
11. **portfolio_transactions** - Transações de compra

### Estatísticas Típicas

- ~50 símbolos únicos
- ~1,500 registros de histórico (30 dias × 50 símbolos)
- Dados realistas de preço e volume
- Volatilidade apropriada por classe de ativo

## 🔍 Verificação de Dados

O comando `npm run seed:verify` mostra:

```
📊 Database Statistics:
  Users: 1
  Stocks: 50
  Stock Quotes: 50
  Market Indices: 6
  Watchlists: 1
  Portfolios: 1

📱 Sample Stock (AAPL):
  Name: Apple Inc.
  Price: $195.42
  Change: 2.35 (1.22%)

📊 Price History Statistics:
  Symbols with history: 50
  Total records: 1500
  Date range: 2024-12-15 to 2025-01-14
```

## ⚡ Performance

- Seed completo: ~15-20 segundos
- Reset: ~1 segundo
- Verify: ~1 segundo

## 🛠️ Customização

### Adicionar Novos Ativos

Edite `server/seeds/data/initial-assets.json`:

```json
{
  "us_stocks": [
    {
      "symbol": "NEW",
      "name": "New Company Inc.",
      "exchange": "NYSE",
      "sector": "Technology",
      "industry": "Software",
      "country": "US",
      "currency": "USD"
    }
  ]
}
```

### Modificar Período de Histórico

Em `seed-price-history.ts`, linha 32:
```typescript
const days = 30; // Alterar para o período desejado
```

### Ajustar Volatilidade

Em `seed-price-history.ts`, função `generatePriceHistory`:
```typescript
let volatility = 0.02; // 2% padrão
if (symbol.includes('CRYPTO')) {
  volatility = 0.10; // 10% para crypto
}
```

## 🚨 Troubleshooting

### Erro: "No stocks found in cache"
```bash
# Executar seed base primeiro
npm run seed:db
npm run seed:history
```

### Erro: "Database locked"
```bash
# Parar servidor e tentar novamente
npm run stop
npm run seed:reseed
```

### Dados não aparecem na aplicação
```bash
# Verificar dados e reiniciar servidor
npm run seed:verify
npm run restart
```

## 🔒 Segurança

- Senha do usuário demo é hasheada com bcrypt
- Dados de seed são apenas para desenvolvimento
- **NUNCA** use estes dados em produção
- API keys não são incluídas no seed

## 🚀 Próximos Passos

1. Implementar `seed:refresh` para atualizar com dados reais
2. Adicionar mais histórico (90 dias, 1 ano)
3. Incluir dados fundamentais (P/E, EPS, etc)
4. Seed de notícias e análises
5. Dados de earnings e dividendos

---

**Criado com ❤️ para o projeto Alfalyzer**