# FASE 3 - Análise Completa StockOracle vs Alfalyzer

**Data:** 2025-10-20
**Objetivo:** Implementar UI/UX e funcionalidades completas do StockOracle no Alfalyzer

---

## 🎯 GAP ANALYSIS

### ✅ O que JÁ TEMOS (Alfalyzer atual):
1. Card "Compare All Valuation Methods" ✅
2. Toggle button (Show/Hide Methods) ✅
3. Valuation Gauge (semicircular, único) ✅
4. Valuation Methods Chart (horizontal bars) ✅
5. Backend com 7 métodos implementados ✅
6. API endpoint `/api/iv/:ticker/chart` ✅
7. Selector "DCF Base Metric" (FCF/OCF/NI) ✅

### ❌ O que FALTA IMPLEMENTAR:

#### 1. **Dropdown com TODOS os Métodos** (CRÍTICO)
**Atual:** Apenas 3 opções (FCF, OCF, NI)
**Necessário:** 14+ métodos completos

**Lista Completa de Métodos:**

##### DCF Models (4):
- [x] Discounted Cash Flow 20-year (DCF-20) - **JÁ TEMOS**
- [ ] Discounted Net Income 20-year (DNI-20) - **FALTA**
- [ ] Discounted Free Cash Flow Terminal (DFCF-Terminal) - **FALTA** (FMP externo)
- [x] Discounted Free Cash Flow 20-year (DFCF-20) - **JÁ TEMOS** (FMP externo)

##### Historical Multiples - Mean (4):
- [x] Mean Price to Earnings (PE) Value - **JÁ TEMOS**
- [ ] Mean Price to Earnings (PE) Value without NRI - **FALTA**
- [x] Mean Price to Sales (PS) Value - **JÁ TEMOS**
- [ ] Mean Price to Book (PB) Value - **FALTA**

##### Historical Multiples - Median (4):
- [ ] Median Price to Earnings (PE) Value - **FALTA**
- [ ] Median Price to Earnings (PE) Value without NRI - **FALTA**
- [ ] Median Price to Sales (PS) Value - **FALTA**
- [ ] Median Price to Book (PB) Value - **FALTA**

##### Growth-Adjusted (2):
- [x] PEG Ratio - **JÁ TEMOS**
- [x] PSG Ratio - **JÁ TEMOS**

##### Proprietary (1):
- [x] AlfaValue™ - **JÁ TEMOS**

**Total:** 15 métodos (7 já implementados, 8 em falta)

---

#### 2. **Layout Auto vs My Calculation** (CRÍTICO)
**Atual:** Apenas 1 coluna de resultado
**Necessário:** 2 colunas lado-a-lado

```
┌────────────────────────┬────────────────────────┐
│   Auto Calculation     │   My Calculation       │
│   (Read-only)          │   (Editable)           │
├────────────────────────┼────────────────────────┤
│   Gauge (Auto)         │   Gauge (Custom)       │
│   Stock Price: $252.29 │   Stock Price: $252.29 │
│   IV: $162.50          │   IV: $162.50          │
│   Premium: 55.26%      │   Premium: 55.26%      │
├────────────────────────┼────────────────────────┤
│   Financial Inputs     │   Editable Inputs      │
│   (disabled)           │   (spinbuttons)        │
└────────────────────────┴────────────────────────┘
```

---

#### 3. **Campos Financeiros Visíveis** (IMPORTANTE)

**StockOracle mostra:**
- Operating Cash Flow / Free Cash Flow / Net Income (based on method)
- Total Debt (excl. Lease Obligations) + checkbox "Deduct from IV"
- Cash & ST Investments + checkbox "Add to IV"
- Discount Rate (%)
- Shares Outstanding
- Growth Rate (Year 1-5) %
- Growth Rate (Year 6-10) %
- Growth Rate (Year 11-20) %

**Alfalyzer atual:**
- Mostra alguns nos cards educacionais, mas NÃO no comparador

**Necessário:**
- Adicionar TODOS estes campos no layout "Auto Calculation" (read-only)
- Adicionar TODOS estes campos no layout "My Calculation" (editable com spinbuttons)

---

#### 4. **Gauges Lado-a-Lado** (IMPORTANTE)

**Atual:** 1 gauge único
**Necessário:** 2 gauges (Auto vs My)

**Design:**
- Gauge esquerdo: Auto Calculation (valores automáticos)
- Gauge direito: My Calculation (valores editados pelo user)
- Ambos com labels "Undervalued / Overvalued"
- Pointer dinâmico baseado no discount %

---

#### 5. **Botões Save/Load** (NICE-TO-HAVE)

**StockOracle tem:**
- Botão "Save" (salvar cálculo customizado)
- Botão "Load" (carregar cálculo salvo)

**Necessário:**
- Implementar localStorage para salvar/carregar assumptions customizadas
- UI com 2 botões ao lado do gauge "My Calculation"

---

#### 6. **Botão Calculate** (IMPORTANTE)

**StockOracle tem:**
- Botão "Calculate" no final do form "My Calculation"
- Recalcula IV quando user edita inputs

**Necessário:**
- Adicionar botão "Calculate"
- Trigger recalculation da API com novos params

---

## 🛠️ PLANO DE IMPLEMENTAÇÃO

### Fase 3.1 - Backend (1 dia)
**Responsável:** Backend Architect Agent

**Tasks:**
1. Implementar DNI-20 (Discounted Net Income 20-year)
2. Implementar P/B Mean (Price to Book Mean)
3. Implementar P/B Median
4. Implementar P/E Median
5. Implementar P/S Median
6. Implementar P/E without NRI (Mean e Median)
7. Adicionar endpoint POST `/api/iv/:ticker/calculate` para cálculos customizados
8. Atualizar endpoint GET `/api/iv/:ticker/chart` para retornar TODOS os 15 métodos

