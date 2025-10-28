# 🛡️ FMP Bandwidth Protection System
**ONDA 6: Nunca Mais Bandwidth Spikes**

## 🎯 PROBLEMA RESOLVIDO

**Situação anterior:**
- Bandwidth subia exponencialmente sem controlo
- 19.81/20 GB (99% usado, apenas 190 MB margem)
- Nenhum alerta quando aproximava do limite
- Risco de exceder limite e bloquear FMP API

**Solução implementada:**
- ✅ **3 camadas de proteção** (monitoring + circuit breaker + alertas)
- ✅ **Real-time tracking** de bandwidth usado
- ✅ **Auto-throttling** a 85% do limite
- ✅ **Circuit breaker** a 95% (bloqueia requests automaticamente)
- ✅ **Dashboard** para visualizar usage histórico

---

## 📊 SISTEMA DE 3 CAMADAS

### **Layer 1: Real-Time Monitoring Script**

**Script:** `/scripts/monitoring/check-fmp-bandwidth.sh`

**O que faz:**
- Lê bandwidth atual do FMP (via config file)
- Calcula percentagem usada
- Calcula daily budget e margem restante
- Alerta se >= 85% (WARNING) ou >= 95% (CRITICAL)

**Como usar:**
```bash
# 1. Atualizar valor atual do FMP dashboard
echo "19.81" > /home/teste\ 1/.fmp-bandwidth-current

# 2. Executar check
bash scripts/monitoring/check-fmp-bandwidth.sh

# Output exemplo:
# ✅ OK: Bandwidth at 82.5%
# Total Used: 16.5 GB / 20 GB (82.5%)
# Daily Budget: 0.667 GB/day
# Daily Used: 0.550 GB/day
# Daily Remaining: 0.117 GB/day
```

**Setup cron (horário):**
```bash
# Verificar bandwidth a cada hora
0 * * * * cd "/home/teste 1" && FMP_API_KEY=sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh bash scripts/monitoring/check-fmp-bandwidth.sh
```

---

### **Layer 2: Circuit Breaker Middleware**

**File:** `/server/middleware/bandwidth-protection.ts`

**O que faz:**
- Intercepta TODAS as chamadas FMP API
- Estima bandwidth de cada request
- Bloqueia requests se projeção exceder 95%
- Adiciona headers de warning se >= 85%
- Tracking automático em Redis

**Thresholds:**
```typescript
WARNING:  85% → Adiciona header X-Bandwidth-Warning
CRITICAL: 95% → Retorna 503 Service Unavailable
```

**Response quando bloqueado:**
```json
{
  "error": "Service temporarily unavailable",
  "code": "BANDWIDTH_LIMIT_EXCEEDED",
  "message": "Daily bandwidth budget exceeded. Service will resume tomorrow.",
  "retryAfter": 43200  // Seconds until midnight UTC
}
```

**Como integrar:**
```typescript
// server/index.ts
import { bandwidthProtection } from './middleware/bandwidth-protection';

// Adicionar ANTES das routes de IV e market-data
app.use(bandwidthProtection);
```

---

### **Layer 3: Monitoring Dashboard API**

**Routes:** `/server/routes/bandwidth-monitoring.ts`

**Endpoints:**

#### 1. **GET /api/bandwidth/stats** - Current Usage
```bash
curl https://128.140.45.28.sslip.io/api/bandwidth/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "daily": {
      "used": "550.23 MB",
      "budget": "682.67 MB",
      "remaining": "132.44 MB",
      "percentUsed": "80.61%"
    },
    "requests": {
      "today": 12543
    },
    "status": "CAUTION",
    "timestamp": "2025-10-24T15:30:00.000Z"
  }
}
```

#### 2. **GET /api/bandwidth/history** - Last 7 Days
```bash
curl https://128.140.45.28.sslip.io/api/bandwidth/history
```

Response:
```json
{
  "success": true,
  "data": {
    "history": [
      { "date": "2025-10-18", "usedMB": "645.22", "requests": 13200 },
      { "date": "2025-10-19", "usedMB": "612.11", "requests": 12800 },
      ...
    ],
    "totalLast7Days": "4324.56 MB"
  }
}
```

#### 3. **POST /api/bandwidth/manual-update** - Update from FMP Dashboard
```bash
curl -X POST https://128.140.45.28.sslip.io/api/bandwidth/manual-update \
  -H "Content-Type: application/json" \
  -d '{"totalUsedGB": 19.81}'
```

Response:
```json
{
  "success": true,
  "message": "Bandwidth updated to 19.81 GB",
  "data": {
    "totalUsedGB": 19.81,
    "dailyAverage": "0.660 GB/day",
    "percentUsed": "99.05%"
  }
}
```

---

## 🚀 SETUP COMPLETO

### **Passo 1: Integrar Middleware (5 min)**

```typescript
// server/index.ts (adicionar após line ~50)
import { bandwidthProtection } from './middleware/bandwidth-protection';
import bandwidthRoutes from './routes/bandwidth-monitoring';

// ANTES das routes de IV/market-data
app.use(bandwidthProtection);

// Adicionar bandwidth routes
app.use('/api/bandwidth', bandwidthRoutes);
```

### **Passo 2: Setup Monitoring Script (2 min)**

```bash
# 1. Tornar executável
chmod +x scripts/monitoring/check-fmp-bandwidth.sh

# 2. Criar config inicial
ssh root@128.140.45.28
echo "19.81" > "/home/teste 1/.fmp-bandwidth-current"

# 3. Testar
cd "/home/teste 1"
FMP_API_KEY=sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh bash scripts/monitoring/check-fmp-bandwidth.sh
```

