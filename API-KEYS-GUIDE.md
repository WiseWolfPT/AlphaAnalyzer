# 🔑 Guia de Obtenção de API Keys - Alfalyzer

## Ordem de Prioridade das APIs

O sistema está configurado para usar as APIs nesta ordem:
1. **FMP** (Principal - 250 calls/dia grátis)
2. **Alpha Vantage** (Backup - 25 calls/dia grátis)
3. **Finnhub** (60 calls/minuto grátis)
4. **Twelve Data** (800 calls/dia grátis)

## 1. Financial Modeling Prep (FMP) - PRIORIDADE ALTA ⭐

### Plano Gratuito:
- 250 requisições por dia
- Dados históricos limitados
- Sem suporte

### Como obter:
1. Acesse: https://site.financialmodelingprep.com/developer/docs
2. Clique em "Get Free API Key"
3. Crie uma conta com email
4. A API key será enviada por email
5. Copie a key (formato: `abc123def456...`)

### Adicionar ao servidor:
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
nano .env.production
# Altere: FMP_API_KEY=sua_key_aqui
```

## 2. Alpha Vantage - BACKUP IMPORTANTE 🔄

### Plano Gratuito:
- 25 requisições por dia
- 5 requisições por minuto
- Dados completos

### Como obter:
1. Acesse: https://www.alphavantage.co/support/#api-key
2. Preencha o formulário (nome, email, organização)
3. Clique em "GET FREE API KEY"
4. A key aparece imediatamente na tela
5. Copie a key (formato: `ABCD1234EFGH5678`)

### Adicionar ao servidor:
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
nano .env.production
# Altere: ALPHA_VANTAGE_API_KEY=sua_key_aqui
```

## 3. Finnhub - VOLUME ALTO 📊

### Plano Gratuito:
- 60 requisições por minuto
- Dados em tempo real
- WebSocket incluído

### Como obter:
1. Acesse: https://finnhub.io/register
2. Crie conta com email e senha
3. Confirme email
4. Faça login em: https://finnhub.io/dashboard
5. A API key aparece no dashboard
6. Copie a key (formato: `ct1234567890abcdef`)

### Adicionar ao servidor:
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
nano .env.production
# Altere: FINNHUB_API_KEY=sua_key_aqui
```

## 4. Twelve Data - OPCIONAL 📈

### Plano Gratuito:
- 800 requisições por dia
- 8 requisições por minuto
- Dados históricos incluídos

### Como obter:
1. Acesse: https://twelvedata.com/apikey
2. Clique em "Start for Free"
3. Crie conta com email
4. Confirme email
5. A API key aparece no dashboard
6. Copie a key (formato: `1a2b3c4d5e6f7g8h`)

### Adicionar ao servidor:
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
nano .env.production
# Altere: TWELVE_DATA_API_KEY=sua_key_aqui
```

## 🚀 Aplicar Mudanças

Após adicionar todas as keys:

```bash
# No servidor:
cd "/home/teste 1"

# Verificar o ficheiro
cat .env.production

# Reiniciar aplicação
pm2 restart all

# Verificar logs
pm2 logs --lines 50

# Testar API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/stocks/AAPL/quote
```

## ⚠️ IMPORTANTE

1. **NUNCA** commite API keys no Git
2. **SEMPRE** use o ficheiro `.env.production` no servidor
3. **TESTE** cada API após adicionar a key
4. **MONITORE** o uso para não exceder limites

## 📊 Limites Diários Totais

Com todas as APIs gratuitas configuradas:
- **Total calls/dia**: 1,875
- **Calls/minuto**: 60+ (via Finnhub)
- **Cobertura**: Global com foco em US stocks

## 🔧 Troubleshooting

### Se o backend continua reiniciando:
```bash
# Check logs
pm2 logs --lines 100

# Verify API keys
cd "/home/teste 1"
grep API_KEY .env.production

# Test individual APIs
curl "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY"
```

### Se uma API falha:
1. Verifique se a key está correta
2. Confirme se não excedeu o limite
3. Teste diretamente com curl
4. O sistema automaticamente tenta a próxima API

## 📝 Notas

- FMP é a melhor para dados fundamentais
- Finnhub é ideal para tempo real (60/min)
- Alpha Vantage tem dados históricos completos
- Twelve Data tem boa cobertura internacional

---

**Última atualização**: 2025-08-17
**Suporte**: GitHub Issues no repositório