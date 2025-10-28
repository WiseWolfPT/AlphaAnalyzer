# Alfalyzer → StockOracle Alignment Plan
**Date:** October 23, 2025 19:30 UTC
**Status:** 📋 **READY FOR IMPLEMENTATION**

---

## 🎯 DESCOBERTA PRINCIPAL

**StockOracle tem 11 MÉTODOS (não 12):**
1. DCF-20 (Operating Cash Flow)
2. DFCF-20 (Free Cash Flow)
3. DNI-20 (Net Income)
4. DFCF Terminal (Free Cash Flow)
5. Mean Price to Sales (PS) Ratio
6. Mean Price to Earnings (PE) Ratio Without NRI
7. Mean Price to Book (PB) Ratio
8. Price to Sales Growth (PSG) Ratio
9. Price to Earnings Growth (PEG) Ratio Without NRI
10. OracleValue™ (Proprietary)
11. Custom (User-configurable com dropdown "Based On")

**O 12º "método"** era na verdade o campo "Based On" dentro do Custom method!

---

## 📊 ANÁLISE: ALFALYZER (19) vs STOCKORACLE (11)

### Alfalyzer Atual (19 métodos)

**✅ Tem (e StockOracle também):**
1. AlfaValue™ → Similar a OracleValue™
2. DCF-20 Operating Cash Flow → DCF-20 ✅
3. DCF-20 Free Cash Flow → DFCF-20 ✅
4. DCF-20 Net Income → DNI-20 ✅
5. DFCF Terminal (FMP) → DFCF Terminal ✅
6. Mean P/S → Mean PS Ratio ✅
7. Mean P/E → Mean PE Ratio Without NRI ⚠️ (só "without NRI")
8. Mean P/B → Mean PB Ratio ✅
9. PEG Ratio → PEG Ratio Without NRI ⚠️ (só "without NRI")
10. PSG Ratio → PSG Ratio ✅

**❌ Tem (mas StockOracle NÃO tem):**
11. DFCF-20 (FMP) → Duplicado?
12. P/E **Median** 5Y → ❌ Não está no dropdown SO
13. P/E Median 5Y (without NRI) → ❌ Não está no dropdown SO
14. P/S **Median** 5Y → ❌ Não está no dropdown SO
15. P/B **Median** 5Y → ❌ Não está no dropdown SO
16. P/B Median 5Y (without NRI) → ❌ Não está no dropdown SO
17. P/E Mean 5Y (without NRI) → ❌ Duplicado? SO só tem "without NRI"
18. P/B Mean 5Y (without NRI) → ❌ Duplicado? SO só tem normal
19. DNI-20 → ❌ Duplicado? SO já tem

**🆕 NÃO Tem (mas StockOracle TEM):**
- Custom method com dropdown "Based On" selecionável

---

## 🚨 DESCOBERTAS CRÍTICAS

### 1. StockOracle usa APENAS Mean (não Median) no dropdown

**Observação importante:**
- Dropdown: Só tem Mean methods
- Tabela "Other Valuation Ratios": Mostra Median **mas não é selecionável**
- Median é display-only, não é método interativo

**Implicação:** Remover 5-6 métodos Median do Alfalyzer = alinhamento total

### 2. "Without NRI" Pattern

**StockOracle:**
- Mean P/E Ratio **Without NRI** ← Só este
- PEG Ratio **Without NRI** ← Só este
- Mean P/S: **SEM** "without NRI" variant
- Mean P/B: **SEM** "without NRI" variant

**Alfalyzer:**
- Tem "without NRI" para P/E, P/B (mas não para P/S)
- Inconsistente com StockOracle

### 3. DCF-20 Bug Confirmado

**StockOracle (AAPL):**
- Growth Y1-5: **10.07%** ✅
- Growth Y6-10: **7.26%** ✅
- Growth Y11-20: **4.00%** ✅

**Alfalyzer (AAPL - DCF-20 FCF):**
- Growth Y1-5: **0%** ❌
- Growth Y6-10: **0%** ❌
- Growth Y11-20: **0%** ❌

**Root Cause:** Backend hardcoded zeros (já identificado)

### 4. "Based On" Field é FUNCIONAL, não apenas display

**StockOracle:**
- DCF-20: "Based On" = Operating Cash Flow (fixo)
- DFCF-20: "Based On" = Free Cash Flow (fixo)
- DNI-20: "Based On" = Net Income (fixo)
- Custom: "Based On" = Dropdown selecionável ⚡

**Implicação P0:** Alfalyzer precisa garantir que "Based On" determina qual metric buscar da API

---

## 📋 PLANO DE ALINHAMENTO (3 FASES)

### FASE 0: P0 Bug Fix (URGENTE - 2-3 horas)

**Problema:** DCF-20 methods têm growth rates = 0%

