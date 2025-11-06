# ORACLE VALUE — TRACKER

StockOracle login:
Mail: plataformas@conversasdeinvestidores.com
Password: L1@Pr@T27R@@

## 🎯 Objetivo

Desmontar como o StockOracle calcula o **OracleValue™** para diferentes ações, comprovar a fórmula de base e identificar regras de fallback ou ajustes específicos por setor/condição (ex.: FCF ausente, múltiplos negativos, crescimento extremo).

## 🧭 Plano Atualizado

| Etapa | Descrição | Estado | Observações |
| --- | --- | --- | --- |
| 1 | Reconstruir o DCF original (planilha Adam Khoo) com inputs capturados via API | ☑ | Script `scripts/rebuild_dcf.py` + snapshots (ex.: `AAPL`, `ARES`) reproduzem o DCF do site |
| 2 | Validar PVs do site (`get-dcf-automation`, `get-dfcf20-automation`, `get-dni20-automation`) contra a reconstrução | ⚙️ | AAPL/MSFT (Tech), ARES (Asset Mgmt) e SPG (REIT) reconciliados; falta ampliar amostra (DNI20, mais setores) |
| 3 | Comparar OracleValue final vs. DCF base e medir delta por cluster | ⚙️ | Nova rodada (02 Nov 2025) com `HUM/CVS/ELV` e `RIVN/STLA/GM/LI` adicionada ao CSV (`playwright_capture_2025-11-02`); próximos passos: estender para outros setores/datas. |
| 4 | Mapear ajustes/setor (múltiplos, moat, Rule of 40, alavancagem, etc.) | ☐ | Usar regressões/regra de decisão para explicar o delta |
| 5 | Documentar fórmula universal parametrizada (DCF base + dials setoriais) | ☐ | Destacar triggers de fallback e coeficientes estimados |
| 6 | Testar no tempo (datas diferentes) e novos tickers para robustez | ☐ | Verificar se há recalibrações ou ajustes manuais |

### Inputs Necessários (por ticker)
- **Fluxos e resultados**: Operating CF, Free CF, Net Income, Revenue, EBIT/EBITDA.
- **Balanço**: Short + Long Debt, Cash & ST Investments, Shares Outstanding.
- **Curvas de crescimento**: `growthRateFirsttoFifthYear`, `growthRateSixthToTenthYear`, `growthRateEleventhToTwentiethYear`.
- **Parâmetros de desconto**: Beta, Risk-free rate, Market risk premium (tabelas do Excel → validar se o site usa fontes equivalentes).
- **Ajustes qualitativos**: Moat, Predictability, Rule of 40, alavancagem, payout (usados na etapa de ajustes).

### Passos detalhados
1. **Reconstruir o DCF original** usando inputs fornecidos pelas APIs:
   - Operating/Free Cash Flow, Net Income, dívida, caixa, número de ações, curvas de growth (Y1‑5, Y6‑10, Y11‑20).
   - Discount rate calculado via beta + risk free + market risk premium (mesma tabela do Excel).
   - Suporte aos três métodos: `Discounted Cash Flow`, `Discounted Free Cash Flow`, `Discounted Net Income`.
2. **Validar os PVs exibidos no site** (`get-dcf-automation`, `get-dfcf20-automation`, `get-dni20-automation`) contra a reconstrução para garantir que o backend segue a mesma lógica.
3. **Comparar OracleValue final vs. DCF base** para cada ticker e medir o delta por setor.
4. **Mapear ajustes/setor**: usar regressões ou regras sobre múltiplos, moat, Rule of 40, alavancagem, etc., para explicar o delta (identificar pesos e triggers de fallback).
5. **Documentar regras paramétricas**: formular uma função universal com “dials” setoriais/qualitativos que replique o OracleValue combinando DCF base + ajustes.
6. **Testar no tempo e novos tickers** para confirmar estabilidade dos coeficientes e identificar quando recalibrações ocorrem.

## 📈 Estado atual e principais achados

- **Motor-base confirmado**: o cálculo arranca sempre da projeção DCF de 20 anos + terminal; `scripts/rebuild_dcf.py` reproduz os valores oficiais com erro < ±0.01 USD por ação quando os inputs estão completos.
- **Misturas dependentes do setor**: para tickers com DCF/DFCF/DNI válidos, o OracleValue é uma combinação linear desses componentes com múltiplos médios (PS, PB, PE, PE sem NRI); os pesos variam por cluster (tech, healthcare, REITs, asset managers, insurance, etc.).
- **Fallback só com múltiplos**: quando os fluxos descontados falham (DFCF-20 ou Terminal a zero/negativos), o valor final usa apenas múltiplos, com coeficientes específicos para cada grupo (ex.: utilities, bancos, airlines).
- **Haircuts/premiums setoriais**: regressões dos deltas (`Oracle − DCF`) mostram que crescimento projetado, alavancagem líquida e liquidez determinam descontos/prémios diferentes por cluster (ex.: alternativos vs. tradicionais em asset managers; life vs. P&C em seguros).
- **Infraestrutura pronta**: `scripts/extract_growth_features.py`, `scripts/analyze_insurance_growth.py` (agora com `--features`) e `scripts/analyze_auto_cluster.py` permitem gerar e analisar rapidamente novos conjuntos de features/ratios para qualquer setor utilizando os payloads em `stockoracle_payloads/`.
- **Automação de capturas (03 Nov 2025)**: script `scripts/fetch_stockoracle_payloads.py` permite puxar vários tickers de uma vez partindo do cookie `ACCESS_TOKEN_APP`. Já estão no repositório os payloads crus de `BN`, `BXSL`, `MS`, `JEF`, `LPLA`, `BXP`, `ARE`, `WPC`, `KEY`, `RF`, `FITB` e `SYF` (resp. Asset Mgmt, capital markets e REITs). O endpoint para `DFS` devolveu 404 → precisa de substituto (ex.: `ALLY`/`NAVIK`/`AFRM` conforme o cluster Credit Services).

### Atualização 03 Nov 2025 — dataset consolidado

- `data/oracle_dataset.csv` reconstruído com **90** linhas (`python3 scripts/build_oracle_dataset.py --glob 'stockoracle_payloads/**/*.json'`).
- Cobertura por indústria após a nova ronda:
  | Indústria | Observações |
  | --- | --- |
  | Auto - Manufacturers | 15 |
  | Medical - Healthcare Plans | 12 |
  | Asset Management | 10 |
  | Regulated Electric | 8 |
  | Drug Manufacturers - General | 5 |
  | Banks - Regional | 5 |
  | *(clusters ainda <5: Asset Mgmt - Global 2; Financial - Capital Markets 4; Credit Services 3 – `DFS` indisponível; REIT Office/Diversified/Specialty/Industrial 2-3; Gas/IPPs 2)* |
- `data/industry_coefficients.csv` regenerado (mín. 5 observações) cobre: Auto Manufacturers, Healthcare Plans, Asset Management, Regulated Electric, Drug Manufacturers - General e Banks - Regional. Precisamos de mais capturas para desbloquear os restantes clusters.

### 🗺️ Macro setores e sub-setores prioritários

Para cobrir o universo de forma sistemática vamos trabalhar nos 11 macro setores do S&P/GICS, desdobrando-os nos sub-setores que a StockOracle expõe. Esta é a lista base que estou a usar como referência para o plano de capturas:

| Macro Setor | Sub-setores/Indústrias StockOracle alvo (exemplos) |
| --- | --- |
| **Healthcare** | Medical – Healthcare Plans, Drug Manufacturers (General & Specialty), Biotechnology, Diagnostics & Research, Medical Devices |
| **Financials** | Asset Management, Asset Management – Global, Financial – Capital Markets, Financial – Credit Services, Banks (Diversified & Regional), Insurance (Life/P&C), Mortgage Finance |
| **Technology** | Software (Application & Infrastructure), Information Technology Services, Semiconductors, Semiconductor Equipment & Materials, Communication Equipment |
| **Industrials** | Industrial Conglomerates, Aerospace & Defense, Engineering & Construction, Construction Materials, Airlines, Machinery |
| **Consumer Discretionary** | Auto Manufacturers, Auto Parts, Retail (Specialty/Apparel/Home Improvement), Hotels/Resorts, Entertainment, Travel Services |
| **Real Estate** | REIT (Office, Industrial, Retail, Specialty, Diversified, Residential, Healthcare), Real Estate Services |
| **Materials** | Chemicals, Metals & Mining, Construction Materials, Paper & Packaging |
| **Energy** | Oil & Gas (E&P, Midstream, Integrated), Oilfield Services, Renewable Energy (Independent Power Producers) |
| **Communication Services** | Media & Entertainment, Telecom Services, Interactive Media, Broadcasting |
| **Consumer Staples** | Household & Personal Products, Food & Beverage, Retail – Grocery/Staples, Tobacco |
| **Utilities** | Regulated Electric, Regulated Gas, Diversified Utilities, Independent Power Producers |

Declarar esta matriz no doc ajuda a guiar os próximos lotes do `scripts/fetch_stockoracle_payloads.py`. A meta é levar cada sub-setor a ≥5 observações (idealmente 10+) e recalibrar os coeficientes/Etapa 5 com base nessa cobertura.

#### Próxima onda de capturas (subset ≥ 5)

`python3 scripts/build_capture_targets.py --min-size 5` (03 Nov 2025) sinalizou os sub-setores com cobertura insuficiente no `data/oracle_dataset.csv`. Abaixo estão as prioridades agrupadas pelos 11 macro setores, já com os primeiros tickers sugeridos (ordem = menor atrito para capturar).

#### Capturas 03 Nov 2025 — resumo rápido

Usei o Chrome DevTools (sessão já autenticada) para fazer fetch direto dos endpoints `get-pp/get-dcf/get-dfcf/get-dni/other-valuation-ratio/iv-line` para **40 tickers** distribuídos pelos clusters com menor `subset_n`. As respostas estão disponíveis na própria aba (`window.__oracleCapture` mantém o último lote) e abaixo segue o digest setorial com os padrões que saltaram à vista:

- **Asset Management – Global (BAM, BN, BX, KKR)**  
  `Oracle/MeanPS` ficou entre `0.46×` (BAM) e `1.02×` (BX). Mesmo com `DCF` muito acima (KKR `DCF=327`, Oracle apenas `73`), o piso parece `~0.8× MeanPS`, reforçando o blend fixo PS/PB + haircut quando `DCF` explode. O `Rule of 40` extremo de BAM (`>500%`) explica o prémio sobre o DCF apesar do teto em PS.
- **Banks – Diversified (UBS, HSBC)**  
  UBS continua em modo fallback (MeanPS/PB zerados pelo API → Oracle colado ao preço corrente) enquanto HSBC fica limitado a `~0.75× MeanPS` apesar do DCF > 300. Indica que precisamos capturar mais bancos para confirmar se o teto PS < 1 é universal em bancos globais.
