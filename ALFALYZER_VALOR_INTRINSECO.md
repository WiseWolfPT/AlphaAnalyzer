# **📌 Fase 0 – Vocabulário rápido**

- **IV** = intrinsic value por ação.
- **Preço** = last close.
- **Status** =
    - “Undervalued” (verde) se Preço < IV (≥ +5% desconto).
    - “Overvalued” (vermelho) se Preço > IV (≤ –5% premium).
    - “Fairly priced” se –5% < diferença < +5%.
- **TTM** = trailing 12 months.

# **📌 FASE 1 — AlfaValue™ (Main) “engine + header” + Integração no Alfalyzer**

---

## **Objetivo**

Calcular o **AlfaValue™ (valor intrínseco por ação)** e expô-lo no cabeçalho da página da ação com Status (Undervalued / Overvalued / Fair) e % discount/premium.

*(Valuation Chart, Gauge e Calculators só na Fase 2).*

---

## **1) Escopo desta fase**

- Inclui: pipeline de dados, cálculo do IV, endpoints, cache, header UI (valor + status).
- Não inclui: gráficos, calculadoras, IA de insights, macro multiplier.

---

## **2) Entradas & Fontes (automáticas)**

### **FMP Starter (obrigatório)**

- FCF_TTM (fallback: OCF_TTM − CAPEX_TTM)
- Histórico FCF 5y (FY)
- Cash & Short-term investments
- Total Debt (ST+LT)
- Shares Outstanding (diluted)
- Beta (profile.beta do FMP, fallback computed 5y monthly)
- Preço (last close)
- Sector e Industry (para peers)

### **Risk-Free (RF)**

- Fonte: **FMP Treasury Rates API** /stable/treasury-rates
- Usar campo **year10** mais recente → normalizar (ex.: 4.25 → 0.0425)
- Cache: rf:US TTL 24h (SWR)
- Fallback: último cache válido → se inexistente, estático 0.04

### **Market Risk Premium (MRP)**

- Fonte primária: **FMP Market Risk Premium API** /stable/market-risk-premium
- Usar totalEquityRiskPremium para US/North America (ou região correspondente).
- **Coverage:**
    - Validar em lote países/regiões (US, EU, CN, BR, etc.).
    - Guardar em Redis: mrp:coverage:{region} → { covered:true|false, last_checked }.
- Se região não coberta → fallback automático:
    - Fallback 1: scraping mensal de *market-risk-premia.com*
    - Fallback 2: tabela estática (config) ou default 5.0%
- Cache: mrp:{region} TTL 31d (SWR + fallbacks).
- Cascata: override → cache_stale (até +30d) → static → default.

### **Terminal regional (g_term_region)**

- Fonte: **FMP Economic Indicators API** /stable/economic-indicators
- Variáveis:
    - realGDP → YoY growth = (GDP_t / GDP_{t-4q}) − 1
    - CPI ou inflationRate → YoY ou valor anualizado
- Fórmula:

```
g_term_region = clamp(gdp_real_growth + inflation, 3%, 5%)
```

- Cache: g_term_region:{region} TTL 365d
- Fallback: tabela estática (US=4%, EU=3%, CN=5%)

> Nota: Sem macro multiplier nesta fase → m = 1.00
> 

---

## **3) g_sector_mid (baseline setorial)**

**Objetivo:** baseline nominal sustentável por indústria (ou setor) para alimentar o g6_10.

### **Dinâmico por indústria (preferido)**

1. Obter *industry* via Profile (FMP).
2. Listar peers da mesma *industry* (top 20–30 por market cap; excluir microcaps < $500M).
3. Para cada peer (últimos 6 FY):
    - Se ≥20 peers válidos com FCF → usar FCF CAGR 5y
    - Caso contrário → usar Revenue CAGR 5y

```
CAGR = (Value_t / Value_{t-5})^(1/5) − 1
```

- Excluir CAGRs < −20% ou > +40%
- Winsorizar p10–p90 e calcular mediana → g_sector_mid_dynamic
- Clamp final: [2%, 15%]
- Cache: sector:growth:industry:{key} TTL 30d

### **Fallbacks**

- Fallback 1: nível sector
- Fallback 2: tabela Damodaran (estática)

**Escolha final:**

```
g_sector_mid = dynamic_industry ⟫ dynamic_sector ⟫ static_table
```

---

## **4) Fórmulas do AlfaValue™ (com clamps)**

1. **Growth 1–5 (empresa)**

```
g1_5 = CAGR(FCF_5y), clamp[5%, 30%]
```

Fallback: se FCF negativo/errático → usar OCF (ou NI) e marcar WARN.

1. **Growth 6–10 (decay + setor)**

```
decay = 0.70 if g1_5 < 8% else 0.50
g6_10 = clamp(0.6*(g1_5*decay) + 0.4*g_sector_mid , 2%, 20%)
```

1. **Growth 11–20 (terminal dinâmico)**

```
base = lerp(g6_10, g_term_region, 0.7)
g11_20 = clamp(base,
               max(0.03, g_term_region-0.01),
               min(0.05, g_term_region+0.01))
```

1. **Discount Rate (CAPM)**

```
DR = RF + β × MRP , clamp[5%, 15%]
```

1. **Projeção FCF (mid-year discounting)**
- Anos 1–5 → g1_5
- Anos 6–10 → g6_10
- Anos 11–20 → g11_20
- Desconto: (1+DR)^(t−0.5)
1. **Valor Presente (20 anos)**

```
PV = Σ [ FCF_t / (1+DR)^(t−0.5) ] , t=1..20
```

1. **Equity Value**

```
Equity = PV + Cash − Debt
```

1. **AlfaValue™ (por ação)**

```
IV = Equity / Shares
```

1. **Status**

```
Discount% = (IV − Preço) / Preço
```

