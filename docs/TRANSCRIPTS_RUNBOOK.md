# Transcripts Worker - Runbook Operacional

**Last Updated:** 2025-10-09
**Status:** Active (Event-Driven Discovery)

---

## Quick Reference

**Status Check (30 seconds):**
```bash
ssh root@128.140.45.28
pm2 list | grep transcripts-worker
pm2 logs transcripts-worker --lines 10 | grep "bandwidth report"
```

**Expected Output:**
- Status: `online` (green)
- Uptime: Stable (no frequent restarts)
- Last bandwidth: `✅ OK` (not `🚨 EXCEEDED`)

---

## Monitorização Semanal (5 min)

Execute todas as segundas-feiras às 10h:

```bash
# 1. Health check
ssh root@128.140.45.28
pm2 list | grep transcripts-worker

# 2. Últimos 10 ciclos
pm2 logs transcripts-worker --lines 500 --nostream | grep "bandwidth report" | tail -10

# 3. Validação completa
cd "/home/teste 1"
bash scripts/monitoring/validate-first-cycle.sh
```

**Success Criteria:**
- ✅ Worker: online
- ✅ API calls/ciclo: 1-25 (calendar-driven)
- ✅ Bandwidth status: "✅ OK"
- ✅ Errors: 0

---

## Alertas & Troubleshooting

### ⚠️ fmpApiCalls > 50 num ciclo

**Sintoma:** Log mostra `"fmpApiCalls": 75` (acima do esperado 1-25)

**Causa provável:** Earnings season spike (muitos eventos no calendar)

**Ação:**
1. Ver logs completos: `pm2 logs transcripts-worker --lines 200 --nostream`
2. Contar events: `grep "Calendar-driven cycle complete" | tail -1`
3. Se events >50: Normal durante earnings season
4. Se events <30 mas calls >50: Bug na lógica → investigar

**Decisão:**
- Events 30-100: Aceitável (earnings spike temporário)
- Events >100: Subir `MAX_FMP_CALLS_PER_CYCLE` para 150 temporariamente

---

### 🚨 status: "🚨 EXCEEDED"

**Sintoma:** Bandwidth report mostra `"status": "🚨 EXCEEDED"`

**Causa:** Limite de 100 calls/ciclo ultrapassado

**Ação IMEDIATA (5 min):**
```bash
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"
# Alterar: TRANSCRIPTS_SOURCE=none
pm2 restart transcripts-worker --update-env
pm2 logs transcripts-worker --lines 200 --nostream > /tmp/exceeded-$(date +%Y%m%d-%H%M%S).log
```

**Investigação (30 min):**
1. Analisar logs salvos em `/tmp/exceeded-*.log`
2. Identificar causa raiz:
   - Bug no calendar fetch? (events muito alto)
   - PostgreSQL cache failing? (muitos re-fetches)
   - Guard bypass? (proteções não funcionando)
3. Corrigir código se bug encontrado
4. Testar em local antes de reativar

---

### Worker crashando (status: errored)

**Sintoma:** `pm2 list` mostra status `errored`, uptime resetando frequentemente

**Ação:**
```bash
ssh root@128.140.45.28
pm2 logs transcripts-worker --err --lines 100 --nostream

# Procurar por stack traces
pm2 logs transcripts-worker --lines 500 --nostream | grep -A 10 "Error:"
```

**Causas comuns:**
1. **ENOENT filesystem errors:** Logs directory missing
   - Fix: `mkdir -p /home/teste\ 1/logs`
2. **Redis connection refused:** Redis down
   - Check: `redis-cli -a alfalyzer2025redis PING`
3. **OpenAI 401:** API key invalid/expired
   - Verify: Check `.env.production` has valid key
4. **PostgreSQL connection timeout:** PG overloaded
   - Check: `pm2 logs transcripts-worker | grep "ETIMEDOUT"`

**Restart procedure after fix:**
```bash
pm2 restart transcripts-worker --update-env
pm2 save
sleep 10
pm2 logs transcripts-worker --lines 20
```

---

### AI summaries não processam

**Sintoma:** Transcripts aparecem mas ai_summary = null

**Diagnóstico:**
```bash
ssh root@128.140.45.28

# 1. Check Redis queue
redis-cli -a alfalyzer2025redis LLEN transcript_queue

# 2. Check processing queue (should be empty)
redis-cli -a alfalyzer2025redis LLEN transcript_processing

# 3. Check DLQ (should be empty)
redis-cli -a alfalyzer2025redis LLEN transcript_dlq
```

**Interpretação:**
- Queue >20, Processing = 0: AI worker parado → restart worker
- Processing >5 (stuck): Janitor não limpando → manual cleanup
- DLQ >0: OpenAI failures → check API key/credits

**Manual queue cleanup:**
```bash
# Re-enqueue stuck tasks (if processing >5 for >10min)
redis-cli -a alfalyzer2025redis RPOPLPUSH transcript_processing transcript_queue
```

**OpenAI validation:**
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.data[0].id'

# Expected: "gpt-4o-mini" or similar
```

---

### Frontend não mostra novos transcripts

**Sintoma:** /transcripts page não atualiza após ingest

**Diagnóstico:**
```bash
# 1. Test API endpoint
curl -s 'https://128.140.45.28.sslip.io/api/transcripts?limit=5' | jq