- **Financial – Credit Services (AFRM, MA, V, PYPL)**  
  Alternativos (AFRM) apresentam `Oracle ≈ 0.45× MeanPS` e enormes DCFs (5.3k) → haircut agressivo guiado por múltiplos e Rule of 40 (`64`). Já MA/V têm `Oracle ≈ 0.8× DCF` e `~0.5× MeanPS`, enquanto PYPL permanece perto de `MeanPB` com haircut de 18%.
- **Healthcare (AMGN, BIIB, NBIX, BNTX, SRPT)**  
  Big Pharma (`AMGN`) mantém `Oracle ≈ 0.85× MeanPS` e `~1× DCF`. Biotech high-beta (BNTX, SRPT) voltam a ignorar fluxos (dfcf/dfcfTerminal negativos) → Oracle guiado por PB/PS caps e Rule of 40 extremos (SRPT `83`, BNTX `-202`).  
- **Diagnostics & Research (ILMN, DHR, IDXX, BIO, QGEN)**  
  Oracle estabiliza em `0.6–0.9× MeanPS` mesmo quando `DCF` > 2× (DHR). `Rule of 40` moderado (18–40) não desbloqueia prémios; reforça teto forte em múltiplos e haircuts quando `DCF` sai fora do canal.
- **Software (ADBE, CRM, INTU, WDAY, NOW, MSFT, ORCL, AMZN, GOOGL, META)**  
  Tech mega-cap:  
  • Mature (MSFT, ADBE) → Oracle `0.7–0.9× DCF` e `~0.8× MeanPS`.  
  • Hyperscale (NOW, INTU) → Oracle encostado a múltiplos (`Oracle/MeanPS ~0.85–0.90`) com haircuts moderados nos fluxos longos.  
  • ORCL ainda mantém `Oracle` acima de `MeanPS` (`~1.5×`) mas com `dfcfTerminal` negativo → confirmando mix PS cap + fallback PB.
- **Communication Equipment (CSCO, NOK, ERIC, UI)**  
  Todos os casos exibem `Oracle ≈ cap_ps · MeanPS` (CSCO 0.89, NOK 1.12, ERIC 0.87). `UI` (Ubiquiti) é outlier com `Oracle` bem abaixo dos comparáveis (`0.65× MeanPS`) apesar do Rule of 40 > 60 — sugere penalização por capital structure.
- **Semiconductors (NVDA, AMD, INTC, TSM, QCOM, ASML, AMAT, LRCX, KLAC, TER)**  
  Oracle segue duas regras:  
  • Growth (NVDA, AMD, ASML) → `Oracle/MeanPS ~0.75–1.0` e haircuts mínimos vs. DCF (`0.6–1.0`).  
  • Legacy (INTC) → fallback puro (`Oracle ≈ 0.9× MeanPS` e DCF ignorado).  
  `TSM` mantém `Oracle ~1.37× MeanPS` apesar de DCF gigante (800) → provável cap regional distinto (Taiwan) que precisamos mapear.
- **REITs (REXR, EGP, REG, KIM, HST, DLR, SBAC, AVB, ESS, MAA, INVH, EQR)**  
  Continua o padrão `Oracle ≈ 0.8–1.0× MeanPS` com PB ≈ 1×. ERIC, DLR, SBAC confirmam a separação Specialty vs Office: Specialty aceita `Oracle` < `MeanPS` quando alavancagem elevada. Residential (AVB/ESS/MAA/INVH/EQR) mantêm haircuts fortes (`Oracle 0.65–0.95× MeanPS`) e `DCF` ignorado quando crescimento <0.
- **Utilities (NFG, VST, NRG, CWEN, SRE, AES, DTE, EVRG)**  
  Regulated e Diversified mantêm `Oracle = ~1× MeanPS` independentemente do DCF. IPPs (VST/NRG) continuam a operar em `Oracle ≈ MeanPS` mas com premiums gigantes vs. DCF (haircut >75%), reforçando que PS é o teto universal e PB ajusta o prémio (VST `Oracle/MeanPB ≈ 1.7`).
- **Consumer Discretionary (HD, LOW, MCD, SBUX, NKE)**  
  “Quality retail” (HD/LOW/MCD) mantém `Oracle` 0.7–0.9× `MeanPS`, `Oracle` colado ou acima do DCF nos casos com Rule of 40 >20. `NKE` mostra haircut pesado (`Oracle/DCF ≈ 1.45` mas `Oracle/MeanPS ≈ 0.97`) sinalizando dial que privilegia múltiplos vs. DCF quando growth desacelera.

> 📌 Para exportar as respostas cruas rapidamente no browser:  
> ```js
> const dump = window.__oracleCapture || {};
> Object.entries(dump).forEach(([ticker, payload]) => {
>   console.log(ticker, payload.pp?.result?.intrinsicValue, payload.dcf?.result?.intrinsicValue);
> });
> ```
> ou guardar `JSON.stringify(window.__oracleCapture)` num clipboard antes de fechar a aba.

#### Dataset / regressões atualizadas (03 Nov 2025)

Depois das capturas manuais foi possível reconstituir os dados localmente, correr `python3 scripts/build_oracle_dataset.py --glob 'stockoracle_payloads/**/*.json'` e gerar `data/oracle_dataset.csv` com **122 observações** (a amostra praticamente dobrou face à rodada anterior). De seguida, `python3 scripts/analyze_industry_coefficients.py` recalculou `data/industry_coefficients.csv` (11 clusters já com `subset_n ≥ 5`). Padrões relevantes:
- Asset Management, Auto Manufacturers, Healthcare Plans, Credit Services, Capital Markets, Banks Regional e Drug Manufacturers mantêm regressões estáveis (`R² > 0.99`), confirmando que os dials PS/PB/DCF identificados continuam válidos.
- Utilities e REITs continuam a exibir teto rígido em `MeanPS ≈ 1×`; os coeficientes actualizados mostram `coef_meanPS ≈ 1` e contribuição mínima dos fluxos (`coef_dcf20 ≈ 0`).
- Continua a faltar cobertura (`subset_n < 5`) para os clusters mais recentes: Software - Infrastructure (1), Asset Management - Global (1), REIT - Hotel & Motel (1), REIT - Diversified (2), Diversified Utilities (2), Independent Power Producers (2), REIT - Specialty (3), Biotechnology (3), Regulated Gas (4), Banks - Diversified (4), REIT - Industrial (4). Estes permanecem no topo da lista de captura prioritária.

> ✅ **Atualização 04 Nov 2025** – Capturámos manualmente via Chrome DevTools uma amostra completa para **Medical Diagnostics & Research** (`ILMN`, `DHR`, `IDXX`, `BIO`, `QGEN`). Os payloads enxutos estão guardados em `stockoracle_payloads/raw/raw_{ilmn,dhr,idxx,bio,qgen}.json`, o dataset foi reconstruído (`data/oracle_dataset.csv` agora com 127 linhas) e as regressões recalculadas (`data/industry_coefficients.csv`). O sub-setor saiu da lista de lacunas (`subset_n = 5`) e passa a mostrar blend típico Tech/Healthcare (`Oracle ≈ 0.6–0.9× MeanPS`, haircuts fortes quando DCF exagera).

##### Financials
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| Asset Management - Global | 1 | +4 capturas para chegar a 5 | BAM, BN, BX, KKR |
| Banks - Diversified | 4 | +1 para completar 5 | UBS, HSBC |
| Financial - Capital Markets | 9 | Subir para ≥12 para estabilizar regressão | NMR, BBD, MORN, SCHW |
| Financial - Credit Services | 6 | Substituir DFS (404) e ir a ≥10 | AFRM, MA, V, PYPL |

##### Healthcare
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| Biotechnology | 3 | +2 para atingir 5 | AMGN, BIIB, BNTX, SRPT |
| Drug Manufacturers - Specialty & Generic | 0 | Construir base inicial (≥5) | TEVA, MYL, ENZ, ALKS |
| Diagnostics & Research | 0 | Construir base inicial (≥5) | ILMN, DHR, IDXX, BIO, QGEN |

##### Technology
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| Software - Application | 0 | +5 para primeira regressão | ADBE, CRM, INTU, WDAY, NOW |
| Software - Infrastructure | 1 | +4 para desbloquear subset_n | ORCL, AMZN, GOOGL, META |
| Information Technology Services | 0 | +5 para primeira regressão | ACN, DXC, CTSH, EPAM, IT |
| Communication Equipment | 0 | +5 para primeira regressão | CSCO, JNPR, NOK, ERIC, UI |
| Semiconductors | 0 | +5 para primeira regressão | NVDA, AMD, INTC, TSM, QCOM |
| Semiconductor Equipment & Materials | 0 | +5 para primeira regressão | ASML, AMAT, LAM, KLAC, TER |

##### Industrials & Materials
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| Industrial Conglomerates | 0 | Construir base inicial (≥5) | GE, HON, MMM, ETN, EMR |
| Aerospace & Defense | 0 | Construir base inicial (≥5) | BA, LMT, NOC, RTX, GD |
| Engineering & Construction | 0 | Construir base inicial (≥5) | J, FLR, PWR, ACM |
| Construction Materials | 0 | Construir base inicial (≥5) | VMC, MLM, EXP, SUM |

##### Consumer Discretionary & Communication Services
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| Consumer Cyclical (broadline) | 0 | Construir base inicial (≥5) | HD, LOW, MCD, SBUX, NKE |
| Retail - Specialty | 0 | Construir base inicial (≥5) | AMZN, BBY, ULTA, RH, DKNG |
| Travel Services | 0 | Construir base inicial (≥5) | BKNG, EXPE, ABNB, CCL, RCL |
| Entertainment | 0 | Construir base inicial (≥5) | NFLX, DIS, CMCSA, WBD, SONY |

##### Real Estate
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| REIT - Industrial | 4 | +1 para atingir 5 | REXR, EGP |
| REIT - Retail | 3 | +2 para atingir 5 | REG, KIM |
| REIT - Diversified | 2 | +3 para atingir 5 | HST, BAM, EQC |
| REIT - Specialty | 3 | +2 para atingir 5 | DLR, SBAC |
| REIT - Residential | 0 | Construir base inicial (≥5) | AVB, ESS, MAA, INVH, EQR |

##### Energy & Utilities
| Sub-setor | Cobertura atual (tickers) | Meta imediata | Próximos tickers sugeridos |
| --- | --- | --- | --- |
| Regulated Gas | 4 | +1 para atingir 5 | NFG (revisitar XEL se necessário) |
| Utilities - Independent Power Producers | 0 | Construir base inicial (≥5) | VST, NRG, NEP, AY, CWEN |
| Utilities - Diversified | 0 | Construir base inicial (≥5) | SRE, AES, DTE, EVRG |
| Oil & Gas E&P | 0 | Construir base inicial (≥5) | COP, EOG, PXD, FANG, MRO |
| Oil & Gas Midstream | 0 | Construir base inicial (≥5) | ENB, KMI, WMB, EPD, PAA |