- Undervalued ≥ +5% (verde)
- Overvalued ≤ −5% (vermelho)
- Fair −5% a +5% (cinza/âmbar)

---

## **5) Atualizações (jobs)**

- **Diário (06:00 UTC):** RF, preço → recalcular DR, IV, Status
- **Mensal:** rebuild g_sector_mid_dynamic; renovar caches; validar coverage do MRP API
- **Trimestral:** atualizar séries FCF/OCF/CAPEX
- **Anual/semestral:** atualizar g_term_region (GDP+inflation)
- **On-demand:** admin override (g6_10, g11_20, MRP)

---

## **6) Endpoints (contratos)**

```
GET /iv/:ticker/main →
{
  "ticker":"TICK",
  "iv":0.00,
  "price":0.00,
  "discount_pct":0.00,
  "status":"undervalued|overvalued|fair",
  "assumptions":{
    "g_1_5":0.00,"g_6_10":0.00,"g_11_20":0.00,
    "discount_rate":0.00,"rf":0.00,"beta":0.00,"mrp":0.00
  },
  "inputs":{
    "fcf_ttm_musd":0.0,"fcf_5y_musd":[...],
    "cash_musd":0.0,"debt_musd":0.0,"shares_m":0.0
  },
  "meta":{
    "g_sector_mid":0.00,"g_sector_source":"dynamic|sector|static",
    "g_term_region":0.04,"region":"US"
  },
  "confidence":"HIGH|MED|LOW",
  "as_of":"YYYY-MM-DD"
}
```

Outros:

- GET /rf?region=US
- GET /mrp?region=US
- GET /gterm?region=US
- GET /sector/growth?industry=…

---

## **7) Cache & Redis keys**

- iv:calc:{ticker} (TTL 24h, SWR)
- sector:growth:industry:{key} (TTL 30d)
- sector:growth:sector:{key} (TTL 30d)
- sector:growth:static:{key} (TTL 365d)
- mrp:{region} (TTL 31d, SWR + fallbacks)
- mrp:coverage:{region} (TTL 30d)
- rf:{region} (TTL 24h)
- g_term_region:{region} (TTL 365d)

---

## **8) Integração no Alfalyzer (Mapa Prático)**

### **Backend (/server)**

- Criar services/valuation-service.ts → implementar lógica AlfaValue™ (usa APIs FMP + Redis).
- Criar controllers/valuation-controller.ts → expõe os endpoints.
- Editar /server/routes/market-data.ts → adicionar rotas /iv/:ticker/main, /rf, /mrp, /gterm.
- Usar Redis já configurado (simple-cache-service.ts).
- Cron jobs → integrar em worker/cache-updater.ts:
    - Diário (RF, preço)
    - Mensal (sector growth, MRP coverage)
    - Trimestral (FCF series)
    - Anual (g_term_region)

### **Frontend (/client)**

- Novo componente: components/stock/AlfaValueHeader.tsx
- Chama GET /iv/:ticker/main
- Mostra: AlfaValue™ (USD, 2 casas), Status, Discount%, Assunções.
- Integrar na página /stock/:ticker (no topo).

---

## **9) QA & Critérios de aceitação**

- Clamps aplicados (bordas: g1_5, DR, g11_20).
- Validação offline com 3–5 tickers (erro ≤3%).
- Logs completos (inputs, assumptions, sources).
- UI com cores corretas e integração do header.

---

---

# **🔹 Workflow com Claude Code / Codex**

### **Passo 1 — Contexto**

```
Lê o ficheiro CLAUDE.md (estado atual do Alfalyzer).
Não escrevas código ainda. Diz-me em bullets:
- stack atual,
- ficheiros críticos,
- convenções,
- status de produção.
```

### **Passo 2 — Prompt Fase 1**

```
Agora quero que implementes a Fase 1 (AlfaValue™) no Alfalyzer,
seguindo CLAUDE.md + prompt da Fase 1.

⚠️ Atenção:
- Padrão service → controller → route
- Usar Redis já configurado
- Cron jobs no worker/cache-updater.ts
- Frontend: AlfaValueHeader.tsx em /stock/:ticker
```

### **Passo 3 — Snippets Base**

**valuation-service.ts**

```
export class ValuationService {
  async getAlfaValue(ticker: string) { /* TODO */ }
  async getRiskFree(region: string) { /* TODO */ }
  async getMRP(region: string) { /* TODO */ }
  async getGTerm(region: string) { /* TODO */ }
}
```

**valuation-controller.ts**

```
import { Request, Response } from "express";
import { ValuationService } from "../services/valuation-service";
const service = new ValuationService();

export const getAlfaValue = async (req: Request, res: Response) => {
  const { ticker } = req.params;
  const data = await service.getAlfaValue(ticker);
  res.json(data);
};
```

**routes/market-data.ts**

```
import { Router } from "express";
import { getAlfaValue } from "../controllers/valuation-controller";
const router = Router();

router.get("/iv/:ticker/main", getAlfaValue);
// TODO: add /rf, /mrp, /gterm

export default router;
```

---

👉 António, este documento é o **pacote final**:

- Prompt financeiro ✅
- Integração prática ✅
- Workflow para Claude Code / Codex ✅
- Snippets base ✅

Queres que eu também junte já **snippets frontend** (AlfaValueHeader.tsx) para eles não inventarem UI?

---

# **📌 FASE 2 — Intrinsic Value (métodos, chart, calculators)**

## **🎯 Objetivo**

Disponibilizar vários **modelos de Intrinsic Value** (core + benchmarks), com **comparação visual** (Valuation Chart) e **calculadoras**.

**AlfaValue™** (Fase 1) permanece o valor “oficial” (não editável).

---

## **0) Vocabulário rápido**

