Contexto & Objetivo (resumo para dev agents)

Produto: Alfalyzer — módulo de valuation.
Meta: Calcular e expor Intrinsic Value por ação em várias fases, começando pelo AlfaValue™ (valor “oficial”) e evoluindo para chart, gauge e calculadoras.

O que implementar por fases

Fase 1 — AlfaValue™ (oficial)
	•	Engine DCF 20 anos (FCF) com:
g1_5, g6_10, g11_20, mid-year discounting, DR = RF + β×MRP (clamp 5–15%).
	•	Inputs via FMP (FCF/OCF/CAPEX, Cash, Debt, Shares, Price, Beta, Sector/Industry).
	•	RF: FMP Treasury (10Y). MRP: FMP + fallback.
	•	g_term_region: FMP Economic Indicators (realGDP YoY + inflação), clamp 3–5%.
	•	Beta: profile.beta (primário) → fallback computed_5y_mo (OLS com 60 retornos mensais vs SPY).
	•	Endpoints: GET /iv/:ticker/main.
	•	UI: Header em /stock/:ticker (AlfaValue™, Status, % discount).
	•	Redis (TTL indicadas) + cron jobs (diário/mensal/trimestral/anual).
	•	Não ativar macro multiplier aqui (fixo m=1.00).

Fase 2 — Métodos, Chart & Calculators
	•	Chart com AlfaValue™ + métodos internos (DCF FCF/NI/Terminal, múltiplos) + externos FMP (4 DCF).
	•	Calculators: Auto (read-only) e My Calculation (editável).
	•	Macro multiplier (m) leve aplicado só a g6_10 (regras dadas).
	•	Endpoints: /iv/:ticker/chart, /iv/:ticker/methods/:method/auto, POST …/calc, /macro/multiplier.

Fase 3 — Gauge
	•	Gauge no topo da aba Intrinsic Value: ponteiro=Preço; arco centrado no IV do método ativo.

Fase 4 — Calculadoras (UI)
	•	Estrutura fixa (dropdown método, gauge, Auto, My Calculation).

Fase 5–6 — Métodos & Métricas
	•	Métodos incluídos (lista completa) e tabelas de métricas (Core + Complementares).

Fase 7 — Dados Globais (padrões)
	•	Padronizar RF, MRP, Beta, g_term_region (com caches, fallbacks, coverage e qualidade).

Fase 8–10 — Qualidade, UX e Saídas
	•	Estados OK/WARN/BLOCK, UX das abas, contratos finais de API para FE.

Guardrails
	•	Padrão service → controller → route.
	•	Reutilizar Redis e cron infra existes.
	•	Não mudar nomes/paths fornecidos.
	•	Documentar meta.beta_source e as_of.
	•	Respeitar clamps, mid-year e tolerância ±3% vs cálculos offline.


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