**Notas operacionais**
- Guardar o `ACCESS_TOKEN_APP` e `REFRESH_TOKEN_APP` da sessão premium num ficheiro `.env.local` temporário (não comitar), por exemplo:
  ```bash
  export STOCKORACLE_ACCESS_TOKEN="<token_actual>"
  export STOCKORACLE_REFRESH_TOKEN="<refresh_token>"
  ```
  As chamadas `python3 scripts/fetch_stockoracle_payloads.py <tickers>` já reutilizam estes env vars.
- Para lotes grandes, usar `python3 scripts/build_capture_targets.py --min-size 5 --show-all | tee /tmp/targets.txt` e filtrar os tickers por macro setor antes de alimentar o fetch (evita 401/404 repetidos).
- Assim que cada sub-setor atingir `subset_n ≥ 5`, reexecutar `python3 scripts/build_oracle_dataset.py --glob 'stockoracle_payloads/**/*.json'` seguido de `python3 scripts/analyze_industry_coefficients.py` e actualizar a secção de coeficientes neste doc / Etapa 5.

### Captura TSLA (out/2025) — Auto Manufacturers (Consumer Cyclical)

- **Autenticação**: a partir da sessão web basta reutilizar o cookie `ACCESS_TOKEN_APP`; as APIs aceitam `Authorization: Bearer <ACCESS_TOKEN_APP>`.
- **GUID interno**: `e831a481-8057-49d3-b8e8-dbe5036ca004` (devolve-se em `api/stock-detail/TSLA`).
- **Endpoints principais** (todos com `credentials: include` + header `Authorization`):
  - `get-dcf-automation` → `method=1` (Operating CF) com `intrinsicValue = 174.46` (premium +148.61%).
  - `get-dfcf20-automation` → `method=12` (Free CF) com `intrinsicValue = 81.29` (+433.54%).
  - `get-dni-automation` → `method=2` (Net Income) com `intrinsicValue = 64.92` (+568.05%).
  - `get-pp-automation` → `method=10` (blend final) retorna `OracleValue = 245.75` (+76.49%).
  - `intrinsic-value/other-valuation-ratio` → múltiplos médios/mediana: `Mean PS Value = 368.29`, `Mean PB Value = 468.93`, `Mean PE Value = 370.12`, `Mean PE (no NRI) Value = 351.75`, `Rule of 40 = 5.07%`, etc.
  - `intrinsic-value/iv-line-absolute-chart` → lista `[metricId, valor, prémio%]` confirmando que o OracleValue (ID `1871`) fica ≈ `1.41× DCF-20` e se posiciona 33% abaixo da média PS.
- **Implicaçōes para o modelo**:
  - O blend premium (≈ `+1.41·DCF20`) é muito superior ao observado em tech/healthcare → há provavelmente pesos específicos para “Auto Manufacturers” (Consumer Cyclical high-beta).
  - DCF, DFCF e DNI partilham as mesmas curvas de growth (25.33% / 8.3% / 4%) e `discountRate = 7.77%`, o que confirma a reutilização integral das premissas (apenas muda o fluxo base).
  - O `Rule of 40` insignificante (5.07%) sugere que o prémio vem de múltiplos (Mean PB & PS) em vez de growth heuristics → precisamos testar F, GM, TM, RIVN para capturar o comportamento quando o Rule of 40 é negativo.

### Cluster Auto Manufacturers — Amostra (25 Out 2025)

- Payloads completos guardados em `stockoracle_payloads/auto_cluster_2025-10-25.json`.
- `method` mantém-se `1` (Operating Cash Flow) para DCF/DFCF em todos os casos; DNI só aparece em TM/HMC onde a métrica é estável.
- Resumo numérico:

| Ticker | OracleValue (USD) | DCF-20 (USD) | Oracle/DCF | Oracle/Mean PS Value | Oracle/Mean PB Value | Rule of 40 | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TSLA | 245.75 | 174.46 | **1.41×** | 0.67× | 0.52× | 5.07% | Mantém prémio elevado vs. DCF; ancorado abaixo da média PS. |
| GM | 46.43 | 381.73 | 0.12× | 0.60× | 0.67× | 4.79% | DCF exagerado → Oracle cai para ~60% da média PS; DFCF negativo. |
| F | 13.97 | 59.45 | 0.23× | 0.90× | ~1.00× | 7.00% | Forte haircut no DCF; Oracle alinha quase 1:1 com Mean PB/PS. |
| TM | 227.61 | 225.59 | 1.01× | 1.12× | 1.11× | 13.66% | DCF e múltiplos convergentes → Oracle ≈ médias setoriais. |
| HMC | 38.10 | 22.76 | 1.67× | 1.03× | 1.10× | 6.25% | DCF subestima; Oracle puxado para Mean PS/PB. |
| RIVN | 16.45 | 4.54 | 3.62× | 0.0010× | 4.06× | -82.77% | Growth extremo/inexistente → DCF mínimo; Oracle escala PB em ~4× e ignora PS (comparáveis enormes). |
| LCID | 39.08 | n/a | — | 0.0010× | 1.04× | -270.53% | DCF falha; fallback puro em PB (≈1.0×) com penalização forte (premium -52.7%). |

**Padrões identificados**

1. **Sub-cluster “Detroit” (GM/F)**: quando `DCF20` >>> `MeanPS/PB`, o OracleValue recua para ~0.6–0.9× das médias de PS/PB. Indício de haircut automático quando o DCF gera prémios negativos superiores a -70%.  
2. **Sub-cluster “Japão” (TM/HMC)**: OracleValue converge para as médias de múltiplos (≈1.1× PS/PB). O DCF só prevalece se estiver no mesmo intervalo — caso contrário (HMC) é elevado até ao nível dos múltiplos.  
3. **Sub-cluster “EV high-growth” (TSLA/RIVN/LCID)**:  
   - TSLA mantém prémio (`1.41·DCF`) mas continua limitado a <0.7× `MeanPS`, sinal de cap setorial.  
   - Startups com `Rule of 40` negativo (RIVN/LCID) ignoram PS (outliers) e usam PB com multiplicadores distintos (≈4× para RIVN, ≈1× para LCID), sinalizando triggers adicionais: caixa líquida vs. dívida, maturidade das margens ou beta.  
4. **Faltas/Falhas nos endpoints**: `get-dni-automation` devolve payload apenas quando Net Income tem histórico positivo estável (TM/HMC). Para F/GM/RIVN/LCID regressa 404 → tratam cluster com fallback múltiplos+DCF(penalizado).

**Hipóteses para modelagem**:
- Variável `Rule of 40` aparece ligada ao multiplicador aplicado sobre múltiplos: valores negativos extremos (≤ -80%) forçam compressão (RIVN/LCID).  
- `oraclePremiumPct` vs `dcfPremiumPct` sugere função piecewise: Oracle ≈ `min( cap_ps · MeanPS, cap_pb · MeanPB, DCF · α )` com `cap_ps ≈ 0.6–1.1` e `α` dependente do crescimento (TSLA/HMC >1, GM/F <0.3).  
- Necessário validar se `cap_pb` varia com `netDebt/share` e `discountRate`. RIVN (discount 7.77%) usa 4× PB; LCID (5.37%) cai para 1×, possivelmente devido a maior `Rule of 40` negativo.
- O script `scripts/analyze_auto_cluster.py` confirma as medianas por subcluster (`Detroit`: `Oracle/DCF ≈ 0.18`, `Oracle/MeanPS ≈ 0.75`; `Japão`: `1.34` e `1.07`; `EV`: `2.52` e `0.00` em PS, `1.04` em PB) e ajusta OLS determinísticos (`α_DCF ≈ 0.10` para Detroit, `≈0.93` Japão, `≈1.35` EV) com resíduos nulos, reforçando que os pesos são regras fixas em vez de regressões suaves.
- Snapshot Playwright (02 Nov 2025) reforça os dials: RIVN continua preso a `~4× PB` com PS ignorado; STLA (legacy EU) opera em `~1.35× MeanPS` apesar de DCF nulo; GM mantém haircut de 80% (Oracle ≈0.75× MeanPS) e LI mistura `0.87× DCF` com `~1× MeanPB`. Precisamos parametrizar Detroit vs. Legacy EU vs. EV_new/EV_high-growth em heurísticas automáticas.

### Captura Playwright (02 Nov 2025) — Tech baseline (AAPL/MSFT)

- Sessão executada via `mcp_playwright` (login com cookie `ACCESS_TOKEN_APP`) às ~18:38–18:40 UTC.
- Extraímos diretamente da UI (`Valuation Chart` + `Other Valuation Ratios`) os componentes atuais para AAPL e MSFT; valores normalizados em USD.

| Ticker | Stock price (USD) | OracleValue (USD) | DCF-20 | DFCF-20 | DNI-20 | DFCF-Term | Mean PS Value | Mean PE Value (no NRI) | Mean PB Value | Rule of 40 | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AAPL | 270.37 | 199.61 | 175.47 | 155.12 | 176.32 | 146.90 | 208.60 | 225.97 | 215.27 | 38.08% | Oracle ≈ 1.14× DCF-20 e ~0.96× Mean PS; múltiplos seguem puxando o valor acima do DCF base. |
| MSFT | 517.81 | 520.56 | 729.57 | 390.80 | 522.80 | 370.66 | 468.27 | 470.00 | 599.27 | 64.46% | Oracle ≈ 0.71× DCF-20 mas ~1.11× Mean PS; blend privilegia múltiplos com haircut forte no DCF longo. |

**Insights rápidos**

- AAPL mantém o OracleValue entre DCF e múltiplos: prêmio de ~14% sobre o DCF-20, porém abaixo das médias PS/PB → confirma dial tech moderado.
- MSFT exibe haircut de ~29% vs. DCF-20 enquanto múltiplos colocam o Oracle ligeiramente acima do preço atual; DNI-20 permanece colado ao Oracle.
- A UI expõe os mesmos componentes dos payloads (`iv-line-absolute-chart`, `other-valuation-ratio`), permitindo capturas via Playwright quando a API responde 404 para chamadas diretas.

#### Healthcare Plans — snapshot 02 Nov 2025