- **IV** = intrinsic value por ação
- **Preço** = last close
- **Status** = “Undervalued” (verde) se Preço < IV; “Overvalued” (vermelho) se Preço > IV; mostrar % discount/premium
- **TTM** = trailing 12 months
- **Montantes** em **milhões** (normalizar sempre)

---

## **1) Métodos (nomes de UI) e Fonte**

### **Core (internos – transparentes)**

1. **AlfaValue™ (Main)** — motor Fase 1 (DCF 20y por FCF: g1_5, g6_10, g11_20, DR=RF+β×MRP, mid-year). **Read-only.**
2. **DCF 20 anos (FCF)** — *interno editável* (mesma fórmula do AlfaValue™, mas inputs do user).
3. **DCF 20 anos (NI)** — *interno editável* (troca FCF por Net Income).
4. **DCF Terminal (3 estágios + perpetuidade)** — *interno editável* (Stage1 1–5; Stage2 6–10; terminal; mid-year).

### **Múltiplos (internos – simples)**

1. **P/E Mean (5y)**, **P/E Median (5y)** (+ toggle ex-NRI se disponível)
2. **P/S Mean (5y)**, **P/S Median (5y)**
3. **P/B Mean (5y)**
4. **PEG**, **PSG** (regras simples conforme já definido)

### **Benchmarks externos (valores prontos –**

### **sem mostrar “FMP” no UI**

### **)**

1. **DCF 20 anos (FCF)** — **externo**: /discounted-cash-flow
2. **DCF 20 anos (FCFE)** — **externo**: /levered-discounted-cash-flow
3. **DCF Terminal** — **externo**: /custom-discounted-cash-flow (aceita inputs)
4. **DCF Terminal (FCFE)** — **externo**: /custom-levered-discounted-cash-flow (aceita inputs)

> No
> 
> 
> **UI**
> 
> **nomes de método**
> 

---

## **2) UI/UX — /stock/:ticker → aba “Intrinsic Value”**

1. **Gauge/Ponteiro** (topo): aponta para **Preço**; arco colorido em torno do **IV do método ativo**.
    - Verde ≤ −15% vs IV; Amarelo (−15, +15); Vermelho ≥ +15
    - Labels: IV $X, Price $Y, Discount/Premium %, Status
    - Default método ativo: **AlfaValue™** (Main)
2. **Valuation Chart** (barras + linhas verticais):
    - Barras (valor/ação):
        
        DNI-20, DFCF-20, DFCF Terminal, P/E mean/median (ex-NRI toggle), P/S mean/median, P/B mean, PEG, PSG, **AlfaValue™**, **DCF 20y (FCF)** externo, **DCF 20y (FCFE)** externo, **DCF Terminal** externo, **DCF Terminal (FCFE)** externo
        
    - Linhas:
        
        Verde = **AlfaValue™**; Preta = **Preço atual**
        
    - Tooltip por barra: **fórmula curta + inputs-chave + as_of**
3. **Calculators (lado a lado)**
    - **Dropdown Method** (lista acima)
    - **Auto Calculation (read-only)**: dados oficiais (pipeline Fase 1 + heurísticas)
    - **My Calculation (editável)**: campos do método + botão **Calculate** + **Send to My Calc** (clona os inputs do Auto)

---

## **3) Fórmulas (consistência com Fase 1)**

- **Mid-year discounting**: descontar por (1+DR)^(t−0.5) em todos os DCF
- **Discount** default: DR = RF + β×MRP, clamp [5%, 15%] (editável no “My Calc”)
- **Growth** default (quando interno/Auto):
    - g1_5 = clamp(CAGR(FCF_5y), 5%, 30%)
    - g6_10 = clamp(0.6*(g1_5*decay) + 0.4*g_sector_mid, 2%, 20%), decay = 0.70 se g1_5<8% senão 0.50
    - g11_20 = clamp( lerp(g6_10, g_term_region, 0.7), max(0.03,g_term−0.01), min(0.05,g_term+0.01) )

---

## **4) Macro multiplier**

## **m**

## **(leve; Fase 2)**

- Objetivo: dinamismo suave **apenas** em g6_10.
- Variáveis (todas via FMP):
    - slope = US10Y − US2Y (Treasury)
    - ΔFFR = variação YoY da Fed Funds Rate (Economic Indicators)
- Regra:
    - m = 1.03 se slope > 0.75% **e** ΔFFR ≤ 0
    - m = 0.97 se slope < −0.50% **e** ΔFFR ≥ +1%
    - caso contrário m = 1.00
- Aplicar: g6_10 := clamp(g6_10 × m, 2%, 20%)
- Cache: macro:m:US (TTL 31d). Admin override permitido.

---

## **5) Sensibilidade (cenários) — DCF editáveis**

- Para **DFCF-20**, **DNI-20**, **DFCF Terminal** internos:
    - bear = g6_10 × 0.90, base = g6_10, bull = g6_10 × 1.10
    - Calcular IV_bear, IV_base, IV_bull (mid-year ligado)
    - Expor: sensitivity_range = { min, base, max }
- **AlfaValue™** não tem sensibilidade (é o “oficial”).

---

## **6) Endpoints (contratos)**

### **6.1 Chart (barras)**

GET /iv/:ticker/chart →