### **Passo 3: Setup Cron (3 min)**

```bash
ssh root@128.140.45.28
crontab -e

# Adicionar linha:
0 * * * * cd "/home/teste 1" && FMP_API_KEY=sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh bash scripts/monitoring/check-fmp-bandwidth.sh >> /var/log/alfalyzer/monitoring/fmp-bandwidth.log 2>&1
```

### **Passo 4: Build & Deploy (10 min)**

```bash
# Local
npm run build:server
npm run deploy:server

# Validar
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env"

# Testar endpoints
curl https://128.140.45.28.sslip.io/api/bandwidth/stats
```

---

## 📈 COMO MONITORIZAR DIARIAMENTE

### **Opção A: Via API (Automático)**

```bash
#!/bin/bash
# Adicionar ao teu dashboard ou Slack bot

STATS=$(curl -s https://128.140.45.28.sslip.io/api/bandwidth/stats)
PERCENT=$(echo "$STATS" | jq -r '.data.daily.percentUsed')
STATUS=$(echo "$STATS" | jq -r '.data.status')

if [ "$STATUS" != "OK" ]; then
    # Send alert to Slack/Discord/Email
    curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"⚠️ FMP Bandwidth: $PERCENT ($STATUS)\"}"
fi
```

### **Opção B: Via FMP Dashboard (Manual)**

1. Aceder a https://financialmodelingprep.com/developer/docs/dashboard
2. Ver "Trailing 30-Day Bandwidth Consumption"
3. Atualizar valor no Alfalyzer:
```bash
curl -X POST https://128.140.45.28.sslip.io/api/bandwidth/manual-update \
  -H "Content-Type: application/json" \
  -d '{"totalUsedGB": 19.81}'
```

### **Opção C: Via Logs**

```bash
ssh root@128.140.45.28
tail -f /var/log/alfalyzer/monitoring/fmp-bandwidth.log
```

---

## ⚠️ ALERTAS E THRESHOLDS

| Status | Threshold | Ação Automática | O Que Fazer |
|--------|-----------|-----------------|-------------|
| **OK** | 0-70% | Nenhuma | Continuar normal |
| **CAUTION** | 70-85% | Nenhuma | Monitorizar de perto |
| **WARNING** | 85-95% | Header warning | Reduzir calls não-essenciais |
| **CRITICAL** | 95-100% | **Circuit breaker ativa** | **Esperar próximo dia** |

---

## 🔧 BANDWIDTH ESTIMATES POR REQUEST TYPE

```typescript
'analyst-estimates-opt': 0.8 KB   // Com gzip + selective fields
'cash-flow': 10 KB
'company-profile': 5 KB
'quote': 2 KB
'historical': 15 KB
'earnings-calendar': 20 KB
```

---

## 🎯 BENEFÍCIOS DO SISTEMA

✅ **Previne spikes** → Circuit breaker bloqueia automaticamente
✅ **Alerta precoce** → Warning a 85% (antes de exceder)
✅ **Visibilidade** → Dashboard real-time de usage
✅ **Tracking histórico** → Last 7 days para análise
✅ **Auto-recovery** → Reset automático à meia-noite UTC
✅ **Zero downtime** → Fail-open em caso de erro do middleware

---

## 📋 MANUTENÇÃO DIÁRIA (2 minutos)

```bash
# 1. Check status
curl -s https://128.140.45.28.sslip.io/api/bandwidth/stats | jq '.data.daily'

# 2. Se >= 85%, atualizar do FMP dashboard
curl -X POST https://128.140.45.28.sslip.io/api/bandwidth/manual-update \
  -H "Content-Type: application/json" \
  -d '{"totalUsedGB": <valor_do_fmp>}'

# 3. Ver histórico
curl -s https://128.140.45.28.sslip.io/api/bandwidth/history | jq '.data'
```

---

## 🚨 TROUBLESHOOTING

### **Problema: Circuit breaker ativou prematuramente**

```bash
# 1. Ver stats atuais
curl https://128.140.45.28.sslip.io/api/bandwidth/stats

# 2. Se falso positivo, ajustar threshold temporariamente
# server/middleware/bandwidth-protection.ts
const CRITICAL_THRESHOLD = 0.98; // Era 0.95

# 3. Rebuild + deploy
npm run build:server && npm run deploy:server
```

### **Problema: Estimates muito altos**

```bash
# Ajustar estimates em bandwidth-protection.ts
const BANDWIDTH_ESTIMATES = {
  'analyst-estimates-opt': 0.5, // Reduzir se gzip muito eficaz
  ...
};
```

### **Problema: Redis tracking não funciona**

```bash
# Verificar Redis
ssh root@128.140.45.28
redis-cli -a alfalyzer2025redis --no-auth-warning

# Verificar keys
KEYS bandwidth:*

# Ver value de hoje
GET bandwidth:daily:2025-10-24
```

---

## ✅ CONCLUSÃO

**Nunca mais vais ter bandwidth spikes!**

Este sistema garante:
1. **Visibilidade** → Sabes sempre quanto bandwidth estás a usar
2. **Controlo** → Circuit breaker previne exceder limite
3. **Alertas** → Warning antes de atingir CRITICAL
4. **Recovery** → Auto-reset diário

**Total implementation time:** ~20 minutos
**Maintenance time:** ~2 minutos/dia (opcional, se >= 85%)

---

**Próximo passo:** Agora que tens proteção de bandwidth, podes implementar **Opção C (Event-Driven Hybrid)** com segurança! 🚀