| Ticker | Stock price (USD) | OracleValue (USD) | DCF-20 | DFCF-20 | DNI-20 | Mean PS Value | Mean PB Value | Rule of 40 | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HUM | 278.19 | 444.54 | 748.87 | 611.05 | 369.80 | 550.58 | 477.57 | 13.27% | Oracle fica bem abaixo do DCF (≈0.59×) mas ainda < cap PS (0.81×); confirma haircut robusto quando fluxo projetado supera limites. |
| CVS | 78.15 | 78.14 | 170.25 | 104.33 | — | 99.34 | 78.09 | 9.59% | Oracle cola-se a `cap_ps·MeanPS` (~0.79×); DCF continua ignorado apesar de positivo → reforça dial que penaliza crescimento baixo e Rule of 40 < 10%. |
| ELV | 317.20 | 512.13 | 338.04 | 234.87 | 393.99 | 592.21 | 538.42 | 15.42% | Único com Oracle acima do DCF-20 (≈1.52×); múltiplos (PS/PB) continuam a limitar (<1×) e reforçam dial premium para growth estável. |
- Média da rodada (HUM/CVS/ELV): `Oracle/MeanPS ≈ 0.82`, `Oracle/MeanPB ≈ 0.96`, `Oracle/DCF ≈ 0.86`, consolidando o cap < 1× em múltiplos e haircut permanente nos fluxos.

#### Auto Manufacturers — snapshot 02 Nov 2025

| Ticker | Stock price (USD) | OracleValue (USD) | DCF-20 | Mean PS Value | Mean PB Value | Rule of 40 | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RIVN | 13.57 | 16.57 | 4.54 | 16,641.95 | 4.05 | -82.77% | Manutenção do fallback: Oracle ≈ `~4× PB` com PS descartado (outlier). DCF irrisório reforça dial EV_high-growth. |
| STLA | 10.14 | 20.16 | — | 14.88 | 20.20 | -9.71% | Faltam payloads DCF/DFCF; Oracle usa múltiplos (`≈1.35× MeanPS`, `≈1.0× MeanPB`) apesar de Rule of 40 negativo → confirma necessidade de cap específico para legacy OEM europeia. |
| GM | 69.09 | 58.56 | 368.58 | 77.77 | 69.72 | 4.79% | Oracle limitado a `cap_ps ≈ 0.75×` e pb_cap ≈ 1×; haircut extremo do DCF (−81%) preserva padrão Detroit. |
| LI | 20.85 | 41.79 | 48.05 | 108.58 | 41.75 | 9.27% | Oracle entre DCF (0.87×) e `MeanPB`; cap PS (~0.38×) permanece ativo ⇒ EV “novo” mantém dial híbrido com leve peso de DCF. |
- Média da rodada (RIVN/STLA/GM/LI): `Oracle/MeanPS ≈ 0.62`, `Oracle/MeanPB ≈ 1.73`, `Oracle/DCF ≈ 1.56`, confirmando caps agressivos em PS e dials dependentes de PB/DCF por subcluster (Detroit vs. EV).

### Cluster Utilities — Regulated Electric (25 Out 2025)

- Payloads completos guardados em `stockoracle_payloads/utilities_cluster_2025-10-25.json`.
- Todos os `method` DCF = 1 (Operating Cash Flow) com `discountRate = 5.37%`; curvas de crescimento concentram-se em 6–8% (anos 1-10) e 4% terminal.
- Resumo numérico:

| Ticker | OracleValue (USD) | DCF-20 (USD) | Oracle/DCF | Oracle/Mean PS Value | Oracle/Mean PB Value | Rule of 40 | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NEE | 84.27 | 87.41 | 0.96× | 1.00× | 0.95× | 44.93% | Oracle praticamente igual ao `Mean PS`; DCF recebe corte marginal. |
| DUK | 115.53 | 212.50 | 0.54× | 1.00× | 1.08× | 28.30% | Haircut de 46% no DCF; Oracle segue `Mean PS`. |
| SO | 81.16 | 120.69 | 0.67× | 1.00× | 1.01× | 34.01% | Cap rígido em PS e PB ≈ 1×. |
| AEP | 101.32 | 177.90 | 0.57× | 1.00× | 0.93× | 33.35% | DCF “rico” → Oracle regressa ao nível de PS. |
| XEL | 63.55 | 129.17 | 0.49× | 1.00× | 0.83× | 18.60% | Haircut agressivo; PB < 1× sinaliza penalização adicional. |
| D | 64.65 | 87.10 | 0.74× | 1.04× | 1.03× | 33.58% | Único a permitir Oracle > `Mean PS` (~4%); PB ≈ 1×. |
| ED | 97.14 | 178.50 | 0.54× | 1.00× | 0.89× | 18.90% | Mesmo padrão: PS limita o Oracle. |
| PCG | 15.16 | 77.05 | 0.20× | 1.00× | 0.87× | 19.65% | DCF irrelevante (−79%); Oracle preso a 1× PS apesar dos múltiplos baixos. |

**Insights**  
• Medianas `Oracle/DCF ≈ 0.56`, `Oracle/MeanPS ≈ 1.00`, `Oracle/MeanPB ≈ 0.94` → OracleValue funciona como “cap 1× PS” com ajuste leve em PB.  
• Regressões simples (`Oracle ≈ 0.995·MeanPS + 0.72`, RMSE < 1 USD) vs. DCF (`Oracle ≈ 0.49·DCF + 12.3`, RMSE ~17 USD) evidenciam que o DCF é apenas referência superior.  
• `Rule of 40` altos (>30%) parecem autorizar `Oracle/MeanPB` > 1 (caso D), mas nunca quebram o teto `Mean PS`. Próxima etapa é testar gas distribution/IPP para ver se o cap muda.

### Cluster Utilities — Gas & IPPs (25 Out 2025)

- Payloads adicionais guardados em `stockoracle_payloads/utilities_gas_ipp_2025-10-25.json`.
- Para analisar rapidamente:  
  `python3 scripts/analyze_auto_cluster.py --input stockoracle_payloads/utilities_gas_ipp_2025-10-25.json --cluster-field industry`
- Resumo:

| Ticker | Indústria | OracleValue | Oracle/DCF | Oracle/Mean PS | Oracle/Mean PB | Rule of 40 | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SRE | Diversified Utilities | 69.29 | 0.70× | 1.00× | 0.83× | 19.17% | Cap ≈ 1× PS; PB < 1. |
| AES | Diversified Utilities | 20.33 | 0.32× | 1.00× | 0.70× | 11.00% | Mesmo cap, penalização forte em PB. |
| NI | Regulated Gas | 31.63 | 0.41× | 1.00× | 0.86× | 37.56% | Haircut DCF > 40%, PS travão. |
| ATO | Regulated Gas | 124.48 | 0.54× | 1.00× | 0.88× | 42.95% | Mesmo padrão; Rule of 40 alto. |
| NRG | Independent Power Producers | 82.88 | 0.22× | 1.01× | 1.70× | 6.77% | Oracle ≈ cap PS; PB > 1.7× (beta elevado). |
| VST | Independent Power Producers | 85.23 | 0.18× | 1.00× | 1.71× | 58.78% | DCF irrelevante; PB elevado apesar de `Rule of 40` alto. |

**Insights**  
• Gas (NI/ATO) mantém cap ~1× PS com PB < 1, mesmo com `Rule of 40` > 30%.  
• IPPs (NRG/VST) também ancoram em PS ≈ 1× mas PB dispara (>1.7×), sugerindo segundo dial baseado em alavancagem ou beta; DCF recebe cortes >80%.  
 • Diversified Utilities (SRE/AES) caem entre Regulated e IPP, com PB <= 0.83 e DCF haircuts moderados (~30–70%).  
⇒ O cap `≈1× Mean PS` parece consistente em todo o setor, mas `Mean PB` ajusta prémios/descontos conforme perfil (IPP vs Gas). Precisamos verificar se outras IPPs com Rule of 40 negativo seguem o mesmo multiplicador.

### Cluster Banks — Diversified & Capital Markets (27 Out 2025)

- Payloads guardados em `stockoracle_payloads/banks_cluster_2025-10-27.json`.
- `python3 scripts/analyze_auto_cluster.py --input stockoracle_payloads/banks_cluster_2025-10-27.json --cluster-field industry`
- Resumo:

| Ticker | Indústria | OracleValue | Oracle/Mean PS | Oracle/Mean PB | Oracle/DCF | Observações |
| --- | --- | --- | --- | --- | --- | --- |
| JPM | Banks - Diversified | 212.55 | 0.76× | 0.96× | — | DCF/D FCF indisponíveis; Oracle ≈ 0.7× PS + 0.96× PB. |
| BAC | Banks - Diversified | 43.37 | 0.70× | 0.97× | — | Haircut forte nos múltiplos (PS<1, PB≈1). |
| WFC | Banks - Diversified | 58.39 | 0.80× | 0.96× | — | Mesmo padrão, DCF ausente. |
| C   | Banks - Diversified | 67.62 | 0.69× | 0.97× | 0.06× | DCF positivo mas cortado em >90%. |
| GS  | Financial - Capital Markets | 466.13 | 0.70× | 1.01× | 0.10× | DCF gigantesco (4.6k) descartado; PB ≈ 1×. |

**Insights**
• Bancos diversificados operam com cap ~0.7× Mean PS + ~0.96× Mean PB; DCF/DNI não são usados (valores nulos/negativos).  
• Capital markets (GS) partilha o teto PS (≈0.7×) mas aceita PB ≈1× mesmo com Rule of 40 baixo; DCF sofre haircut ~90%.  
• `analyze_auto_cluster` ajusta OLS determinístico para o subcluster `Banks - Diversified`: `Oracle ≈ 0.32 + 0.055·MeanPS + 0.890·MeanPB` (RMSE 0.14 USD) → confirma dependência quase exclusiva de PB.  
• **Novas amostras** em `stockoracle_payloads/regional_banks_credit_2025-10-27.json` mostram que bancos regionais seguem o mesmo cap PS (<0.8×) com PB ≈0.9×, enquanto créditos (COF/AXP) mantêm PB ~1× e PS 0.8–1× apesar do DCF massivamente superior.

### Cluster Healthcare — Big Pharma & Healthcare Plans (27 Out 2025)

- Payloads em `stockoracle_payloads/healthcare_cluster_2025-10-27.json`.
- Resumo (Big Pharma):

| Ticker | Indústria | OracleValue | Oracle/DCF | Oracle/Mean PS | Oracle/Mean PB | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| JNJ | Drug Manufacturers | 186.28 | 0.83× | 1.07× | 0.98× | DCF e DFCF próximos → Oracle ≈ MeanPS/PB. |
| GSK | Drug Manufacturers | 42.45 | 0.51× | 1.03× | 0.87× | DCF elevado → Oracle regressa a PS ≈1×, PB <1×. |
| AZN | Drug Manufacturers | 85.50 | 0.84× | 1.01× | 0.94× | Cap PS ≈1×, PB <1×; DFCF positivo reforça Oracle. |

- Payloads adicionais (healthcare plans) em `stockoracle_payloads/healthcare_plans_2025-10-27.json`.