```
{
  "price": 231.80,
  "alfaValue": 195.60,
  "methods": {
    "ALFAVALUE_MAIN": 195.60,
    "DCF20_FCF_INTERNAL": 190.30,
    "DCF20_NI_INTERNAL": 183.40,
    "DCF_TERM_INTERNAL": 198.10,
    "PE_MEAN_5Y": 145.0,
    "PE_MED_5Y": 142.2,
    "PS_MEAN_5Y": 120.4,
    "PS_MED_5Y": 118.9,
    "PB_MEAN_5Y": 110.7,
    "PEG": 138.6,
    "PSG": 125.4,
    "DCF20_FCF_EXT": 190.30,
    "DCF20_FCFE_EXT": 207.58,
    "DCF_TERM_EXT": 195.61,
    "DCF_TERM_FCFE_EXT": 207.58
  },
  "meta": {
    "as_of": {
      "ALFAVALUE_MAIN": "2025-09-14",
      "DCF20_FCF_EXT": "2025-02-04",
      "DCF20_FCFE_EXT": "2025-02-04",
      "DCF_TERM_EXT": "2029",
      "DCF_TERM_FCFE_EXT": "2029"
    },
    "notes": { "mid_year": true, "macro_m": 1.00 }
  }
}
```

### **6.2 Calculators — Auto**

GET /iv/:ticker/methods/:method/auto → inputs calculados + iv + status + sensitivity_range?.

### **6.3 Calculators — My Calculation**

POST /iv/:ticker/methods/:method/calc → { iv, discount_pct, status, sensitivity_range? }.

### **6.4 Macro**

GET /macro/multiplier?region=US → { m, as_of, rule }.

---

## **7) Cache & Redis**

- iv:chart:{ticker} (TTL 24h, SWR)
- iv:method:auto:{ticker}:{method} (TTL 24h)
- iv:dcf:{ticker} (bundle dos 4 externos; TTL 24h)
- macro:m:{region} (TTL 31d)

---

## **8) Estados & QA**

- **OK**: DCF internos prontos; ≥3 métodos válidos no chart; externos carregados (ou marcados N/A).
- **WARN**: externo falhou/timeout → esconder barra e logar; múltiplos com <5y de histórico.
- **BLOCK**: inputs críticos ausentes para método interno → card mostra placeholder.

**Checks**

- Mid-year aplicado em todos DCF.
- IV_bull > IV_base > IV_bear.
- m ∈ [0.95,1.05].
- Tolerância vs. offline: ±3%.

---

## **9) Implementação —**

## **código explícito**

## **para os**

## **4 DCF externos**

## **(Node/TS)**

> Estes nomes de função
> 
> 
> **devem**
> 

> Não
> 

```
// src/services/fmp-dcf.ts
import { fmpGet } from "../lib/fmp"; // helper com retries + apikey

// --- 1) DCF 20 anos (FCF) — EXTERNO ---
export async function getDCF_FCF_EXT(symbol: string) {
  type Row = { symbol: string; date: string; dcf: number };
  const arr = await fmpGet<Row[]>("/discounted-cash-flow", { symbol });
  const row = arr?.[0];
  if (!row?.dcf) throw new Error(`No DCF FCF ext for ${symbol}`);
  return { method: "DCF20_FCF_EXT", iv: row.dcf, as_of: row.date };
}

// --- 2) DCF 20 anos (FCFE) — EXTERNO ---
export async function getDCF_FCFE_EXT(symbol: string) {
  type Row = { symbol: string; date: string; dcf: number };
  const arr = await fmpGet<Row[]>("/levered-discounted-cash-flow", { symbol });
  const row = arr?.[0];
  if (!row?.dcf) throw new Error(`No DCF FCFE ext for ${symbol}`);
  return { method: "DCF20_FCFE_EXT", iv: row.dcf, as_of: row.date };
}

// --- 3) DCF Terminal (custom unlevered) — EXTERNO ---
export async function getDCF_TERM_EXT(symbol: string, opts?: {
  longTermGrowthRate?: number; costOfEquity?: number;
  riskFreeRate?: number; marketRiskPremium?: number; beta?: number;
}) {
  type Row = { symbol: string; year: string; equityValuePerShare: number; wacc?: number };
  const arr = await fmpGet<Row[]>("/custom-discounted-cash-flow", { symbol, ...opts });
  const row = arr?.[0];
  if (!row?.equityValuePerShare) throw new Error(`No DCF TERM ext for ${symbol}`);
  return { method: "DCF_TERM_EXT", iv: row.equityValuePerShare, as_of: row.year, wacc: row.wacc };
}

// --- 4) DCF Terminal (custom levered) — EXTERNO ---
export async function getDCF_TERM_FCFE_EXT(symbol: string, opts?: {
  longTermGrowthRate?: number; costOfEquity?: number;
  riskFreeRate?: number; marketRiskPremium?: number; beta?: number;
}) {
  type Row = { symbol: string; year: string; equityValuePerShare: number };
  const arr = await fmpGet<Row[]>("/custom-levered-discounted-cash-flow", { symbol, ...opts });
  const row = arr?.[0];
  if (!row?.equityValuePerShare) throw new Error(`No DCF TERM FCFE ext for ${symbol}`);
  return { method: "DCF_TERM_FCFE_EXT", iv: row.equityValuePerShare, as_of: row.year };
}
```

### **Agregação para o Chart (inclui AlfaValue™ da Fase 1)**