**Entregáveis:**
- 8 novos métodos de valuation
- Endpoint POST para cálculos customizados
- Response com 15 métodos totais

---

### Fase 3.2 - Frontend Refactor (1 dia)
**Responsável:** Frontend React Specialist Agent

**Tasks:**
1. Refatorar layout para 2 colunas (Auto vs My)
2. Criar dropdown com 15 métodos completos
3. Adicionar 2 gauges lado-a-lado
4. Implementar formulário "My Calculation" com spinbuttons
5. Adicionar checkboxes "Deduct from IV" / "Add to IV"
6. Implementar botão "Calculate" com API call
7. Implementar Save/Load com localStorage
8. Adicionar todos os campos financeiros visíveis

**Componentes Novos:**
- `<IntrinsicValueDualLayout>` (2 colunas)
- `<MethodSelector>` (dropdown com 15 opções)
- `<DualGauges>` (2 gauges lado-a-lado)
- `<MyCalculationForm>` (formulário editável)
- `<FinancialInputs>` (spinbuttons + checkboxes)

**Entregáveis:**
- Layout completo Auto vs My
- Dropdown com 15 métodos
- Formulário editável funcional
- Save/Load implementado

---

### Fase 3.3 - Testing & Polish (0.5 dia)
**Responsável:** QA Automation Engineer Agent

**Tasks:**
1. Testar todos os 15 métodos com AAPL
2. Validar cálculos customizados (My Calculation)
3. Testar Save/Load functionality
4. Validar UI responsivo (desktop + mobile)
5. Verificar performance (API calls otimizados)

**Entregáveis:**
- Relatório de testes completo
- Screenshots de todos os métodos
- Validation report

---

## 📊 DADOS NECESSÁRIOS (Backend)

### Novos Endpoints/Métodos:

**1. DNI-20 (Discounted Net Income 20-year):**
```typescript
// Similar a DCF-20 mas usa Net Income em vez de FCF
// Fórmula: IV = Σ(NI_t / (1 + WACC)^t) + (Cash - Debt) / Shares
```

**2. P/B Mean & Median:**
```typescript
// Price to Book Ratio histórico (5 anos)
// IV = Mean/Median P/B Ratio × Book Value per Share
```

**3. P/E Mean/Median without NRI:**
```typescript
// P/E excluindo Non-Recurring Items
// IV = Mean/Median P/E (ex-NRI) × EPS (ex-NRI)
```

**4. Median Variants:**
```typescript
// Calcular mediana em vez de média dos ratios históricos
// Mais robusto a outliers
```

---

## 🎨 UI/UX MOCKUP

### Layout Final (Intrinsic Value Page):

```
┌─────────────────────────────────────────────────────────┐
│  Compare All Valuation Methods                [Hide]    │
├─────────────────────────────────────────────────────────┤
│  Method: [Dropdown - 15 opções ▼]                       │
│  Based On: [Free Cash Flow ▼]                           │
├────────────────────────┬────────────────────────────────┤
│   AUTO CALCULATION     │   MY CALCULATION     [Save][Load]│
├────────────────────────┼────────────────────────────────┤
│   Stock Price: $252.29 │   Stock Price: $252.29         │
│   IV: $162.50          │   IV: $162.50 (editable result)│
│   Premium: 55.26%      │   Premium: 55.26%              │
├────────────────────────┼────────────────────────────────┤
│   [Gauge - Auto]       │   [Gauge - Custom]             │
│   Undervalued ← → Over │   Undervalued ← → Overvalued   │
├────────────────────────┼────────────────────────────────┤
│ Operating CF: 108,565M │ OCF: [108565] (spinner)        │
│ Total Debt: 101,698M   │ Debt: [101698] ☑ Deduct       │
│ Cash: 55,372M          │ Cash: [55372] ☑ Add            │
│ Discount Rate: 6.27%   │ Rate: [6.27%] (spinner)        │
│ Shares: 14,948M        │ Shares: [14948] (spinner)      │
│ Growth 1-5: 10.07%     │ Growth 1-5: [10.07%] (spinner) │
│ Growth 6-10: 7.26%     │ Growth 6-10: [7.26%] (spinner) │
│ Growth 11-20: 4%       │ Growth 11-20: [4%] (spinner)   │
│                        │                                 │
│                        │         [Calculate Button]      │
└────────────────────────┴────────────────────────────────┘
│                                                           │
│  [Valuation Methods Chart - Horizontal Bars - 15 métodos]│
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 CRONOGRAMA

**Fase 3.1 - Backend:** 1 dia (20 Oct PM)
**Fase 3.2 - Frontend:** 1 dia (21 Oct)
**Fase 3.3 - Testing:** 0.5 dia (21 Oct PM)

**TOTAL:** 2.5 dias

**Deadline FASE 3 Completa:** 21 Outubro 2025, 18:00 UTC

---

## ✅ CRITÉRIOS DE SUCESSO

1. ✅ Dropdown com 15 métodos de valuation
2. ✅ Layout Auto vs My Calculation (lado-a-lado)
3. ✅ 2 gauges funcionando (Auto + Custom)
4. ✅ Formulário editável com spinbuttons
5. ✅ Botão Calculate funcional
6. ✅ Save/Load com localStorage
7. ✅ Todos os 15 métodos retornando dados corretos
8. ✅ Chart horizontal com 15 barras
9. ✅ Performance < 500ms para cálculos
10. ✅ UI responsivo (desktop + mobile)

---

**Próximo Passo:** Lançar agentes em paralelo para implementar Fase 3.1 (Backend) + Fase 3.2 (Frontend)