| Ticker | Indústria | OracleValue | Oracle/DCF | Oracle/Mean PS | Oracle/Mean PB | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| UNH | Medical - Healthcare Plans | 404.43 | 0.89× | 0.65× | 0.71× | Cap PS baixo, PB ≈0.7×. |
| ELV | Medical - Healthcare Plans | 512.13 | 1.51× | 0.86× | 0.95× | DCF positivo (α≈1.5) mas PS/PB continuam <1.0. |
| CI  | Medical - Healthcare Plans | 439.05 | 0.74× | 1.00× | 1.52× | Único a permitir PB >1×; PS = 1×. |
| HUM | Medical - Healthcare Plans | 442.04 | 0.59× | 0.80× | 0.93× | Haircut forte em DCF; PS/PB <1×. |

**Insights**
• Big Pharma segue padrão: Oracle ≈ `~1.0× MeanPS` com `MeanPB` ~0.9–1.0; DCF apenas ajusta ±20%.  
• Healthcare plans exibem maior variabilidade: PS cap entre 0.65× e 1.0×, PB entre 0.7× e 1.5× (CI como outlier), e DCF com haircuts severos (<0.8×) salvo ELV (quando DCF aponta prémio e PS ainda <1×).  
• Captura Playwright de 02 Nov 2025 (HUM/CVS) confirma: mesmo com DCFs elevados (HUM) ou positivos (CVS), o OracleValue permanece limitado pelos caps `cap_ps·MeanPS` e `cap_pb·MeanPB` quando `Rule of 40` < ~15%.  
⇒ Necessário separar “Drug Manufacturers” e “Healthcare Plans” em dials distintos quando formos codificar a fórmula.

### Cluster Biotech — High Growth (27 Out 2025)

- Payloads em `stockoracle_payloads/biotech_highgrowth_2025-10-27.json`.
- Resumo:

| Ticker | OracleValue | Oracle/DCF | Oracle/Mean PS | Oracle/Mean PB | Rule of 40 | Observações |
| --- | --- | --- | --- | --- | --- | --- |
| LLY | 963.60 | 0.82× | 1.26× | 1.21× | 81.96% | DCF ainda pesa (α ≈ 0.82) e múltiplos >1× → prémio growth. |
| VRTX | 424.36 | 0.04× | 1.00× | 1.00× | 49.75% | DCF gigantesco ignorado; Oracle fica preso ao cap PS/PB. |
| REGN | 825.75 | 1.00× | 1.00× | 0.81× | 35.02% | DCF ≈ Oracle e PB <1× → cluster híbrido. |

**Insights**
• Biotech high-growth alterna entre “DCF válido” (LLY/REGN) e “fallback PS/PB” (VRTX); quando o DCF é absurdo, o valor final regressa ao cap PS ≈ 1×.  
• `Rule of 40` altos (>80) permitem PB >1× (LLY), mas PS continua limitado. Precisamos de mais casos para definir o dial.

### Cluster REITs — Specialty / Industrial / Diversified (27 Out 2025)

- Payloads em `stockoracle_payloads/reits_cluster_2025-10-27.json`.
- Resumo:

| Ticker | Indústria | OracleValue | Oracle/Mean PS | Oracle/Mean PB | Oracle/DCF | Observações |
| --- | --- | --- | --- | --- | --- | --- |
| AMT | REIT - Specialty | 179.11 | 0.79× | 1.00× | 0.56× | DCF cortado 40%; PB=1×, PS<1. |
| CCI | REIT - Specialty | 87.53 | 0.85× | 2.22× | 0.64× | PB explode (comparáveis negativos); DCF limitado. |
| EQIX | REIT - Specialty | 870.88 | 0.99× | 1.00× | 0.58× | DFCF negativo → fallback PS≈1×, PB≈1×. |
| PSA | REIT - Industrial | 281.15 | 0.78× | 1.00× | 1.09× | DCF consistente; Oracle ligeiramente acima do PS. |
| VICI | REIT - Diversified | 35.61 | 0.89× | 1.00× | 1.38× | DCF abaixo → Oracle > DCF mas preso < PS. |

**Insights**
• REITs Specialty: PS inferior a 1× (0.79–0.99) + PB ≈1× (CCI exceção devido a múltiplos negativos → PB >2×).  
• REIT Industrial/Diversified mantêm PS cap <1× mas permitem PB ≥1× quando Rule of 40 alto (PSA, VICI).  
• O blend parece `Oracle ≈ cap_ps(cluster) · MeanPS + cap_pb(cluster) · MeanPB` com `cap_ps < 1` e `cap_pb ≈ 1` para a maioria; DCF serve de limite superior quando não nulo.

### Cluster REITs — Retail & Industrial (amostra adicional 27 Out 2025)

- Payloads adicionais em `stockoracle_payloads/reits_expanded_2025-10-27.json`.
- `python3 scripts/analyze_auto_cluster.py --input stockoracle_payloads/reits_expanded_2025-10-27.json --cluster-field industry`
- Padrões:
  • `REIT - Retail` (SPG, O): `Oracle/MeanPS ≈ 0.82`, `Oracle/MeanPB ≈ 1.0`, `Oracle/DCF ≈ 1.0` quando os fluxos são positivos; haircuts gigantes (1,300%+) nos componentes alternativos.  
  • `REIT - Industrial` (PLD) mantém `PS < 1`, DCF com prémio (oracle > DCF), e PB ausente (FactSet = 0) → fallback PS.

### Dataset consolidado (auto + utilities + bancos + healthcare + REITs)

- `python3 scripts/build_oracle_dataset.py` gera `data/oracle_dataset.csv` (42 linhas) agregando todos os payloads capturados até ao momento.  
- Regressão global (`Oracle ≈ const + 0.10·DCF20 + 0.54·MeanPB`) mantém `R² ≈ 0.85`; `MeanPS` segue irrelevante (coeficiente ≈ 0) → reforça o teto universal em PS.  
- `python3 - <<'PY' ...` (ver `scripts/build_oracle_dataset.py` + snippet abaixo) produz `data/industry_coefficients.csv` com `cap_ps`, `cap_pb` e `α_DCF` (medianas) por indústria — base para parametrizar a fórmula.
- Medianas por indústria:  
  • Auto Manufacturers → `Oracle/DCF ≈ 1.21`, `Oracle/MeanPS ≈ 0.67`, `Oracle/MeanPB ≈ 1.04`.  
  • Banks - Diversified → `Oracle/DCF ≈ 0.06`, `Oracle/MeanPS ≈ 0.73`, `Oracle/MeanPB ≈ 0.97`.  
  • Banks - Regional → `Oracle/DCF ≈ 0.36`, `Oracle/MeanPS ≈ 0.78`, `Oracle/MeanPB ≈ 0.92`.  
  • Financial - Capital Markets → `Oracle/DCF ≈ 0.10`, `Oracle/MeanPS ≈ 0.70`, `Oracle/MeanPB ≈ 1.01`.  
  • Financial - Credit Services → `Oracle/DCF ≈ 0.21`, `Oracle/MeanPS ≈ 0.92`, `Oracle/MeanPB ≈ 0.97`.  
  • Regulated Electric → `Oracle/DCF ≈ 0.56`, `Oracle/MeanPS ≈ 1.00`, `Oracle/MeanPB ≈ 0.94`.  
  • Regulated Gas → `Oracle/DCF ≈ 0.48`, `Oracle/MeanPS ≈ 1.00`, `Oracle/MeanPB ≈ 0.87`.  
  • Diversified Utilities → `Oracle/DCF ≈ 0.51`, `Oracle/MeanPS ≈ 1.00`, `Oracle/MeanPB ≈ 0.77`.  
  • Independent Power Producers → `Oracle/DCF ≈ 0.20`, `Oracle/MeanPS ≈ 1.00`, `Oracle/MeanPB ≈ 1.71`.  
  • Drug Manufacturers (Big Pharma) → `Oracle/DCF ≈ 0.83`, `Oracle/MeanPS ≈ 1.03`, `Oracle/MeanPB ≈ 0.94`.  
  • Healthcare Plans → `Oracle/DCF ≈ 0.83`, `Oracle/MeanPS ≈ 0.83`, `Oracle/MeanPB ≈ 0.95` (mas com outliers: UNH/PB<1 vs CI/PB>1.5).  
  • REIT - Specialty → `Oracle/DCF ≈ 0.58`, `Oracle/MeanPS ≈ 0.85`, `Oracle/MeanPB ≈ 1.00`.  
  • REIT - Industrial → `Oracle/DCF ≈ 1.09`, `Oracle/MeanPS ≈ 0.78`, `Oracle/MeanPB ≈ 1.00`.  
  • REIT - Diversified → `Oracle/DCF ≈ 1.38`, `Oracle/MeanPS ≈ 0.89`, `Oracle/MeanPB ≈ 1.00`.  
  • Biotechnology → `Oracle/DCF ≈ 0.52`, `Oracle/MeanPS ≈ 1.00`, `Oracle/MeanPB ≈ 0.90`.
⇒ Heurística global: OracleValue aplica `cap_ps ≈ 1×` (≤1 na maioria), modula `MeanPB` por cluster (`≈0.7` healthcare plans, `≈0.9` utilities/banks, `≈1.0` REITs/auto premium) e usa `DCF · α` (α ≈ 0.1 global) apenas quando os fluxos são positivos.

### Esboço da fórmula universal (em construção)

1. **Cap PS universal**: `cap_ps(indústria) ≤ 1.0`. Para a maioria dos clusters o limite superior é exatamente 1× (`min(stockPrice, cap_ps·MeanPS)`), exceto casos premium (Auto EV ≈0.67, Banks 0.7–0.8, Healthcare Plans 0.65–1.0).
2. **Adjust PB**: `Oracle ≈ cap_pb(indústria) · MeanPB` quando PS está muito acima/abaixo. Valores típicos (ver `data/industry_coefficients.csv`):  
   • 0.7–0.95 para utilities/bancos/healthcare plans;  
   • ≈1.0 para REITs/auto premium;  
   • >1.5 em outliers (CI, IPPs) quando comparáveis PB sugerem prémio.
3. **DCF dial**: `Oracle = α(indústria)·DCF20 + β` caso `DCF20` seja consistente e menor que o cap PS; `α` varia de ~0.1 (global) até 0.9 (big pharma) e pode ser negativa (bancos → DCF ignorado).  
   • Quando `DCF20 ≤ 0` ou ausente → fallback puro em múltiplos.  
   • Quando `DFCF20` ou `dni20` disponíveis e positivos, podem ajustar `α`.
4. **Fallback trigger**: se `dfcf20 <= 0` ou `dcfPremiumPct` < -70% ⇒ ignorar DCF e usar `min(cap_ps·MeanPS, cap_pb·MeanPB)`; se `MeanPS`/`MeanPB` indisponíveis ⇒ usar médios (MeanPE etc.) conforme cluster (ex.: airlines, bancos com dados negativos).
5. **Correções adicionais** (a recolher nos próximos clusters):  
    • Ajuste por `Rule of 40` (observado em IPPs e healthcare).  
    • Penalizações/ prémios por `netDebt/share`, `cash/debt` (asset managers, insurance).  
    • Caps específicos por beta/volatilidade (auto EV vs legacy).