```
// src/services/iv-chart.ts
import { getAlfaValueMain } from "./alfavalue-engine"; // Fase 1
import { getDCF_FCF_EXT, getDCF_FCFE_EXT, getDCF_TERM_EXT, getDCF_TERM_FCFE_EXT } from "./fmp-dcf";

export async function buildChartPayload(symbol: string, custom?: {
  longTermGrowthRate?: number; costOfEquity?: number;
  riskFreeRate?: number; marketRiskPremium?: number; beta?: number;
}) {
  const alfa = await getAlfaValueMain(symbol); // { iv, price, as_of }

  const [u, l, t, tl] = await Promise.allSettled([
    getDCF_FCF_EXT(symbol),
    getDCF_FCFE_EXT(symbol),
    getDCF_TERM_EXT(symbol, custom),
    getDCF_TERM_FCFE_EXT(symbol, custom),
  ]);

  const methods: Record<string, number | undefined> = {
    ALFAVALUE_MAIN: alfa.iv,
    DCF20_FCF_EXT: u.status === "fulfilled" ? u.value.iv : undefined,
    DCF20_FCFE_EXT: l.status === "fulfilled" ? l.value.iv : undefined,
    DCF_TERM_EXT: t.status === "fulfilled" ? t.value.iv : undefined,
    DCF_TERM_FCFE_EXT: tl.status === "fulfilled" ? tl.value.iv : undefined,
    // + aqui injectas os internos (DCF20_FCF_INTERNAL, etc.) quando os tiveres
  };

  return {
    price: alfa.price,
    alfaValue: alfa.iv,
    methods,
    meta: {
      as_of: {
        ALFAVALUE_MAIN: alfa.as_of,
        DCF20_FCF_EXT: u.status === "fulfilled" ? u.value.as_of : null,
        DCF20_FCFE_EXT: l.status === "fulfilled" ? l.value.as_of : null,
        DCF_TERM_EXT: t.status === "fulfilled" ? t.value.as_of : null,
        DCF_TERM_FCFE_EXT: tl.status === "fulfilled" ? tl.value.as_of : null,
      }
    }
  };
}
```

---

## **10) Múltiplos internos (resumo para devs)**

- **PE_MEAN_5Y**: média P/E 5 anos → IV = EPS_TTM × PE_mean
- **PE_MED_5Y**: mediana 5 anos
- **PS_MEAN_5Y / MED_5Y**: IV = Revenue/share × PS_mean/med
- **PB_MEAN_5Y**: IV = BookValue/share × PB_mean
- **PEG**: target_PE = clamp(growth% , 5, 30); IV = EPS × target_PE
- **PSG**: target_PS = clamp(sales_growth% , 1, 15); IV = Sales/share × target_PS
- **Dados**: séries do FMP; se <5y, usar o máximo disponível e marcar WARN.

---

## **11) Cores & Status**

- **Undervalued**: Discount ≥ +5% (verde)
- **Overvalued**: ≤ −5% (vermelho)
- **Fair**: entre −5% e +5% (cinza)
- Gauge sempre reflete o **método ativo** (default: AlfaValue™).

---

## **12) Critérios de aceitação**

- AlfaValue™ idêntico ao da Fase 1 (±1–3%).
- DCF externos carregam ou ficam N/A sem quebrar o chart.
- Mid-year aplicado nos DCF internos.
- Sensibilidade presente nos DCF internos (range ordenado).
- Macro m calculado conforme regra e logado.

---

# **📌 Fase 3 — Gauge/Ponteiro (UI)**

**Objetivo:** dar leitura rápida de “caro/barato” por **método ativo** (default: **AlfaValue™**).

- **Ponteiro:** **Preço** atual.
- **Arco:** centrado no **IV** do método ativo.
- **Zonas:**
    - **Verde:** Preço ≤ IV × 0.85 (≤ −15%)
    - **Amarelo:** IV × 0.85 … IV × 1.15 (−15% a +15%)
    - **Vermelho:** Preço ≥ IV × 1.15 (≥ +15%)
- **Labels:** IV $X, Price $Y, Discount/Premium %, Status.
- **Estado de dados:** se IV do método ativo estiver N/A → mostrar placeholder “Not enough data”.

**Endpoint:** já preparado na Fase 2 (/iv/:ticker/chart devolve alfaValue, price e methods).

**Frontend:** componente Gauge.tsx reutilizável; props: { iv: number, price: number, methodName: string }.

---

# **📌 Fase 4 — Calculadoras**

**Estrutura fixa por método:**

- **Dropdown “Method”** (lista da Fase 5).
- **Gauge** do método.
- **Auto Calculation** (read-only): usa pipeline oficial (Fase 1/2).
- **My Calculation** (editável): campos do método + botão **Calculate** + **Send from Auto** (preenche com os valores atuais).

**Fórmulas (todas com mid-year discounting):**

- **DCF-20 (FCF)**
    
    IV = \dfrac{\sum_{t=1}^{20} \frac{FCF_t}{(1+DR)^{\,t-0.5}} + Cash - Debt}{Shares}
    
- **DCF-20 (NI)**
    
    Idem, trocando **FCF** por **Net Income**.
    
- **DCF Terminal (3 estágios + perpetuidade)**
    
    Terminal no ano 20: TV = \dfrac{FCF_{20}\,(1+g_{term})}{DR - g_{term}}.
    
    Presente: \dfrac{TV}{(1+DR)^{\,19.5}}.
    
    IV por ação = \dfrac{\sum PVs + Cash - Debt}{Shares}.
    
- **P/E**
    
    IV = EPS_{TTM} \times P/E_{mean\;ou\;median(5y)} (toggle **ex-NRI** se possível).
    
- **P/S**
    
    IV = (Revenue/Share) \times P/S_{mean\;ou\;median(5y)}.
    
- **P/B**
    
    IV = (BookValue/Share) \times P/B_{mean(5y)}.
    
- **PEG** (simples)
    
    target\_PE = clamp(growth\%, 5, 30); IV = EPS \times target\_PE.
    
- **PSG** (simples)
    
    target\_PS = clamp(sales\_growth\%, 1, 15); IV = Sales/Share \times target\_PS.
    
- **Custom**
    
    Métrica escolhida no dropdown (FCF/NI/OCF/etc.) no somatório DCF 20y.
    

**Endpoints:**

- GET /iv/:ticker/methods/:method/auto → inputs + iv + status (+ sensitivity_range?)
- POST /iv/:ticker/methods/:method/calc → inputs do utilizador → iv + status (+ sensitivity_range?)

---

# **📌 Fase 5 — Métodos incluídos (UI & API)**

**Core internos (transparentes):**