**Solução:**
```typescript
// File: server/controllers/iv-chart-controller.ts
// Lines: 212-229

// ANTES (buggy):
growth_rate_y1_5: 0,
growth_rate_y6_10: 0,
growth_rate_y11_20: 0,

// DEPOIS (corrected):
// Use AlfaValue™ growth rates como fallback
const alfaValue = await valuationService.getAlfaValue(ticker);
growth_rate_y1_5: alfaValue.growthY1_5 || 10,  // Default 10%
growth_rate_y6_10: alfaValue.growthY6_10 || 7,   // Default 7%
growth_rate_y11_20: alfaValue.growthY11_20 || 4, // Default 4%
```

**Métodos afetados (4):**
1. DCF-20 Free Cash Flow
2. DCF-20 Operating Cash Flow
3. DCF-20 Net Income
4. DFCF Terminal/20 (FMP)

**Validação:**
```bash
# Testar AAPL após fix
curl https://128.140.45.28.sslip.io/api/iv/AAPL/chart | \
  jq '.methods[] | select(.method_id == "dcf-20-fcf") | .inputs.growth_rate_y1_5'
# Expected: ~0.10 (não 0)
```

---

### FASE 1: Remover Métodos Median (1-2 horas)

**Ação:** Remover 5-6 métodos Median do dropdown

**Métodos a REMOVER:**
1. ❌ P/E Median 5Y
2. ❌ P/E Median 5Y (without NRI)
3. ❌ P/S Median 5Y
4. ❌ P/B Median 5Y
5. ❌ P/B Median 5Y (without NRI)

**Manter apenas Mean:**
1. ✅ Mean P/E 5Y (without NRI)
2. ✅ Mean P/S 5Y
3. ✅ Mean P/B 5Y

**Impacto:**
- 19 métodos → 14 métodos
- Alinhamento com StockOracle
- Menos confusão para utilizadores

**Opcional:** Mostrar Median na tabela "Other Valuation Ratios" (display-only, como SO)

---

### FASE 2: Ajustar "Without NRI" Variants (30 min)

**StockOracle Pattern:**
- Mean P/E: **Without NRI** apenas
- Mean P/S: **SEM** "without NRI"
- Mean P/B: **SEM** "without NRI"
- PEG: **Without NRI** apenas
- PSG: **SEM** "without NRI"

**Ação:**
1. Renomear "Mean P/E 5Y" → "Mean P/E 5Y (without NRI)"
2. Remover "P/E Mean 5Y (without NRI)" duplicado
3. Remover "P/B Mean 5Y (without NRI)"
4. Manter "PEG Ratio" → "PEG Ratio (without NRI)"

**Resultado:**
- Consistente com StockOracle
- 14 métodos → 12 métodos

---

### FASE 3: Adicionar Custom Method (2-3 horas)

**Feature:** Método "Custom" com dropdown "Based On" selecionável

**Características:**
1. **Dropdown "Based On":**
   - Operating Cash Flow
   - Free Cash Flow
   - Net Income

2. **Todos os inputs editáveis** (como "My Calculation" mode)

3. **Save/Load functionality** (opcional)

4. **Note field** para anotações do utilizador

**Implementação:**
```typescript
// Frontend: intrinsic-value.tsx
if (selectedMethod === 'custom') {
  return (
    <>
      <Select
        label="Based On"
        value={basedOn}
        onChange={setBasedOn}
        options={[
          { value: 'ocf', label: 'Operating Cash Flow' },
          { value: 'fcf', label: 'Free Cash Flow' },
          { value: 'ni', label: 'Net Income' }
        ]}
      />
      <FinancialInputsDynamic
        inputs={mappedInputs}
        mode="manual"
        onInputChange={handleCustomInputChange}
      />
      <Textarea label="Note" value={note} onChange={setNote} />
      <Button onClick={calculateCustom}>Calculate</Button>
    </>
  );
}
```

**Resultado:**
- 12 métodos → 13 métodos (alinhamento total com 11 SO + AlfaValue + Custom)

---

## 🎯 RESULTADO FINAL

### Métodos Finais Alfalyzer (13 total)

**1. Proprietary (1 método):**
1. AlfaValue™ (equivalente a OracleValue™)

**2. DCF Methods (4 métodos):**
2. DCF-20 (Operating Cash Flow)
3. DFCF-20 (Free Cash Flow)
4. DNI-20 (Net Income)
5. DFCF Terminal (Free Cash Flow)

**3. Mean Multiples (3 métodos):**
6. Mean Price to Sales (PS) Ratio
7. Mean Price to Earnings (PE) Ratio Without NRI
8. Mean Price to Book (PB) Ratio

**4. Growth-Adjusted (2 métodos):**
9. Price to Sales Growth (PSG) Ratio
10. Price to Earnings Growth (PEG) Ratio Without NRI