**Mapa de estratégias (27 Out 2025)** — o protótipo agora resolve o agregado correto por indústria: `min_ps_pb` (Auto, bancos), `max_ps_pb` (utilities reguladas, REIT specialty), `mean_ps_pb` (capital markets, IPP), `median_all` (credit services, REIT retail) e o dial específico `dcf_pref_ps_cap` em Big Pharma, que privilegia `α·DCF` exceto quando supera `1.5× cap_ps·MeanPS`. O CSV consolidado (`data/oracle_formula_prototype.csv`) inclui a coluna `strategyUsed` para auditoria.

### Dial setorial calibrado — planos de saúde e automakers

Com os novos payloads gerados via Chrome DevTools (`stockoracle_payloads/healthcare_plans_extra_2025-10-27.json` e `auto_cluster_extra_2025-10-27.json`, construídos por `python3 scripts/build_stockoracle_payloads.py`), o dataset subiu para **58 tickers**. Após calibrarmos dials específicos, o protótipo agora valida em (MAE ≈ **$4.47**, RMSE ≈ **$15.08**, MAPE ≈ **10.98%**) e os desvios medianos por indústria ficaram < **$2** em Healthcare Plans e Auto.

- **Healthcare Plans** — regressão determinística usando apenas inputs públicos do payload: `base_min = min(cap_ps·MeanPS, cap_pb·MeanPB)`, `base_mean = média cap`, `dcf_cap = α·DCF20`, `ruleOf40` e `growth_1_5`. O dial final aplica:

  ```text
  Oracle ≈ 8.1377·base_min − 7.3936·base_mean − 0.1697·dcf_cap
            + 43.4064·RuleOf40 + 10.0847·growth_1_5 − 507.37
  ```
  
  com guardrails `[0.6×min, 1.35×max]` (ou `[0.6×, 1.4×]` quando DCF disponível). O resultado replica `UNH/ELV/HUM/CVS/MOH/CNC/CI` com erro médio ≈ **$1.9**, confirmando que o StockOracle mistura múltiplos e DCF conforme estabilidade de crescimento e Rule of 40.
- Regressão OLS (dataset completo, 11 observações — inclui `playwright_capture_2025-11-02`) reforça o dial:  
  `Oracle ≈ -13.39 + 1.90·MeanPS - 1.14·MeanPB - 0.073·DCF20` (`R² ≈ 0.98`).  
  ⇒ MeanPS continua a puxar o valor final, MeanPB aplica haircut quando o cap PS seria elevado e o termo DCF permanece negativo (haircut). Guardrails `[0.6×, 1.35×]` ainda válidos.

- **Auto - Manufacturers** — segmentação manual `Detroit`, `Japan`, `EV_MATURE` (TSLA/RIVN/LCID) e `EV_NEW` (NIO/LI), cada um com regressão `Oracle ≈ slope·(cap_pb·MeanPB) + intercept`. Para EV usamos ainda um blend leve com `α·DCF20` quando `PB` é muito baixo (ex.: RIVN). As inclinações/interceções inferidas foram:

  ```text
  Detroit:   Oracle ≈ 0.5415·pb_cap + 7.489
  Japan:     Oracle ≈ 1.0757·pb_cap − 0.661
  EV_MATURE: Oracle ≈ 0.4704·pb_cap + 17.473  (blended 15–30% com DCF quando pb_cap < 25)
  EV_NEW:    Oracle ≈ 0.8296·pb_cap + 6.320
  ```
  
  O erro médio no cluster caiu para ≈ **$1.28** (máximo ≈ $5 em TSLA) e a estratégia mantém `min_ps_pb` como fallback quando `MeanPB` estiver ausente/negativo.
- Regressão OLS atualizada (15 observações) aponta `Oracle ≈ 20.05 + 0.54·MeanPB + 0.03·DCF20 – 0.0003·MeanPS` (`R² ≈ 0.85`).  
  ⇒ O peso efetivo continua em `MeanPB`, com contribuições marginais de DCF/PS (multicolinearidade alta). O dial manual por subcluster segue necessário, mas os coeficientes confirmam:  
  • Detroit: haircut até ~0.75× PS e PB ≈ 1×;  
  • EV high-growth: PS ignorado, Oracle ≈ `~4× PB`;  
  • EV novos (LI): blend `≈0.9× DCF + 1.0× MeanPB` mantendo cap PS baixo.

### Coeficientes consolidados por indústria

O script `scripts/analyze_industry_coefficients.py` gera `data/industry_coefficients.csv` com o melhor ajuste linear por indústria (RMSE mínimo). Destaques:

- **Auto - Manufacturers** (`subset_n = 5` com `dni20` disponível):
  `Oracle ≈ -19.42 + 0.21·MeanPS + 0.28·MeanPB + 0.84·DNI20` (`RMSE ≈ 0.09`, `R² ≈ 1.00`). Útil para EV com NI positivo; demais casos ainda dependem dos dials segmentados.
- **Medical - Healthcare Plans** (`n = 11`, `subset_n = 9`):
  `Oracle ≈ 2.75 + 2.76·MeanPS – 2.55·MeanPB + 1.36·DNI20` (`RMSE ≈ 17.97`, `R² ≈ 0.99`). Reflete a mistura cap PS (<1×) + penalty em PB + reforço quando DNI estável.
- **Regulated Electric** (`n = 8`):
  `Oracle ≈ -0.08 – 0.05·MeanPB + 1.05·MeanPS – 0.008·DFCF20` (`RMSE ≈ 0.46`, `R² ≈ 0.999`). Confirma cap PS ≈ 1× e haircut quando DFCF/Terminal inflacionam.
- **Drug Manufacturers - General** (`n = 5`):
  `Oracle ≈ -14.46 + 1.16·MeanPS – 0.43·MeanPB + 0.37·DCF20` (`RMSE ≈ 1.76`, `R² ≈ 1.00`). Sinaliza que DCF positivo pesa, mas múltiplos ancoram o valor final.
- **Banks - Diversified** (`n = 4`) e **Biotechnology** (`n = 3`) apresentam ajuste quase perfeito com `Oracle ≈ 0.90·MeanPB + 0.05·MeanPS` (bancos) e `Oracle ≈ 1.93·MeanPS – 0.61·MeanPB` (biotech). A amostra é pequena, então precisamos complementar com novas capturas antes de “congelar” os coeficientes.
- **REITs (Retail/Specialty)** (`n = 3` cada) sugerem `Oracle ≈ MeanPS ± ajustes` com termos adicionais (`+0.01·DCF20` em Retail; `−0.24·DFCF20 − 0.29·MeanPB + 1.25·MeanPS` em Specialty). Reforça o cap <1× PS + haircuts em PB quando comparáveis extremos aparecem.
- **Atualização 02 Nov 2025 (extra)** — após injetar 22 novos pontos (asset managers, bancos, REITs) o CSV consolidado trouxe regressões adicionais:
- **Asset Management** (`n = 5`, `subset_n = 5`): `Oracle ≈ 0.78·MeanPB + 0.08·MeanPS + 0.24·DNI20 − 18.74` (`RMSE ≈ 10.66`). O valor segue ancorado em PB (≈0.8×) com ajuste positivo quando DNI estável; outliers como `KKR` ainda dependem de haircuts manuais em DCF quando a firma reporta fluxos inflados.
- Novo lote (`02 Nov 2025`) em `stockoracle_payloads/asset_management_global_2025-11-02.json` adicionou `BX`, `KKR`, `BAM`, `CG` e `APO`, elevando o subset de asset managers para 5 tickers. Resumo rápido:

  | Ticker | Indústria | OracleValue | Oracle/MeanPB | Oracle/MeanPS | Oracle/DCF | Rule of 40 | Notas |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | BX  | Asset Management | 144.48 | **1.15×** | 1.02× | 1.54× | 77.7 | Premium robusto vs. PB, reforçado por DNI elevado; confirma blend `PB + DNI`. |
  | KKR | Asset Management | 73.57 | 0.79× | 0.81× | 0.22× | −3.7 | DCF absurdo (fluxos projectados gigantes) → Oracle regressa ao cap de múltiplos (PS/PB <1×). |
  | BAM | Asset Management | 31.12 | 0.80× | 0.46× | 1.62× | 583.3 | Growth excepcional inflaciona `Rule of 40`; Oracle mantém cap PB ≈0.8× apesar de DCF elevado. |
  | CG  | Asset Management | 47.93 | 0.98× | 0.87× | 0.73× | 131.9 | Blend equilibrado entre PB ≈1× e DNI; DCF moderado com haircut ~27%. |
  | APO | Asset Management - Global | 31.12 | 0.79× | 0.47× | 0.49× | 9.0 | Único classificado como “Global”; Oracle preso a caps de múltiplos (PB <0.8×). |
  - **Financial - Capital Markets** (`n = 3`): `Oracle ≈ 0.96·MeanPS − 0.38·MeanPB + 4.16` (`RMSE ≈ 0`). Mesmo padrão observado em GS/MS (cap PS <1×, PB como haircut).
  - **Financial - Credit Services** (`n = 4`): modelo reduzido `Oracle ≈ 0.70·MeanPS + 0.01·DCF20 + 32.15` (RMSE ~0) confirma que cap PS permanece principal dial (AXP/COF).
  - **Banks - Regional** (`n = 4`): ajuste linear `Oracle ≈ 18.45·MeanPB − 16.05·MeanPS + 122.89` — precisamos refinar com mais amostras (coeficientes sensíveis devido a poucos dados).
  - **REITs** agora contam com mais observações:  
    • Retail (`n = 6`) → `Oracle ≈ MeanPB + 0.005·DNI − 0.011·MeanPS + 0.65`.  
    • Specialty (`n = 6`) → `Oracle ≈ 0.85·MeanPB + 0.15·MeanPS + 0.024·DNI − 10.05`.  
    • Industrial (`n = 4`) → `Oracle ≈ 0.80·MeanPB + 0.20·MeanPS − 0.065·DCF`.  
    Confirma a estratégia “cap PS/PB próximos de 1×” com pequenos ajustes por fluxo e qualidade.

Esses coeficientes servem de base para implementar a fórmula universal (Etapa 5), sempre combinados com os guardrails/tiggers já mapeados (caps em PS/PB, fallback em múltiplos quando `dfcf20 <= 0`, penalidades por `RuleOf40` negativo etc.).

Próximos passos imediatos: (i) recolher novos payloads para validar que os coeficientes permanecem estáveis em datas diferentes (especialmente para EV chinesas e planos com FCF negativo crónico); (ii) parametrizar a segmentação Auto por heurísticas (`RuleOf40`, `MeanPB`) em vez de um mapa fixo de tickers, de modo a suportar tickers futuros.

Pseudo-algoritmo atualizado (a converter em código AlfaLyzer):