# 2. Check if transcripts exist in DB
ssh root@128.140.45.28
# (Query PostgreSQL or check logs for "ingested: X")

# 3. Test Redis cache
redis-cli -a alfalyzer2025redis KEYS "transcripts:*"
```

**Causas comuns:**
1. **Cache not invalidated:** Redis keys stale
   - Fix: `redis-cli -a alfalyzer2025redis DEL transcripts:latest`
2. **API returns old data:** Backend serving cached response
   - Fix: Restart backend `pm2 restart alfalyzer`
3. **Frontend not fetching:** React query stale
   - Fix: Hard refresh browser (Ctrl+Shift+R)

---

## Manutenção Mensal (15 min)

Execute na primeira segunda-feira de cada mês:

### 1. FMP Bandwidth Review
- Login: https://site.financialmodelingprep.com/
- Dashboard → Usage → Bandwidth
- Verificar: Current month usage <2 GB
- Projeção: (Usage/Days) × 30 < 2 GB

**Se bandwidth >15 GB:**
- Investigar spike (logs do mês)
- Confirmar guards funcionando
- Considerar aumentar intervalo para 2h

---

### 2. PostgreSQL Growth
```bash
ssh root@128.140.45.28
sudo -u postgres psql alfalyzer_db

SELECT
  COUNT(*) as total_transcripts,
  pg_size_pretty(pg_total_relation_size('transcripts')) as table_size
FROM transcripts;
```

**Expected:**
- Growth: ~100-200 transcripts/mês
- Size: ~10-20 MB/mês

**If size >500 MB:**
- Consider archival of transcripts >2 years old
- Compress old raw_transcript fields

---

### 3. OpenAI Credits
- Login: https://platform.openai.com/usage
- Verify: Credits remaining >$5
- Review: Monthly spend <$10

**If spend >$20/mês:**
- Check DLQ for retry loops
- Verify no duplicate processing
- Consider reducing max_tokens from 800 to 500

---

### 4. Logs Cleanup
```bash
ssh root@128.140.45.28
# PM2 logs auto-rotate, but check size
du -sh ~/.pm2/logs/

# If >500 MB, manual cleanup
pm2 flush
```

---

## Emergências

### Bandwidth FMP excedendo (>18 GB)

**CRITICAL - Execute imediatamente:**
```bash
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"
# TRANSCRIPTS_SOURCE=none
pm2 restart transcripts-worker --update-env
```

**Aguardar reset mensal:** Dia 1 do próximo mês
**Antes de reativar:** Investigar causa raiz, corrigir, testar local

---

### PostgreSQL disk full

**Worker para automaticamente** se disk >90%

**Recovery:**
```bash
# 1. Free space
ssh root@128.140.45.28
df -h  # Check usage

# 2. Cleanup options
rm -rf /var/log/nginx/access.log.*  # Old nginx logs
pm2 flush  # PM2 logs

# 3. Archive transcripts
# (Script TBD - compress transcripts >1 year old)
```

---

### OpenAI quota exceeded

**Sintoma:** DLQ filling up, errors "RateLimitError"

**Impacto:** Summaries pausam (transcripts continuam)

**Fix:**
1. Adicionar crédito: https://platform.openai.com/account/billing
2. Wait 5-10 min for quota restore
3. Summaries processam automaticamente após restore

**Temporary workaround (if urgent):**
- Pausar AI: Comment out `aiWorkerLoop()` in startWorkers()
- Deploy: `npm run build:server && npm run deploy:server`
- Resume após quota fix

---

## Performance Baselines

**Normal Operation (calendar-driven):**
- Cycles/hour: 1
- Events/cycle: 5-30
- API calls/cycle: 1-25
- Ingested/cycle: 0-5
- Bandwidth/cycle: 0.1-0.8 MB
- Processing time: 2-5 min
- Memory: 70-100 MB

**Earnings Season (spike):**
- Events/cycle: 30-100
- API calls/cycle: 25-75
- Ingested/cycle: 10-40
- Bandwidth/cycle: 0.8-2.5 MB

**Red Flags:**
- API calls >100 (guard failure)
- Ingested >50 (calendar bug)
- Memory >200 MB (leak)
- Restarts >5/hour (crash loop)

---

## Deployment Checklist

Antes de deploy de mudanças no transcripts-worker:

- [ ] Testes locais com TRANSCRIPTS_SOURCE=local:mock
- [ ] Validar guards em fetchFmpCalendarWindow
- [ ] Validar guards em fetchFmpTranscript
- [ ] Confirmar gzip headers presentes
- [ ] Build: `npm run build:server`
- [ ] Deploy: tar+scp method (não rsync)
- [ ] Backup: `/tmp/server-backup-$(date).tar.gz`
- [ ] Restart: `pm2 restart transcripts-worker --update-env`
- [ ] Monitor: primeiro ciclo completo (stream logs)
- [ ] Validar: `bash scripts/monitoring/validate-first-cycle.sh`

---

## Contacts & Escalation

**Primary:** Development team
**Escalation:** If bandwidth >18 GB or worker down >4 hours
**Documentation:** /Users/antoniofrancisco/Documents/teste 1/FASE4_EXECUTION_PROMPT.md

---

**Version:** 1.0
**Last Review:** 2025-10-09
