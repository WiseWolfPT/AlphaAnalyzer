# 🔑 CONFIGURAÇÃO DE API KEYS PARA DADOS REAIS

## Links para Registro (GRATUITO)

### 1. **Finnhub** (60 chamadas/minuto - REAL-TIME)
- 🔗 **Link**: https://finnhub.io/register
- 💰 **Gratuito**: 60 chamadas por minuto
- 🎯 **Melhor para**: Preços em tempo real, WebSocket

### 2. **Twelve Data** (800 chamadas/dia)
- 🔗 **Link**: https://twelvedata.com/pricing
- 💰 **Gratuito**: 800 chamadas por dia
- 🎯 **Melhor para**: Dados históricos, cotações batch

### 3. **Financial Modeling Prep** (250 chamadas/dia)
- 🔗 **Link**: https://financialmodelingprep.com/developer/docs
- 💰 **Gratuito**: 250 chamadas por dia
- 🎯 **Melhor para**: Balanços, demonstrativos financeiros

### 4. **Alpha Vantage** (25 chamadas/dia)
- 🔗 **Link**: https://www.alphavantage.co/support/#api-key
- 💰 **Gratuito**: 25 chamadas por dia
- 🎯 **Melhor para**: Backup, dados fundamentais

---

## 📝 PASSOS PARA CONFIGURAR

### Passo 1: Registar nas APIs (5-10 min cada)
1. Clica nos links acima
2. Faz registo gratuito
3. Copia a API key que recebes

### Passo 2: Atualizar .env
Edita o ficheiro `.env` e substitui "demo" pelas tuas chaves reais:

```bash
# Substitui estas linhas:
VITE_FINNHUB_API_KEY="demo"
VITE_TWELVE_DATA_API_KEY="demo"
VITE_FMP_API_KEY="demo"
VITE_ALPHA_VANTAGE_API_KEY="demo"

# Por:
VITE_FINNHUB_API_KEY="sua_chave_finnhub_aqui"
VITE_TWELVE_DATA_API_KEY="sua_chave_twelve_data_aqui"
VITE_FMP_API_KEY="sua_chave_fmp_aqui"
VITE_ALPHA_VANTAGE_API_KEY="sua_chave_alpha_vantage_aqui"
```

### Passo 3: Reiniciar Servidor
```bash
# Para o servidor (Ctrl+C)
# Depois executa:
npm run dev
```

---

## 🎯 RESULTADO FINAL

Com as API keys reais terás:
- ✅ **Preços em tempo real** das ações
- ✅ **Dados fundamentais reais** (P/E, Market Cap, etc.)
- ✅ **Histórico de preços** real
- ✅ **Intrinsic value** calculado com dados reais
- ✅ **1,135 chamadas GRATUITAS por dia** no total

## 💡 DICA IMPORTANTE

**SEM API KEYS**: App funciona com dados mockados
**COM API KEYS**: App funciona com dados reais do mercado

A aplicação está preparada para ambos os cenários!