```python
cap_ps, cap_pb, alpha = lookup_coefficients(industry)

ps_cap = cap_ps * mean_ps if mean_ps is not None else None
pb_cap = cap_pb * mean_pb if mean_pb is not None else None

base_candidates = [value for value in [ps_cap, pb_cap] if value is not None]

if dcf20 is not None and dcf20 > 0:
    dcf_candidate = alpha * dcf20
    base_candidates.append(dcf_candidate)

# optionally add dni/dfcf blends quando disponíveis

oracle_estimate = min(base_candidates) if base_candidates else mean_pe_based_fallback(industry)
```

cap_ps, cap_pb, alpha = lookup_coefficients(industry)

candidates = {
    "ps": cap_ps * mean_ps if mean_ps else None,
    "pb": cap_pb * mean_pb if mean_pb else None,
    "dcf": alpha * dcf20 if dcf20 else None,
}

strategy = STRATEGY_MAP.get(industry, "min_all")
estimate = STRATEGY_FUNCS[strategy](candidates)

if estimate is None:
    estimate = STRATEGY_FUNCS["min_all"](candidates)

if estimate is None:
    estimate = fallback_multiples(industry, row)

return estimate
```

- Protótipo (`scripts/prototype_formula.py`): MAE ≈ **$4.47**, RMSE ≈ **$15.1**, MAPE ≈ **11.0%** (n=58).  
  Todos os clusters ficaram com mediana < **$2** (Auto ≈ $1.3, Healthcare Plans ≈ $1.9); os maiores resíduos pontuais surgem em TSLA (+$5) e ELV (+$3.9), sinalizando apenas ajustes finos nos coeficientes.

## 🎯 Objetivo final (Alfa Value)

Derivar uma fórmula parametrizada que possamos embutir no produto **Alfa Value**, combinando:
1. O DCF base reconstruído (Operating CF, Free CF ou Net Income, conforme o modo que o StockOracle usa para cada ticker);
2. Regras de ajuste/fallback acionadas por triggers observados (growth extremo, FCF inexistente, múltiplos negativos, alavancagem elevada, métricas qualitativas);
3. Coeficientes específicos por setor/sub-setor, produzindo um valor intrínseco que replica o OracleValue original sem depender da plataforma.

### Reconciliação inicial DCF vs. OracleValue
| Ticker | Setor | Método base (StockOracle) | Intrínseco reconstruído (USD) | OracleValue (USD) | Delta (Oracle − Base) |
| --- | --- | --- | --- | --- | --- |
| AAPL | Tecnologia / Consumer Electronics | `get-dcf-automation` (Operating CF) | 162.50 | 199.61 | +37.11 |
| AAPL | Tecnologia / Consumer Electronics | `get-dfcf20-automation` (Free CF) | 143.61 | 199.61 | +56.00 |
| MSFT | Tecnologia / Software | `get-dcf-automation` (Operating CF) | 607.21 | 520.56 | −86.65 |
| MSFT | Tecnologia / Software | `get-dfcf20-automation` (Free CF) | 322.61 | 520.56 | +197.95 |
| ARES | Financials / Asset Management | `get-dcf-automation` | 517.90 | 144.31 | −373.59 |
| ARES | Financials / Asset Management | `get-dfcf20-automation` | 498.60 | 144.31 | −354.29 |
| SPG | Real Estate / REIT - Retail | `get-dcf-automation` | 80.96 | 111.87 | +30.91 |
| SPG | Real Estate / REIT - Retail | `get-dfcf20-automation` | 50.49 | 111.87 | +61.38 |

Notas:
- `scripts/rebuild_dcf.py` reproduz o DCF da plataforma com erro < ±0.01 USD ação (ver `snapshots/*`).
- O delta mostra claramente a camada “pós-DCF”: tech recebe prêmio positivo, asset managers sofrem desconto expressivo, REITs capturam ajuste positivo via múltiplos.
- Próximo passo é expandir amostra (MSFT, PLD, outros) e incluir `get-dni20-automation` onde disponível.

## ✅ Trabalho já feito

- Capturados os payloads críticos para 17 tickers (tech, consumo, energia, utilities, saúde, industrial, airlines):
  - `get-pp-automation` (valor final OracleValue)
  - `iv-line-absolute-chart` (componentes DCF‑20, DFCF‑20, DNI‑20, DFCF-Terminal, médias de múltiplos)
  - `intrinsic-value/other-valuation-ratio` (mesmos componentes em tabela)
- Montado dataset consolidado (`oracle_dataset.json`) com inputs/resultados para regressões.
- Para 9 tickers com dados completos (principalmente tech/consumer) obtida regressão linear estável:

  ```
  OracleValue ≈ -93.3582
                -0.63065·DCF20
                +0.16644·DFCF20
                +0.81200·DNI20
                +0.29326·DFCF-Terminal
                +1.25653·MeanPS
                -0.06386·MeanPB
                -0.12773·MeanPE
  ```

  (RMSE ~7.7 USD; residual típico ±6 % exceto outliers como CAT).
- Dataset expandido para 28 tickers cobrindo utilities, bancos, industriais/logística e airlines. Quando os componentes de FCF vêm a 0 ou extremados, o OracleValue encaixa perfeitamente numa **mistura só de múltiplos médios**, com pesos específicos por setor:
  - **Utilities reguladas** (DUK, SO, NEE, AEP, ED, XEL):  
    `Oracle ≈ 17.99 + 2.24·MeanPS – 1.24·MeanPB – 3.08·MeanPE + 2.95·MeanPE(without NRI)`
  - **Bancos** (JPM, BAC, GS, WFC, C):  
    `Oracle ≈ –1.22 + 0.162·MeanPS + 0.744·MeanPB – 0.0085·MeanPE + 0.0277·MeanPE(without NRI)`
  - **Airlines / logística / conglomerados com FCF problemático** (DAL, LUV, UPS, MMM, BA):  
    `Oracle ≈ –27.82 + 1.05·MeanPS – 0.023·MeanPB + 0.047·MeanPE + 0.011·MeanPE(without NRI)`

  Estes modelos reproduzem o OracleValue original com erro < ±1 USD na maioria dos casos, mostrando que o site abandona totalmente o blend de DCF assim que os fluxos descontados falham (DFCF20/Terminal nulos, múltiplos negativos, etc.).
- Identificado que utilities/financials/airlines recebem valores incoerentes com a fórmula acima → o fallback descrito acima explica as diferenças.
- Capturadas duas fornadas de utilities: `stockoracle_payloads/utilities_cluster_2025-10-25.json` (regulados) e `stockoracle_payloads/utilities_gas_ipp_2025-10-25.json` (gas & IPPs); ambas analisáveis via `python3 scripts/analyze_auto_cluster.py --input ... --cluster-field industry`.
- Script de consolidação `scripts/build_oracle_dataset.py` gera `data/oracle_dataset.csv` com todos os payloads combinados, ratios (`Oracle/DCF`, `Oracle/MeanPS`, `Oracle/MeanPB`) e flags de fallback (DFCF negativo, múltiplos ausentes); basta correr `python3 scripts/build_oracle_dataset.py`.
  - Atualização (30 Out 2025): o CSV inclui também `medianPS`, `medianPB` e as razões correspondentes (`Oracle/medianPS`, `Oracle/medianPB`), necessários para replicar os dials setoriais (healthcare plans, auto legacy vs. EV).
  - Atualização (02 Nov 2025): novas linhas `source_file = playwright_capture_2025-11-02` adicionadas para `HUM`, `CVS`, `ELV`, `RIVN`, `STLA`, `GM` e `LI`, capturando os valores atuais diretamente da API via sessão Playwright.
- Novos clusters adicionados (bancos, healthcare, REITs) ao dataset global via `stockoracle_payloads/banks_cluster_2025-10-27.json`, `.../healthcare_cluster_2025-10-27.json`, `.../reits_cluster_2025-10-27.json`.
- Dataset agora cobre também **saúde (LLY, ABBV, MRK, PFE, BMY, AMGN, GILD)** com payloads premium archivados em `oracle_dataset.json`.
  - Para tickers com FCF bem comportado (ABBV/MRK/PFE/BMY/AMGN/GILD) o ajuste por regressão usando apenas os quatro componentes de DCF gerou pesos estáveis:  
    `Oracle ≈ 2.59 + 4.17·DCF20 − 3.55·DFCF20 − 0.28·DNI20 − 0.12·DFCF-Terminal`  
    (erro numérico ~0, mas apenas 6 observações → precisa validar com mais amostras de saúde).
  - **LLY** continua sem DCF configurado (`DFCF20`/`Terminal` nulos) e adere ao fallback de múltiplos. Regressão global para casos “sem FCF” mostra boa aproximação:  
    `Oracle ≈ -20.37 + 0.154·MeanPS + 0.606·MeanPB + 0.337·MeanPE + 0.044·MeanPE(no NRI)` → 953 USD vs 963 USD reais (≈1.1% de erro).
- Secção de **REITs** expandida (agora O, SPG, PLD, AMT, VTR, CCI, EQIX, PSA, VICI) com payloads em `reit_metrics_summary.json` + `reit_more_payloads.json`.
  - Regressão DCF+múltiplos com os 7 casos completos (sem lacunas nos componentes de cash-flow) rende:  
    `Oracle ≈ 0.0194 − 0.354·DCF20 + 0.298·DFCF20 + 0.0082·DNI20 + 0.087·DFCF-Terminal + 0.783·MeanPS − 0.129·MeanPB + 0.133·MeanPE`  
    (novamente ajuste perfeito, mas agora com amostra maior; sinais negativos em DCF20/MeanPB persistem).
  - **EQIX** continua sem valores de FCF longo prazo (`DFCF20`/`Terminal` nulos) → cai no fallback de múltiplos. Com apenas este ponto o blend estimado fica ~`0.0002 + 0.188·MeanPS + 0.186·MeanPB + 0.242·MeanPE + 0.241·MeanPE(no NRI)` (basicamente replica o OracleValue original).
  - Seguimos sem REITs a apresentar `DFCF-20`/`Terminal` negativos mas existe variação grande entre sub-setores (torres, data centers, self-storage, gaming); precisamos de mais amostras para confirmar se o blend é único ou por cluster.
- Secção de **Asset Managers** atualizada (BLK, TROW, BX, KKR, APO + alternativos ARES, BAM, CG) com snapshots em `asset_manager_payloads.json` e dataset consolidado.
  - Com todos os componentes de FCF disponíveis, a regressão DCF+múltiplos fecha exatamente em oito observações:  
    `Oracle ≈ 7.37 + 1.96·DCF20 − 4.63·DFCF20 + 1.47·DNI20 + 2.65·DFCF-Terminal + 5.86·MeanPS + 16.01·MeanPB − 7.72·MeanPE`  
    (peso forte em MeanPB/MeanPS, penalização em MeanPE e termo negativo para DFCF‑20 → blend claramente setorial).
  - Deltas vs. DCF20 mostram o mix de alavancagem/múltiplos: BLK +415 USD e BX +54 USD recebem prêmio, enquanto ARES −374 USD, KKR −255 USD e APO −105 USD sofrem cortes expressivos; nenhum nome disparou fallback de múltiplos.
  - Novos features de crescimento/alavancagem foram extraídos diretamente dos snapshots via `scripts/extract_growth_features.py` (ficheiro `asset_manager_growth_features.json`) e analisados com `scripts/analyze_insurance_growth.py --features asset_manager_growth_features.json`. A divisão em **traditional** (BLK/TROW) vs **alternative** (BX/KKR/APO/ARES) mostra que:
    - Os tradicionais praticamente não sofrem haircut adicional (deltas ≈ {+415, −57} USD) e têm `netDebt/share` <= 0 → a regressão dá RMSE ≈ 0.
    - Nos alternativos há correlações negativas fortes `corr(δ, g₁₋₅) ≈ -0.72` e `corr(δ, netDebt/share) ≈ -0.80`, com OLS `δ ≈ -61.6 – 28.1·g₁₋₅ + 28.1·g₆₋₁₀ – 8.7·netDebt/share – 63.4·cash/debt`. Quanto mais agressivo o crescimento e a alavancagem líquida, maior o desconto aplicado no OracleValue.
- Secção de **Insurance** (AIG, PRU, MET, ALL, CB, TRV, PGR, HIG, AFL, MFC, SLF) atualizada, com snapshots em `snapshots/` (incluindo `AFL_intrinsic_snapshot.json`, `MFC_intrinsic_snapshot.json`, `SLF_intrinsic_snapshot.json`) e payload consolidado em `insurance_payloads.json`.
  - Rebuild do DCF via `scripts/rebuild_dcf.py` bate com precisão < ±0.01 USD para TRV, PGR, HIG **e AFL**, confirmando que o backend mantém o mesmo motor de projeção (operation cash flow como base).
  - Deltas `Oracle − DCF20` continuam massivamente negativos (ex.: TRV −640 USD, PGR −432 USD, MET −614 USD, ALL −596 USD, CB −456 USD, HIG −452 USD, SLF −358 USD, MFC −233 USD, LNC −62 USD, UNM −118 USD), com **PRU** (+8 USD) e **AFL** (+7 USD) ainda como outliers positivos.
  - Após adicionar **MFC** e **SLF** tornou-se claro o descolamento entre subclusters:
    - **Life / Diversified (PRU, MET, AFL, MFC, SLF, LNC, UNM)** ajusta-se exatamente (sistema determinado) com:  
      `Oracle ≈ -7.24 + 0.432·DCF20 − 0.518·DFCF20 + 0.045·DFCF-Terminal − 0.208·DNI20 + 2.847·MeanPS(Value) − 0.737·MeanPB(Value) + 1.672·MeanPE(Value) − 2.034·MeanPE(no NRI)`  
      (RMSE ≈ 0, todos os resíduos < 10⁻¹²).
    - **P&C / Diversified (AIG, ALL, CB, TRV, PGR, HIG)** também fecha sem erro numérico com:  
      `Oracle ≈ 0.004 − 0.009·DCF20 − 0.047·DFCF20 + 0.025·DFCF-Terminal + 0.084·DNI20 + 0.613·MeanPS(Value) + 0.396·MeanPB(Value) − 0.177·MeanPE(Value) + 0.101·MeanPE(no NRI)`  
      (RMSE ≈ 0; resíduos < 2×10⁻¹³).
    - A regressão conjunta (11 observações) continua a apontar para corte forte nos componentes DCF (`+1.41·DCF20 − 1.44·DFCF20`) e prémios via múltiplos, mas com RMSE ≈ 1.25 USD e desvios gritantes nos life (AFL +1.24, MFC +0.16, SLF −2.67) → **clusters distintos são mandatórios**.
  - Para analisar os haircuts setoriais, derivámos `insurance_growth_features.json` com `discountRate`, `growthRate` (5/10 anos), `netDebt/share` e `cash/debt`. Regressões rápidas reforçam o padrão:  
    • Life → `δ ≈ 333 + 4.56·g₁₋₅ − 93.76·netDebt/share + 8.04·cash/debt + ...` (RMSE ≈ 19 USD).  
    • P&C → `δ ≈ −767 + 8.95·g₁₋₅ + 18.79·g₆₋₁₀ + ...` (RMSE ≈ 72 USD).  
    O sinal oposto nos coeficientes de crescimento sugere que o OracleValue pode aplicar haircuts específicos por cluster para compensar “over-optimistic” growth (life) vs. “under-priced” exposures (P&C). Precisamos expandir a amostra e validar com métricas de solvência para confirmar a heurística.
    - `scripts/analyze_insurance_growth.py` agora aceita `--features=<ficheiro>` permitindo correr a mesma análise em qualquer cluster (ex.: asset managers); mantém a regressão com interação quando há exatamente dois grupos.
  - Exploração adicional dos inputs de DCF mostra que o delta está fortemente ligado às premissas de crescimento:  
    • Life: `corr(delta, g₁₋₅) ≈ -0.89`, `corr(delta, g₆₋₁₀) ≈ -0.92`, `corr(delta, netDebt/share) ≈ +0.47`, `corr(delta, cash/debt) ≈ -0.47`.  
    • P&C: `corr(delta, g₁₋₅) ≈ +0.75`, `corr(delta, g₆₋₁₀) ≈ +0.80`, `corr(delta, netDebt/share) ≈ -0.61`.  
    ⇒ Uma hipótese a testar é que o OracleValue aplique haircuts dependentes das trajetórias de crescimento de curto/médio prazo: quanto maior o crescimento previsto, maior a penalização (life), enquanto nas P&C o movimento é inverso.

## 🔄 Atividades em curso

- Recolher novamente os snapshots `get-dcf-automation` para os REITs (O, SPG, PLD, AMT, VTR, CCI, EQIX, PSA, VICI): os payloads guardados (`reit_payloads.json`) vieram truncados/corrompidos, pelo que ainda não conseguimos derivar `discountRate`/`growthRate` nem montar `reit_growth_features.json`.

- Ampliar a recolha para mais tickers “problemáticos” (utilities, bancos, industriais c/ FCF negativo) para mapear regras alternativas.
- Extrair endpoints adicionais (`get-dcf-automation`, `get-dfcf20-automation`, growth/discount inputs) para testar dependência de crescimento/sector.
- Testar regressões/funções piecewise por setor e procurar triggers (DFCF-20 = 0, múltiplos < 0, crescimento extremo, etc.).
- Dataset agora inclui **AIG, PRU, MET, ALL, CB** com payloads completos (APIs `get-pp-automation`, `other-valuation-ratio`, `iv-line-absolute-chart`, `get-dcf-automation`); sessão premium restaurada.
- Validar se a fórmula DCF (~4.17·DCF20 etc.) se mantém ao adicionar mais farmacêuticas (ex.: JNJ, UNH, GSK, AZN) e se há subclusters (biotech vs big pharma).
- Confirmar se o blend de REITs acima se mantém com amostra maior (ex.: AMT, CCI, EQIX, PSA, VICI) e se existe subdivisão (retail vs industrial vs data centers).
- Extrair e tabular novos casos em **Auto Manufacturers / EV** (TSLA, RIVN, GM, F, TM, HMC) para identificar os pesos aplicados quando o OracleValue fica acima do DCF >40% mas abaixo dos múltiplos médios; verificar se há trigger em beta, market cap ou premium vs. PS/PB.
- Automatizar via script a recolha de `ACCESS_TOKEN_APP` activo da sessão headless (ou via login programático) para acelerar scraping dos endpoints citados.
- Analisar regressões piecewise específicas para “Detroit”, “Japão” e “EV high-growth” usando os dados recém-capturados, visando extrair coeficientes (`cap_ps`, `cap_pb`, `α_DCF`) e triggers (`Rule of 40`, `discountRate`, `growth g₁₋₅`).
- Recolher payloads adicionais em **Utilities** (gas distribution, IPPs, híbridos) e validar se o cap `≈1× Mean PS` se mantém ou se surge subcluster com `cap_ps < 1`.
- Expandir **Bancos/Financials** para incluir regionais/credit-card/lending (ex.: USB, AXP, COF) e testar se o coeficiente `≈0.9·MeanPB` se mantém ou se há ajustes adicionais (ROE, CET1, alavancagem).

## 📌 Próximos passos imediatos

1. **Completar as amostras deficitárias** com o fetch automatizado (`scripts/fetch_stockoracle_payloads.py`), priorizando:
   - Asset Mgmt - Global (≥3 novos tickers internacionais);
   - Financial - Capital Markets (ex.: `EVR`, `LAZ`, `MC`, `PJT`);
   - Credit Services (substituir `DFS`, adicionar `ALLY`, `SOFI`, `AFRM`);
   - REIT Office/Diversified/Industrial (ex.: `VNO`, `KRC`, `CUZ`, `TRNO`, `STAG`);
   - Utilities Gas/IPPs (ex.: `OGS`, `SWX`, `NEE` gas, `NEP`, `AY` IPP).
   Após cada lote → `python3 scripts/build_oracle_dataset.py --glob 'stockoracle_payloads/**/*.json'`.
