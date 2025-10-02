# Plano de Monitorização - Alfalyzer Fase 11

**Data Início:** 2025-09-26
**Última Atualização:** 2025-10-01
**Status:** 🟢 ATIVO - Monitorização em curso (otimização Nginx/keepalive aplicada)

## 📊 ENVs Ativos em Produção

```bash
# Configurados em /home/teste 1/.env.production
HOT_SET_SIZE=100                 # Top 100 símbolos sempre quentes
HOT_SET_REFRESH_SECONDS=60       # Atualização a cada 60s
QUOTES_CALLS_PER_MIN_BUDGET=180  # Máximo 180 calls/min (pacing de segurança)

# Warm set (ATIVO)
WARM_SET_SIZE=1000               # 1000 símbolos em aquecimento rotativo
WARM_SET_REFRESH_SECONDS=600     # Atualização a cada 10 minutos

# TTLs diferenciados por conjunto
TTL_HOT_SECONDS=60               # TTL do HOT set
TTL_WARM_SECONDS=600             # TTL do WARM set (aplicado pelo worker)
```

## 📅 Verificações Agendadas

| Data | Hora | Ação | Responsável |
|------|------|------|------------|
| Próxima abertura NYSE | 09:30 ET | Track-1h (validar lat_ms/lat_cache_ms/lat_batch_ms) | Operador |
| Próximo fecho NYSE | 16:00 ET | Track-1h (comparar abertura vs fecho) | Operador |
| 2025-09-27 | ~14:00 UTC | T+24h: Primeira verificação de métricas | Operador |
| 2025-09-28 | ~14:00 UTC | T+48h: Decisão sobre ativação warm set | Operador |
| 2025-09-29 | -- | T+72h: Ajuste fino se necessário | Operador |

## 🎯 Critérios de Ajuste

### Cenário 1: Hit Rate Baixo
**Sintoma:** Cache hit rate < 80% com latência P95 subindo
**Ação:**
- Aumentar `HOT_SET_SIZE` para 150
- OU reduzir `HOT_SET_REFRESH_SECONDS` para 45

### Cenário 2: Excesso de Calls
**Sintoma:** calls/min > 220 por mais de 5 minutos
**Ação:**
- Reduzir `HOT_SET_SIZE` para 80
- OU aumentar `HOT_SET_REFRESH_SECONDS` para 75-90

### Cenário 3: Sistema Estável
**Sintoma:** Hit rate > 85%, calls/min < 180, P95 < 300ms
**Ação:**
- Ativar warm set: `WARM_SET_SIZE=500, WARM_SET_REFRESH_SECONDS=600`
- Considerar aumentar budget para 220-250 calls/min

## 🔍 Como Verificar Métricas

### 1. Cache Hit Rate
```bash
# No servidor Hetzner
tail -20 /var/log/alfalyzer/monitoring/cron.log | grep "Cache hit"

# Ou via API
curl -s https://128.140.45.28.sslip.io/api/cache/status | jq '.cache.stats'
```

### 2. API Calls por Minuto
```bash
# Check quota status (rota interna; requer auth)
curl -s localhost:3001/api/quota/status | jq '.data.usage.fmp.lastMinute'

# Ver logs do worker
pm2 logs price-worker --lines 50 | grep "API calls"
```

### 3. Latência P95
```bash
# Logs de SLO
tail -1 /var/log/alfalyzer/monitoring/slo-*.log | grep "P95"

# Script de verificação
cd /home/teste\ 1 && ./scripts/monitoring/check-slo.sh
```

### 4. Worker Stats (Redis)
```bash
# Via redis-cli
redis-cli --no-auth-warning -a alfalyzer2025redis GET worker:stats

# Ou via script
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis GET worker:stats | jq ."
```

## 📈 Métricas Baseline (Pré-mudança)

- **Hit Rate:** 93-94%
- **P95 Latência:** ~250ms
- **Calls/min:** Não medido (sem limite anterior)
- **Uptime:** 100%