- **AlfaValue™ (Main)** — (read-only; Fase 1).
- **DFC F-20 (FCF)** — interno editável.
- **DNI-20 (NI)** — interno editável.
- **DFCF Terminal** — interno editável.

**Múltiplos internos:**

- **P/E Mean/Median (5y)** (toggle **ex-NRI**)
- **P/S Mean/Median (5y)**
- **P/B Mean (5y)**
- **PEG**, **PSG**

**Benchmarks externos (FMP)** — **no UI não mencionar “FMP”**:

- **DCF 20 anos (FCF)** — externo /discounted-cash-flow
- **DCF 20 anos (FCFE)** — externo /levered-discounted-cash-flow
- **DCF Terminal** — externo /custom-discounted-cash-flow
- **DCF Terminal (FCFE)** — externo /custom-levered-discounted-cash-flow

**Chart**: barras para todos os métodos disponíveis + linhas: **AlfaValue™** (verde), **Preço** (preta).

---

# **📌 Fase 6 — Métricas de Valuation (tabelas)**

**Core (sempre visíveis):**

P/E, PEG, EV/EBITDA, EV/FCF, P/B, P/S, Earnings Yield.

**Complementares (dropdown “Show more”):**

Dividend Yield, FCF Yield, EV/EBIT, Price/OCF, ROE, Debt/Equity, Debt/EBITDA, EV/Revenue.

**Dados:** FMP Key Metrics / Financial Statements; normalizar por ação; períodos TTM e 5y (médias/medianas).

---

# **📌 Fase 7 — Dados globais (consolidado com Fase 1/2)**

## **Objetivo**

Unificar as regras e fontes de **inputs macro** para valuation: RF, MRP, Beta e g_term_region.

---

## **1) Market Risk Premium (MRP)**

- Fonte primária: **FMP Market Risk Premium API** /stable/market-risk-premium
- Usar totalEquityRiskPremium para US/North America (ou região correspondente).
- Se região não coberta (guardado em mrp:coverage:{region}):
    - Fallback 1: scraping mensal de *market-risk-premia.com*
    - Fallback 2: tabela estática → default 5.0%
- Cache: mrp:{region} TTL 31d

---

## **2) Risk-Free Rate (RF)**

- Fonte: **FMP Treasury Rates API** /stable/treasury-rates
- Usar **10Y Treasury (year10)** → normalizar para decimal.
- Cache: rf:{region} TTL 24h.
- Fallback: último cache válido → se não houver, estático 0.04.

---

## **3) Beta**

- **Primário:** profile.beta do FMP (rápido, pronto).
- **Fallback:** cálculo interno “5y monthly”:
    - Obter preços do ativo e benchmark (SPY ou ^GSPC) via FMP.
    - Calcular retornos mensais (60 pontos).
    - OLS regression: β = cov(r_asset, r_bench) / var(r_bench).
- Cache: beta:{symbol} (TTL 30d) + meta.beta_source = “fmp” | “computed_5y_mo”.

---

## **4) g_term_region**

- Fonte: **FMP Economic Indicators API** /stable/economic-indicators
- Variáveis:
    - realGDP → YoY growth = (GDP_t / GDP_{t-4q}) − 1
    - CPI ou inflationRate → YoY ou valor anualizado
- Fórmula:

```
g_term_region = clamp(gdp_real_growth + inflation, 3%, 5%)
```

- Cache: g_term_region:{region} TTL 365d
- Fallback: tabela estática (US=4%, EU=3%, CN=5%)

---

## **5) Estados de qualidade**

- **OK:** RF/MRP ≤ 31d; Beta (FMP ou computed) válido; GDP+inflation disponíveis.
- **WARN:** beta default=1.0; MRP expirado; inflação sem dados recentes.
- **BLOCK:** sem RF nem MRP → valuation não calculado.

---

## **6) Redis keys**

- mrp:{region} (TTL 31d)
- mrp:coverage:{region} (TTL 30d)
- rf:{region} (TTL 24h)
- beta:{symbol} (TTL 30d)
- g_term_region:{region} (TTL 365d)

---

---

# **📌 Fase 8 — Regras de qualidade**

- **OK:** FCF_TTM>0; beta real (FMP ou computed); RF/MRP ≤ 31d.
- **WARN:** beta default=1.0; MRP expirado; FCF fallback (OCF/NI); métodos externos N/A.
- **BLOCK:** sem Cash/Debt/Shares → não calcular IV; UI mostra placeholder.

---

# **📌 Fase 9 — UI/UX**

1. **Header da stock** → **AlfaValue™** + Status + % discount/premium (já na Fase 1).
2. **Aba “Intrinsic Value”** → **Gauge** + **Valuation Chart** + **Calculators**.
3. **Aba “Valuation”** → Tabelas Core + Complementares + “Other Valuations”.

---

# **📌 Fase 10 — Saídas (para FE consumir)**

- GET /iv/:ticker/main → { alfaValue, discountPct, status, inputs_hash, as_of }
- GET /iv/:ticker/chart → { price, alfaValue, methods{...}, meta{as_of,...} }
- GET /iv/:ticker/methods/:method/auto → inputs + iv + status + sensitivity_range?
- POST /iv/:ticker/methods/:method/calc → inputs (user) → iv + status + sensitivity_range?
- GET /macro/multiplier?region=US (se já ativares o m na Fase 2)

---

# **📌 Fase 11 — Excel Adam Khoo**

Aqui seguem as instruções e imagens de como o adam khoo montou o seu excel. A ideia aqui é percebermos se com base num dos 3 métodos que o Adam Khoo tem neste excel conseguimos chegar ao valor do "OracleValue" que é o que ele tem no site dele aqui: https://app.stockoracle.com/stock-details/AAPL/overview

Analisa este ficheiro Markdown sobre os cálculos de um Excel de valuation (DCF, DFCF e Discounted Net Income). 

