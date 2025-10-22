# ORACLE VALUE — TRACKER

## 🎯 Objetivo

Desmontar como o StockOracle calcula o **OracleValue™** para diferentes ações, comprovar a fórmula de base e identificar regras de fallback ou ajustes específicos por setor/condição (ex.: FCF ausente, múltiplos negativos, crescimento extremo).

## 🧭 Plano Atualizado

| Etapa | Descrição | Estado | Observações |
| --- | --- | --- | --- |
| 1 | Reconstruir o DCF original (planilha Adam Khoo) com inputs capturados via API | ☑ | Script `scripts/rebuild_dcf.py` + snapshots (ex.: `AAPL`, `ARES`) reproduzem o DCF do site |
| 2 | Validar PVs do site (`get-dcf-automation`, `get-dfcf20-automation`, `get-dni20-automation`) contra a reconstrução | ⚙️ | AAPL/MSFT (Tech), ARES (Asset Mgmt) e SPG (REIT) reconciliados; falta ampliar amostra (DNI20, mais setores) |
| 3 | Comparar OracleValue final vs. DCF base e medir delta por cluster | ☐ | Guardar resultados por setor (tech, REIT, asset manager, healthcare, etc.) |
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
- **Infraestrutura pronta**: `scripts/extract_growth_features.py` e `scripts/analyze_insurance_growth.py` (agora com `--features`) permitem gerar e analisar rapidamente novos conjuntos de features para qualquer setor.

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

## 📌 Próximos passos imediatos

1. **Reforçar dataset** com ~10–15 tickers por setor (insurance, asset management, REITs, healthcare, energy upstream/midstream, materials, etc.), capturando via Chrome DevTools MCP:
   - `get-pp-automation`
   - `iv-line-absolute-chart`
   - `intrinsic-value/other-valuation-ratio`
   - `get-dcf-automation` / `get-dfcf20-automation` (growth & discount inputs)
   - Prioridade imediato em saúde: JNJ, UNH, GSK, AZN para testar robustez da fórmula DCF deduzida.
   - Regenerar os payloads premium dos REITs anteriores para permitir extração de growth/discount e construção de `reit_growth_features.json`.
2. **Modelar fallbacks** para cada cluster (confirmar se os pesos mudam ao longo do tempo ou conforme condições do growth/discount/rule-of-40).
3. **Documentar regras** com validação cruzada em novas amostras (incluindo sub-setores como insurance vs bancos).
4. **Automatizar report** para comparar modelo vs OracleValue original e destacar divergências/time drift.

## ⏳ Em falta

- Evidência para confirmar peso/estrutura dos fallbacks em utilities/financials **e** agora healthcare high-growth (precisamos de mais casos além de LLY) e REITs (testar se outros sub-setores ativam fallback).
- Checagem se pesos variam ao longo do tempo (precisa snapshot em datas distintas) e se há clusters adicionais (insurance, REITs, energy upstream).
- Plano de automação completo (script único) para reprocessar novos tickers/sectores e gerar relatório comparativo.