## 📝 Histórico de Mudanças

| Data | Mudança | Razão | Resultado |
|------|---------|-------|-----------|
| 2025-09-26 14:00 | Ativado HOT_SET_SIZE=100, budget=180 | Implementação Fase 11 | Aguardando métricas |
| 2025-09-27 23:30 | Ativado WARM_SET_SIZE=1000, REFRESH=600, TTL_HOT=60, TTL_WARM=300 | Headroom confirmado | Monitorização ativa |
| 2025-09-29 21:30 | Nginx upstream keepalive + HTTP/2; health light; Node keepalive | Reduzir overhead E2E | P95 público: 540ms → ~137ms (após estabilização); Hit ~94–95%; erros 0% |
| 2025-10-01 16:15 | Normalização de rate limits (100/1000/5000) e proteção batch (defense‑in‑depth) | Fechar bypass no batch e expor limites reais | GET/POST batch exigem X‑API‑Key; headers mostram X‑RateLimit‑Limit: 100 |
| 2025-10-01 16:17 | Swap 2GB criado (/swapfile) | Prevenir OOM e restarts sob carga | Swap ativo (2.0Gi), vm.swappiness=10 |
| 2025-10-01 16:18 | Force deploy com checksum (rsync p/ caminho com espaço) | Garantir binário atualizado | Hash local=remoto; PM2 restart OK |

## 🚨 Procedimento de Rollback

Se houver problemas graves:

```bash
# 1. Conectar ao servidor
ssh root@128.140.45.28

# 2. Remover ENVs problemáticos
cd "/home/teste 1"
nano .env.production
# Comentar ou remover: HOT_SET_SIZE, QUOTES_CALLS_PER_MIN_BUDGET, etc

# 3. Restart workers
pm2 restart price-worker
pm2 restart alfalyzer

# 4. Verificar logs
pm2 logs price-worker --lines 100
```

## 📊 Dashboard de Monitorização

Para visão consolidada, executar:

```bash
# Script que será criado
/home/teste\ 1/scripts/monitoring/check-metrics.sh
```

Output esperado:
```
=== ALFALYZER METRICS CHECK ===
Time: 2025-09-27 14:00:00
Hit Rate: 91%
P95 Latency: 280ms
API Calls/min: 165
Worker Status: Running
Hot Set: 100 symbols
Recommendation: STABLE - Continue monitoring
```

## 🔗 Referências

- Plano Original: [ALFALYZER_EXECUTION_PLAN.md](../ALFALYZER_EXECUTION_PLAN.md#fase-11)
- Configuração: [CLAUDE.md](../CLAUDE.md#operação--env-pacing--ttl)
- Scripts: `/scripts/monitoring/`
- Logs: `/var/log/alfalyzer/monitoring/`

## ⏰ Agendamento (CRON_TZ)

Ativo no crontab do root com timezone da bolsa de NY (evita DST):

```
CRON_TZ=America/New_York
30 9 * * 1-5  cd "/home/teste 1" && bash scripts/monitoring/track-1h.sh production   # Abertura 09:30 ET
0  16 * * 1-5 cd "/home/teste 1" && bash scripts/monitoring/track-1h.sh production   # Fecho 16:00 ET
```

Validação sugerida após a próxima abertura:

```
ssh root@128.140.45.28 "tail -n 3 '/home/teste 1/scripts/monitoring/logs/track-1h-*.log'"
ssh root@128.140.45.28 "grep -nE 'lat_ms=|lat_cache_ms=|lat_batch_ms=' '/home/teste 1/scripts/monitoring/logs/track-1h-*.log' | tail -n 15"
```

## ⚠️ Notas Importantes

1. **Não alterar ENVs** sem registrar no histórico acima
2. **Sempre fazer backup** do .env.production antes de mudanças
3. **Comunicar mudanças** via commit message ou issue
4. **Warm set** só deve ser ativado após confirmar estabilidade

---

**Próxima Revisão:** 2025-09-27 14:00 UTC (T+24h)