1. Confirma se as fórmulas descritas batem com um DCF padrão (explica eventuais diferenças).

2. Implementa em Python uma simulação do DCF da secção "DCF (Discounted Cash Flow)": usa OCF=11332, growth_fase1=0.1853, growth_fase2=0.09265, growth_fase3=0.04, discount=0.063, shares=953, debt=15568, cash=6968. Calcula o IV por ação e compara com o exemplo (394.72 USD).

3. Para DFCF e Discounted NI: Propõe código Python para preencher os placeholders, assumindo FCF=OCF*0.8 e NI=OCF*0.7 como proxies.

4. Valida sensibilidade: varia o discount de 5% a 8% e growth_fase1 de 15% a 20%, e mostra uma tabela de resultados.

5. Sugere melhorias no modelo Excel (ex: adicionar valor terminal).



# Análise do Excel: Cálculos de DCF, DFCF e Discounted Net Income

## Visão Geral

- **Ficheiro**: PP VMI Investing Tools - 2024 - v1.xlsx

- **Folhas principais relevantes**:

  - **VMI IV Calculator (20 years)** (Folio 0): Calcula DCF baseado em Operating Cash Flow (OCF) para 20 anos. Suporta placeholders para DFCF e Discounted Net Income, mas apenas OCF está preenchido no exemplo (para Mastercard - MA).

  - **Discounted Earnings Per Share** (Folio 1): Calcula valor intrínseco via Discounted EPS (relacionado a Discounted Net Income por ação), para 10 anos. Tem erros #REF! (template vazio).

  - **Discounted Cash Flow** (Folio 2): Calcula DCF para Cash Flow (milhões), para 10 anos, dividido por ações. Também com #REF! (template).

- **Moeda**: USD$ (exemplo usa Mastercard, com OCF atual de 11.332M USD).

- **Outras folhas**: Focadas em portfolio (não relevantes para cálculos de valuation).

- **Observações gerais**:

  - Os cálculos usam projeções de crescimento em fases (anos 1-5, 6-10, 11-20) e desconto composto.

  - Taxa de desconto: 6.3% (baseado em Beta, Risk-Free Rate 2.426%, Market Risk Premium 3.314% para US).

  - Ações em circulação: 953M.

  - Sem macros/VBA visíveis. Fórmulas extraídas via openpyxl.

## Hovers (Comentários) e Links Extraídos

### Hovers (de células chave na Folha 0):

- **J8** (Financial Statement Currency): "Select the currency used by the company to report its financials."

- **J10** (Stock Listing Currency): "Select the currency used where the stock is being listed."

- **F12** (Valuation Method): "If Revenue, Net Income, and Operating Cash Flow is consistent, use Discounted Cash Flow. If Revenue, Net Income, and Operating Cash Flow is consistent, but Operating Cash Flow > 1.5x Net Income, Use Discounted Free Cash Flow. If Operating Cash Flow is not consistent but Revenue and Net Income is consistent, use Discounted Net Income."

- **C14** (Operating Cash Flow Current): "If Operating Cash Flow > 1.5x Net Income, use Free Cash Flow. -- (Operating Cash Flow) Statement of Cash Flows Last 4 Quarters or (Net Income) Income sheet Latest Annual or (Free Cash Flow) Statement of Cash Flows Last 4 Quarters"

- **C16** (Total Debt): "Balance Sheet Last Quarter"

- **C18** (Cash and Short Term Investments): "Balance Sheet Last Quarter"

- **C20** (Cash Flow Growth Rate Yr 1-5): "LT Growth Rate or EPS 5-Year Growth Rate"

- **C22** (Cash Flow Growth Rate Yr 6-10): "Maximum 15%"

- **C24** (Cash Flow Growth Rate Yr 11-20): "Slightly higher than Long Term GDP Growth Rate US Stocks: 4% China Stocks: 6%"

- **C26** (No. of Shares Outstanding): "finance.yahoo.com/quote/<Stock> -> Statistics"

### Links (Hiperligações):

- **C78**: http://www.market-risk-premia.com/us.html (fonte para Risk Premium US).

- **J78**: http://www.market-risk-premia.com/hk.html (fonte para Risk Premium HK/China).

Outras folhas não têm hovers ou links relevantes.

## Cálculos Principais

### DCF (Discounted Cash Flow) - Baseado em Operating Cash Flow (Folha 0, 20 anos)

- **Descrição**: Projeta OCF para 20 anos em 3 fases de crescimento, desconta ao PV usando taxa de 6.3%, soma para Enterprise Value, ajusta por dívida e caixa para IV por ação. (No exemplo: PV total = 384.764M USD; IV por ação = 394.72 USD).

- **Inputs chave** (células brancas para inserir):

  - OCF Atual (F14): 11.332M USD (de Cash Flow Statement, últimos 4 trimestres).

  - Dívida Total (F16): 15.568M USD (Balance Sheet, último trimestre).

  - Caixa (F18): 6.968M USD (Balance Sheet).

  - Crescimento Yr1-5 (F20): 18.53% (baseado em LT Growth ou EPS 5yr).

  - Crescimento Yr6-10 (F22): 9.265% (máx. 15%).

  - Crescimento Yr11-20 (F24): 4% (ligeiramente > GDP US).

  - Taxa Desconto (E28): 6.3% (calculada via CAPM: Risk-Free + Beta * MRP).

  - Ações (F26): 953M.

  - Ano Atual (E30): 2023.