2. **Recalibrar regressões por cluster** (`python3 scripts/analyze_industry_coefficients.py`) e ajustar `scripts/prototype_formula.py`, registando pesos/caps/FallBacks atualizados no doc.
3. **Documentar Etapa 5**: escrever o pseudo-código completo (caps PS/PB, pesos DCF, triggers de fallback, thresholds Rule-of-40/alavancagem) + exemplos por cluster.
4. **Automatizar o pipeline** (extender `scripts/run_intrinsic_update.sh` para: fetch → dataset → regressões → relatório de desvios) e preparar relatório comparativo periódico (OracleValue vs modelo interno).

## ⏳ Em falta

- Evidência para confirmar peso/estrutura dos fallbacks em utilities/financials **e** agora healthcare high-growth (precisamos de mais casos além de LLY) e REITs (testar se outros sub-setores ativam fallback).
- Cluster dedicado para **Auto Manufacturers / Consumer Cyclical**, incluindo casos com FCF negativo, para validar se o OracleValue liga/desliga múltiplos conforme `Rule of 40` ou beta.
- Regressões segmentadas para “Detroit vs. Japão vs. EV” confirmando coeficientes (`cap_ps`, `cap_pb`, `α_DCF`) e gatilhos (`Rule of 40`, netDebt/share, discountRate)` + extensão da ferramenta para subclusters de utilities (gas, IPPs) comparando caps vs. PS/PB.
- Checagem se pesos variam ao longo do tempo (precisa snapshot em datas distintas) e se há clusters adicionais (insurance, REITs, energy upstream).
- Plano de automação completo (script único) para reprocessar novos tickers/sectores e gerar relatório comparativo.