**5. FMP Methods (2 métodos - opcional manter):**
11. DFCF-20 (FMP) ← Considerar remover (duplicado?)
12. DNI-20 (FMP) ← Considerar remover (duplicado?)

**6. Custom (1 método):**
13. Custom (User-configurable com dropdown "Based On")

---

## 📊 COMPARAÇÃO FINAL

| Aspecto | Alfalyzer Atual | StockOracle | Alfalyzer Alinhado |
|---------|-----------------|-------------|-------------------|
| **Total Métodos** | 19 | 11 | 13 (11 SO + AlfaValue + Custom) |
| **Mean Methods** | 6 | 3 | 3 ✅ |
| **Median Methods** | 6 | 0 (display only) | 0 ✅ |
| **DCF Methods** | 5-6 | 4 | 4 ✅ |
| **Growth Methods** | 2 | 2 | 2 ✅ |
| **Without NRI** | 4 inconsistentes | 2 (P/E, PEG) | 2 ✅ |
| **Custom Method** | ❌ Não tem | ✅ Tem | ✅ Implementar |
| **Growth Rates Bug** | ❌ 0% hardcoded | ✅ 10%, 7%, 4% | ✅ Fix P0 |

---

## 🚀 IMPLEMENTAÇÃO SEQUENCIAL

### Step 1: P0 Bug Fix (HOJE - 2-3h)
```bash
# 1. Fix growth rates no backend
# 2. Build & deploy
npm run build:server
npm run deploy:server

# 3. Test AAPL
curl https://128.140.45.28.sslip.io/api/iv/AAPL/chart | \
  jq '.methods[] | select(.method_id == "dcf-20-fcf")'

# 4. Validate growth rates ≠ 0
```

### Step 2: Remove Median (AMANHÃ - 1-2h)
```bash
# 1. Frontend: Remove Median from dropdown
# File: client/src/pages/intrinsic-value.tsx
# Remove: pe-median-5y, ps-median-5y, pb-median-5y

# 2. Backend: Keep calculations (for "Other Ratios" table)
# File: server/controllers/iv-chart-controller.ts
# Keep methods but don't expose in main dropdown

# 3. Deploy
npm run deploy

# 4. Validate 19 → 14 methods in dropdown
```

### Step 3: Adjust NRI Variants (AMANHÃ - 30min)
```bash
# 1. Rename methods to match StockOracle
# 2. Remove duplicates
# 3. Deploy
# 4. Validate 14 → 12 methods
```

### Step 4: Add Custom Method (PRÓXIMA SEMANA - 2-3h)
```bash
# 1. Add Custom method component
# 2. Implement "Based On" dropdown
# 3. Add save/load (optional)
# 4. Deploy
# 5. Validate 12 → 13 methods
```

---

## ✅ SUCCESS CRITERIA

**P0 (Crítico):**
- [ ] DCF-20 growth rates ≠ 0%
- [ ] AAPL DCF-20 IV matches expected range ($143-162)
- [ ] All 4 DCF methods functional

**Phase 1:**
- [ ] Median methods removed from dropdown
- [ ] 19 → 14 methods
- [ ] No JavaScript errors

**Phase 2:**
- [ ] "Without NRI" consistent with StockOracle
- [ ] 14 → 12 methods
- [ ] Method naming aligned

**Phase 3:**
- [ ] Custom method with "Based On" dropdown
- [ ] Fully editable inputs
- [ ] 12 → 13 methods

**Final:**
- [ ] 13 methods total (11 SO + AlfaValue + Custom)
- [ ] 100% alignment with StockOracle structure
- [ ] All methods functional and tested

---

## 📚 REFERÊNCIAS

**StockOracle Analysis:**
- Complete report: `/tmp/stockoracle-intrinsic-value-complete-analysis.md`
- Screenshots: 8 files in `/tmp/`
- Test symbol: AAPL
- Date: 2025-10-23

**Alfalyzer Bugs:**
- CRITICAL_FINDINGS_2025-10-23.md
- VALUATION_METHODS_TEST_REPORT_2025-10-23.md

**Deployment:**
- DEPLOYMENT_CONFIRMATION_2025-10-23.md
- PROJECT_STATUS_2025-10-23.md

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Agora (P0):** Lançar agente para fix DCF-20 growth rates
2. **Validar:** Testar 4 métodos DCF com AAPL
3. **Deploy:** Push to production
4. **Verificar:** Chrome DevTools validation

**Decisão para ti:**
- Queres implementar TODAS as 4 fases?
- Ou só P0 (bug fix) por agora?
- Custom method é prioridade?

---

**Status:** 📋 READY FOR IMPLEMENTATION
**Estimated Total Time:** 6-10 hours (todas as fases)
**P0 Only:** 2-3 hours (bug fix crítico)