- **Fórmulas chave** (extraídas):

  - **Projeções OCF (Linha 33, anos 2024-2033)**:

    - F33: `=(G14)*(1+F20)`  // Ano 1: 11.332 * (1+0.1853) = 13.432M

    - G33: `=($F33)*(1+$F$20)`  // Ano 2: chained * crescimento

    - ... até J33 (Ano 5).

    - K33: `=(J$33)*(1+$F$22)`  // Ano 6: * crescimento fase 2

    - ... até O33 (Ano 10).

  - **Projeções OCF (Linha 38, anos 2034-2043)**:

    - F38: `=(O$33)*(1+$F$24)`  // Ano 11: * crescimento fase 3

    - ... chained até O38 (Ano 20: 61.120M).

  - **Fatores Desconto (Linha 34, anos 1-10)**:

    - F34: `=1/(1+$E$28)`  // Ano 1: 1/(1+0.063) ≈ 0.9407

    - G34: `=F$34/(1+$E$28)`  // Ano 2: cumulative ≈ 0.8850

    - ... chained.

  - **Fatores Desconto (Linha 39, anos 11-20)**:

    - F39: `=O$34/(1+$E$28)`  // Ano 11: baseado no Ano 10

    - ... chained (Ano 20 ≈ 0.2947).

  - **Valores Descontados (Linha 35, anos 1-10)**: F35: `=F33*F34`  // OCF projetado * fator

    - ... chained; soma em N14: `=SUM(F35:O35)+SUM(F40:O40)`  // PV total 384.764M

  - **Valores Descontados (Linha 40, anos 11-20)**: Similar, F40: `=F38*F39`

  - **IV antes Caixa/Dívida (N16)**: `=IF(F26<>0,N14/F26,0)`  // 384.764 / 953 ≈ 403.74 USD/ação

  - **Dívida por Ação (N18)**: `=IF(F26<>0,G16/F26,0)`  // 15.568 / 953 ≈ 16.34

  - **Caixa por Ação (N20)**: `=IF(F26<>0,G18/F26,0)`  // 6.968 / 953 ≈ 7.31

  - **IV Final por Ação (N24)**: `=N16-N18+N20`  // 403.74 - 16.34 + 7.31 = 394.72 USD

  - **Ajuste Moeda (N26)**: `=N24*M12`  // * taxa câmbio (1 USD = 1 USD)

  - **Desconto/Prêmio (M28)**: `=N30/N26-1`  // vs. preço atual 375.5 USD (≈ -4.87%)

- **Notas**: Sem valor terminal explícito (projeções até Ano 20). Usa OCF como proxy para FCF.

### DFCF (Discounted Free Cash Flow)

- **Descrição**: Placeholder na Folha 0 (cabeçalhos em Linha 31/33, mas sem valores preenchidos). Recomendado se OCF > 1.5x Net Income (hover F12). Provavelmente similar ao DCF, mas usa FCF = OCF - CAPEX - ΔWorking Capital (não implementado).

- **Fórmulas**: Não calculadas no exemplo. Na Folha 2 (10 anos), usa "Cash Flow" genérico:

  - Projeções (Linha 13): B13: `=C7*(1+C8)`  // C7: CF atual (template #REF!)

  - Desconto similar ao DCF acima.

  - PV Total (C19): `=SUM(B15:J15)`  // Soma descontados

  - IV por Ação (C20): `=C19/C17`  // / ações (C17 #REF!)

- **Sugestão**: Copie estrutura do DCF, substitua OCF por FCF nos inputs (hover C14).

### Discounted Net Income

- **Descrição**: Placeholder na Folha 0 (cabeçalhos em Linha 31/32, sem valores). Usa se OCF inconsistente, mas Revenue/NI consistente (hover F12). Relacionado a Discounted EPS na Folha 1.

- **Fórmulas na Folha 0**: Não preenchidas. Provavelmente chained como OCF, mas com NI atual (de Income Statement, anual mais recente; hover C14).

- **Implementação via EPS (Folha 1, 10 anos)**: Soma de EPS projetados descontados (assume crescimento constante).

  - **Inputs**: B7: EPS atual (#REF!); B8: crescimento (#REF!); B9: desconto (#REF! 4%).

  - **Projeções EPS (Linha 11)**: B11: `=B7*(1+B8)`  // chained até J11 (Ano 10).

  - **Fatores Desconto (Linha 12)**: B12: `=1/(1+$B$9)`  // chained cumulative.

  - **Valores Descontados (Linha 13)**: B13: `=B11*B12`  // chained.

  - **IV (B15)**: `=SUM(B13:K13)`  // Soma total (por ação, já que EPS).

- **Notas**: Assume crescimento constante (nota na folha: "This assumes EPS growth rate remains constant throughout the 10 years"). Para fases, ajuste manualmente.

## Tabela de Comparação de Métodos

| Método              | Base de Projeção | Horizonte | Ajustes Finais          | Fórmula Chave de PV                  | Exemplo Resultado (MA) |

|---------------------|------------------|-----------|-------------------------|--------------------------------------|------------------------|

| **DCF (OCF)**      | Operating Cash Flow | 20 anos  | -Dívida + Caixa / Ações | `SUM(Projetados * Fatores Desconto)` | 394.72 USD/ação       |

| **DFCF**           | Free Cash Flow  | 10/20 anos | Similar                 | Similar, mas com FCF inputs         | Não calculado         |

| **Discounted NI**  | Net Income (ou EPS) | 10 anos | Direto por ação         | `SUM(EPS Projetados * Fatores)`     | Template (#REF!)      |

## Recomendações para Análise no Claude

- Copie este .md para um ficheiro e peça ao Claude: "Analise as fórmulas em Python: simule o DCF para OCF=10000, growth=10%, discount=5%, shares=100, debt=5000, cash=2000. Valide sensibilidade a growth."

- Para DFCF/Discounted NI: Preencha templates na Folha 0/1/2 com dados reais e reexecute.

- Fontes: Use Yahoo Finance (hover C26) para inputs; sites de MRP para taxa desconto.

© 2024 Piranha Ltd. (do ficheiro original). Se precisar de mais detalhes ou simulação, envie!
---