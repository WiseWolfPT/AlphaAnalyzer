# ALFALYZER GAMIFICATION & CHALLENGES

**Objetivo:** Criar engagement tipo Polymarket (dopamina) mas 100% legal na EU
**Budget:** €25/mês em prémios
**Timeline:** MVP em 1-2 semanas
**Data:** 2025-10-10

---

## 📋 ÍNDICE

1. [Opção 1: Daily Market Predictions](#opção-1-daily-market-predictions) ⭐ **RECOMENDADO**
2. [Opção 2: Virtual Portfolio Returns](#opção-2-virtual-portfolio-returns)
3. [Opção 3: Earnings Prediction Challenge](#opção-3-earnings-prediction-challenge)
4. [Opção 4: Hybrid Score Challenge](#opção-4-hybrid-score-challenge)
5. [Opção 5: Pairs Trading Challenge](#opção-5-pairs-trading-challenge)
6. [Opção 6: Virtual Options Challenge](#opção-6-virtual-options-challenge)
7. [Sistema de Recompensas](#sistema-de-recompensas)
8. [Implementação Técnica](#implementação-técnica)
9. [Compliance & Legalidade](#compliance--legalidade)

---

## OPÇÃO 1: DAILY MARKET PREDICTIONS ⭐

### **Rating: 9/10** (RECOMENDADO PARA MVP)

### Descrição
Users fazem 3 predictions diárias sobre direção de mercados/stocks. Acumulam pontos durante 30 dias. Highest score ganha €25.

### Mecânica

```typescript
interface DailyPredictions {
  // Prediction 1: Market Direction (Easy)
  sp500: {
    question: "S&P 500 fecha verde hoje?",
    options: ["YES 🟢", "NO 🔴"],
    difficulty: "Easy",
    community_split: "67% YES | 33% NO",
    points: {
      correct: 10,
      wrong: -5
    }
  },

  // Prediction 2: Volatility (Medium)
  vix: {
    question: "VIX >20 no close?",
    options: ["YES", "NO"],
    difficulty: "Medium",
    community_split: "12% YES | 88% NO",
    points: {
      correct: 15,
      wrong: -5
    }
  },

  // Prediction 3: Stock Movement (Medium)
  featured_stock: {
    question: "AAPL move >1% (qualquer direção)?",
    options: ["YES", "NO"],
    difficulty: "Medium",
    rotation: "Stock muda diariamente (AAPL, TSLA, NVDA, GOOGL, etc)",
    points: {
      correct: 15,
      wrong: -5
    }
  },

  // BONUS (só dias earnings)
  earnings_special: {
    question: "META bate EPS estimates?",
    options: ["BEAT", "MISS"],
    difficulty: "Hard",
    points: {
      correct: 25,
      wrong: -10
    },
    availability: "Só em dias com earnings calls importantes"
  }
}
```

### Scoring System

```typescript
interface Scoring {
  base_points: {
    correct: "10-25 pts (depende da difficulty)",
    wrong: "-5 a -10 pts",
    skipped: "0 pts",
    max_daily_loss: "-15 pts (cap em perdas)"
  },

  multipliers: {
    streak_3: "×1.5 (3+ dias consecutivos corretos)",
    streak_7: "×2.0 (7+ dias consecutivos)",
    streak_15: "×2.5 (15+ dias consecutivos)"
  },

  bonuses: {
    contrarian: "+15 pts (apostar vs 80%+ users e acertar)",
    perfect_day: "+50 pts (acertar todas 3 predictions)",
    perfect_week: "+200 pts (acertar todas 15 predictions numa semana)",
    analysis_bonus: "+5 pts (ler transcripts antes de earnings prediction)"
  },

  anti_gaming: {
    time_lock: "Predictions locked ao market open (9h30 ET)",
    no_edits: "Após submeter, não pode alterar",
    rotation: "Featured stock muda diariamente (imprevisível)"
  }
}
```

### Exemplo Jornada (Semana do João)

```
MONDAY (21 dias restantes no challenge)
├─ S&P500 verde? → YES ✅ (+10 pts)
├─ VIX >20? → NO ✅ (+15 pts)
├─ AAPL >1%? → YES ❌ (-5 pts)
└─ Total dia: +20 pts | Streak: 0 | Rank: #52

TUESDAY
├─ S&P500 verde? → NO ✅ (+10 pts)
├─ VIX >20? → YES ✅ (+15 pts)
├─ TSLA >1%? → YES ✅ (+15 pts)
├─ BONUS: Perfect day! (+50 pts)
└─ Total dia: +90 pts | Streak: 1 | Rank: #41

WEDNESDAY
├─ S&P500 verde? → YES ✅ (+10 pts)
├─ VIX >20? → NO ✅ (+15 pts)
├─ NVDA >1%? → NO ✅ (+15 pts)
├─ BONUS: Perfect day! (+50 pts)
├─ BONUS: Streak 3+ (×1.5 multiplier)
└─ Total dia: +135 pts | Streak: 2 | Rank: #23

THURSDAY
├─ S&P500 verde? → NO ❌ (-5 pts)
├─ VIX >20? → YES ✅ (+15 pts)
├─ GOOGL >1%? → YES ✅ (+15 pts)
├─ PENALTY: Streak broken 💔
└─ Total dia: +25 pts | Streak: 0 | Rank: #27

FRIDAY
├─ S&P500 verde? → YES ✅ (+10 pts)
├─ VIX >20? → NO ✅ (+15 pts)
├─ META >1%? → NO ❌ (-5 pts)
├─ EARNINGS BONUS: META beats? → BEAT ✅ (+25 pts)
├─ Read transcript first (+5 pts)
└─ Total dia: +50 pts | Streak: 1 | Rank: #19

WEEK TOTAL: +320 pts
Month total: 589 pts
Current rank: #19 (↑33 desde início)
Distance to #1: 124 pts (achievable!)
```

### Prós & Contras

**✅ PRÓS:**
- Simples de entender (qualquer user percebe)
- Daily engagement (habit forming)
- Fast feedback (resultados mesma noite às 22h)
- Skill-based (análise ajuda accuracy)
- Automático (API valida resultados)
- Justo (todos fazem mesmas predictions)
- Fácil implementar (1 semana dev)
- Legal EU (skill + free entry)
- Streaks criam FOMO/dopamina
- Contrarian bets add excitement

**❌ CONTRAS:**
- Requer validação automática diária (cron job)
- Pode ter "optimal strategy" (sempre maioria)
- Limited a market days (~21/mês)

### Dopamina Score: **9/10**

**Triggers:**
- ✅ Real-time tracking (vês posição mudar)
- ✅ Streaks (loss aversion - medo perder)
- ✅ Social comparison (community % mostrado)
- ✅ Variable rewards (contrarian bets)
- ✅ Near-misses ("quase acertaste!")
- ✅ Daily ritual (consistência)
- ✅ Leaderboard movement (sobres posições)

### Implementação Timeline

**Semana 1:**
- Dia 1-2: Backend (DB schema, scoring logic, API endpoints)
- Dia 3-4: Frontend (predictions form, leaderboard, results screen)
- Dia 5: Integrations (market data API, cron jobs)
- Dia 6-7: Testing + Launch announcement

**Custo Dev:** 30-40 horas

---

## OPÇÃO 2: VIRTUAL PORTFOLIO RETURNS

### **Rating: 6/10**

### Descrição
Users recebem $100k virtuais. Constroem portfolio durante 30 dias. Melhor return % risk-adjusted ganha €25.

### Mecânica

```typescript
interface PortfolioChallenge {
  starting_capital: "$100,000 virtual",
  duration: "30 dias",

  rules: {
    max_trades: "20/mês",
    allowed_assets: "Stocks only (no options/crypto)",
    position_sizing: {
      min: "$5,000 per stock",
      max: "$25,000 per stock",
      max_positions: "20 simultaneous"
    },
    fees: "Realistic ($5/trade simulation)"
  },

  scoring: {
    primary: "Portfolio return % (end vs start)",
    tiebreaker: "Sharpe ratio (return/volatility)",
    formula: "Score = Return% × Sharpe"
  },

  leaderboard: {
    metrics: [
      "Current portfolio value",
      "Return %",
      "Sharpe ratio",
      "# trades used",
      "Top holdings"
    ],
    update_frequency: "Real-time (market hours)"
  }
}
```

### Exemplo

```
JOÃO (Risk-taker):
├─ Strategy: Concentrated tech
├─ Holdings: 100% TSLA ($100k)
├─ Month performance: TSLA +15%
├─ Return: +15%
├─ Volatility: High (±8% daily swings)
├─ Sharpe: 0.4
└─ Score: 15 × 0.4 = 6.0

MARIA (Balanced):
├─ Strategy: Diversified value
├─ Holdings: AAPL (25%), MSFT (25%), GOOGL (25%), Cash (25%)
├─ Month performance: +5.3%
├─ Return: +5.3%
├─ Volatility: Low (±2% daily swings)
├─ Sharpe: 1.8
└─ Score: 5.3 × 1.8 = 9.5

WINNER: Maria (melhor risk-adjusted return)
```

### Prós & Contras

**✅ PRÓS:**
- Realista (simula investing real)
- Incentiva análise fundamental
- Recompensa risk management
- Alinhado com missão Alfalyzer
- Users aprendem portfolio construction

**❌ CONTRAS:**
- Sorte > skill em 30 dias (período curto)
- Pode incentivar YOLO behavior
- Complexo implementar (trade tracking, portfolio calc)
- Sharé ratio calculation pode confundir users
- Não é daily engagement (fazem trades esporadicamente)

### Dopamina Score: **7/10**

**Triggers:**
- ✅ Real-time portfolio value tracking
- ✅ Leaderboard volatility (posições mudam muito)
- ⚠️ Lower frequency (vs daily predictions)
- ⚠️ Complexidade pode reduzir participação

### Implementação Timeline

**3 semanas:**
- Semana 1: Trade engine (buy/sell, portfolio calc)
- Semana 2: Portfolio analytics (Sharpe, return charts)
- Semana 3: Leaderboard + testing

**Custo Dev:** 80-100 horas

---

## OPÇÃO 3: EARNINGS PREDICTION CHALLENGE

### **Rating: 8/10**

### Descrição
Prever resultados de earnings calls. Altamente skill-based - incentiva ler transcripts/financials.

### Mecânica

```typescript
interface EarningsChallenge {
  target: "Todas earnings calls do mês (~40-60 companies)",
  duration: "30 dias",

  predictions_per_company: {
    eps_beat: {
      question: "Bate EPS estimates?",
      options: ["BEAT", "MISS", "INLINE"],
      points: {
        correct: 15,
        wrong: 0
      }
    },

    revenue_growth: {
      question: "Revenue growth >10% YoY?",
      options: ["YES", "NO"],
      points: {
        correct: 10,
        wrong: 0
      }
    },

    stock_reaction: {
      question: "Stock sobe >5% post-earnings?",
      options: ["YES", "NO"],
      difficulty: "Hard (mais imprevisível)",
      points: {
        correct: 20,
        wrong: 0
      }
    },

    bonus_combo: {
      trigger: "Acertar todas 3 predictions para mesma company",
      reward: "+50 pts"
    }
  },

  engagement_bonuses: {
    read_transcript: "+5 pts (antes de fazer prediction)",
    read_financials: "+5 pts (ver balance sheet/income)",
    write_analysis: "+10 pts (partilhar analysis ≥100 palavras)",
    early_prediction: "+5 pts (prediction ≥24h antes earnings)"
  },

  participation: {
    required: "Min 10 companies",
    optional: "Escolher quais (estratégia)",
    max: "Todas as 40-60 do mês"
  }
}
```

### Scoring Example

```
NOVEMBRO 2025: 45 companies reportam earnings

JOÃO participa em 28 companies:

APPLE (Nov 2):
├─ EPS beat? → BEAT ✅ (+15 pts)
├─ Revenue >10%? → YES ✅ (+10 pts)
├─ Stock >5%? → NO (stock caiu -2%) ❌ (0 pts)
├─ Read transcript? → YES (+5 pts)
├─ Read financials? → YES (+5 pts)
└─ Total AAPL: 35 pts

TESLA (Nov 15):
├─ EPS beat? → MISS (era BEAT) ❌ (0 pts)
├─ Revenue >10%? → YES ✅ (+10 pts)
├─ Stock >5%? → YES ✅ (+20 pts)
├─ Read transcript? → NO (0 pts)
└─ Total TSLA: 30 pts

META (Nov 23):
├─ EPS beat? → BEAT ✅ (+15 pts)
├─ Revenue >10%? → YES ✅ (+10 pts)
├─ Stock >5%? → YES ✅ (+20 pts)
├─ COMBO BONUS! (+50 pts)
├─ Read transcript? → YES (+5 pts)
├─ Read financials? → YES (+5 pts)
├─ Wrote analysis? → YES (+10 pts)
├─ Early prediction? → YES (+5 pts)
└─ Total META: 120 pts (JACKPOT!)

... 25 companies more ...

MONTH TOTAL: 1,247 pts
Accuracy: 67% (19/28 EPS predictions correct)
Rank: #3
Distance to #1: 89 pts
```

### Prós & Contras

**✅ PRÓS:**
- **ALTAMENTE skill-based** (ler transcripts = vantagem real)
- Alinha PERFEITAMENTE com features Alfalyzer
- Incentiva usar AI analysis, financial data
- Recompensa análise fundamental
- Automático (dados verificáveis via API)
- Premium users têm vantagem (access a tools) → conversion incentive
- Educativo (users aprendem earnings analysis)

**❌ CONTRAS:**
- Limitado a earnings season (algumas semanas/mês têm poucas earnings)
- Complexidade média (users precisam entender EPS, revenue, etc)
- Implementação média (precisa earnings calendar + results validation)
- Menos frequent que daily predictions

### Dopamina Score: **8/10**

**Triggers:**
- ✅ High stakes (earnings são eventos importantes)
- ✅ Social proof (ver % community em cada prediction)
- ✅ Variable rewards (combo bonuses)
- ✅ Skill validation (acertar = "I'm smart")
- ⚠️ Lower frequency (não é diário)

### Implementação Timeline

**2 semanas:**
- Semana 1: Earnings calendar integration, predictions DB
- Semana 2: Results validation (API), bonuses system, leaderboard

**Custo Dev:** 50-60 horas

---

## OPÇÃO 4: HYBRID SCORE CHALLENGE

### **Rating: 7/10**

### Descrição
Combina múltiplos tipos de skill: predictions + portfolio + earnings + engagement.

### Mecânica

```typescript
interface HybridChallenge {
  duration: "30 dias",

  components: {
    // 40% do score total
    prediction_accuracy: {
      weight: 0.4,
      method: "Daily predictions (Opção 1)",
      max_points: 400,
      description: "S&P500, VIX, stocks diários"
    },

    // 30% do score total
    portfolio_performance: {
      weight: 0.3,
      method: "Virtual portfolio return risk-adjusted",
      max_points: 300,
      description: "$100k virtual, best Sharpe ratio"
    },

    // 20% do score total
    earnings_predictions: {
      weight: 0.2,
      method: "Earnings accuracy (Opção 3)",
      max_points: 200,
      description: "EPS, revenue, stock reaction"
    },

    // 10% do score total
    platform_engagement: {
      weight: 0.1,
      method: "Usage de features Alfalyzer",
      max_points: 100,
      activities: [
        "Read transcripts (+2 pts each)",
        "Use intrinsic value calculator (+5 pts)",
        "Create watchlist (+10 pts)",
        "Share analysis (+10 pts)",
        "Invite friend (+20 pts)"
      ]
    }
  },

  final_score: "Sum of all weighted components (max 1000 pts)",
  winner: "Highest total score"
}
```

### Scoring Example

```
JOÃO - Final Month Score:

1. PREDICTION ACCURACY: 287/400 pts (71.75%)
   ├─ Daily predictions: 18/21 days participated
   ├─ Accuracy: 65%
   ├─ Streaks: 7-day max (×2.0 multiplier earned 3x)
   └─ Weighted: 287 × 0.4 = 114.8 pts

2. PORTFOLIO PERFORMANCE: 189/300 pts (63%)
   ├─ Return: +8.2%
   ├─ Sharpe: 1.4
   ├─ Score: 8.2 × 1.4 = 11.48 (normalized to 189/300)
   └─ Weighted: 189 × 0.3 = 56.7 pts

3. EARNINGS PREDICTIONS: 156/200 pts (78%)
   ├─ Companies: 12 participated
   ├─ Accuracy: 75% (9/12)
   ├─ Combo bonuses: 2x
   └─ Weighted: 156 × 0.2 = 31.2 pts

4. ENGAGEMENT: 87/100 pts (87%)
   ├─ Transcripts read: 15 (+30 pts)
   ├─ Calculator used: 8x (+40 pts)
   ├─ Analysis shared: 1 (+10 pts)
   ├─ Friend invited: 0 (0 pts)
   └─ Weighted: 87 × 0.1 = 8.7 pts

TOTAL SCORE: 211.4 pts
RANK: #4
Distance to #1: 47.3 pts
```

### Prós & Contras

**✅ PRÓS:**
- Recompensa users bem-rounded (vários skills)
- Difícil "gaming" (precisa ser bom em tudo)
- Incentiva engagement com todas features
- Muito justo (múltiplas chances de pontuar)
- Premium users têm mais tools (conversion incentive)

**❌ CONTRAS:**
- **Complexo explicar** (4 componentes diferentes)
- **Overwhelming** para novatos
- Implementação complexa (combinar 4 sistemas)
- Pode fragmentar atenção (users não focam)
- Difícil comunicar "como ganhar"

### Dopamina Score: **6/10**

**Triggers:**
- ✅ Multiple ways to win (flexibility)
- ⚠️ Complexidade reduz dopamina (confuso)
- ⚠️ Não clear daily ritual

### Implementação Timeline

**4-5 semanas:**
- Combinar implementações das Opções 1, 2, 3
- Sistema de weighted scoring
- Dashboard complexo

**Custo Dev:** 120-150 horas

---

## OPÇÃO 5: PAIRS TRADING CHALLENGE

### **Rating: 8/10**

### Descrição
Users escolhem 2 stocks correlacionados e apostam qual vai outperform. Head-to-head format cria tribalism.

### Mecânica

```typescript
interface PairsTradingChallenge {
  duration: "30 dias",

  mechanics: {
    pair_selection: {
      method: "User escolhe 2 stocks",
      examples: [
        "AAPL vs MSFT (Tech giants)",
        "KO vs PEP (Beverages)",
        "BA vs LMT (Defense)",
        "JPM vs BAC (Banking)",
        "TSLA vs F (Auto)",
        "DIS vs NFLX (Entertainment)"
      ],
      can_create_own: true,
      pre_defined_pairs: "10-20 sugeridos"
    },

    prediction: {
      question: "Qual vai ter MELHOR return nos próximos 30 dias?",
      options: ["Stock A", "Stock B"],
      stake: "10-100 pts virtual",

      payout_calculation: {
        formula: "Baseado em % users em cada lado",
        example: {
          aapl_backers: "73%",
          msft_backers: "27%",
          odds: {
            aapl: "1.2x (favorito)",
            msft: "2.5x (underdog)"
          }
        }
      }
    },

    tracking: {
      frequency: "Real-time durante 30 dias",
      metrics: [
        "Current spread (AAPL +5.2% vs MSFT +3.1%)",
        "Days leading",
        "Max spread achieved",
        "Countdown timer"
      ]
    },

    result: {
      winner: "Stock com melhor return % aos 30 dias",
      payout: "Stake × odds",
      example: "Apostou 50 pts em MSFT (2.5x) → ganha 125 pts"
    }
  },

  leaderboard: {
    scoring: "Total points acumulados (múltiplas pairs)",
    max_active_pairs: "5 simultaneous",
    strategy: "Users podem diversificar ou concentrate"
  }
}
```

### UI Flow

```
1. SELECT PAIR
┌─────────────────────────────────────┐
│ 🎯 CHOOSE YOUR BATTLE               │
│                                     │
│ Popular Pairs:                      │
│ ┌─────────────────────────────────┐ │
│ │ 🍎 AAPL vs 🪟 MSFT              │ │
│ │ 30-day return battle            │ │
│ │                                 │ │
│ │ Community split:                │ │
│ │ AAPL: 73% ████████░ 1.2x        │ │
│ │ MSFT: 27% ███░░░░░░ 2.5x        │ │
│ │                                 │ │
│ │ [Pick AAPL] [Pick MSFT]         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Create Custom Pair →]              │
└─────────────────────────────────────┘

2. STAKE SELECTION
┌─────────────────────────────────────┐
│ You picked: MSFT 🪟                 │
│ Odds: 2.5x (underdog)               │
│                                     │
│ Stake amount:                       │
│ [─────●─────] 50 pts                │
│                                     │
│ Potential win: 125 pts              │
│ Potential loss: 50 pts              │
│                                     │
│ Duration: 30 days                   │
│ Ends: Nov 10, 2025                  │
│                                     │
│ [Confirm Bet →]                     │
└─────────────────────────────────────┘

3. LIVE TRACKING
┌─────────────────────────────────────┐
│ 🪟 MSFT vs 🍎 AAPL                  │
│ 12 days remaining                   │
│                                     │
│ Current Performance:                │
│ MSFT: +3.1% 🟢                      │
│ AAPL: +5.2% 🟢 ← WINNING            │
│                                     │
│ Spread: -2.1% (AAPL leads)          │
│                                     │
│ Your position:                      │
│ ❌ Currently losing                 │
│ Staked: 50 pts on MSFT             │
│ Potential: 125 pts (2.5x)           │
│                                     │
│ 📊 30-day chart                     │
│ [Interactive line chart showing     │
│  both stocks' performance]          │
│                                     │
│ 18 days until result! 🔥            │
└─────────────────────────────────────┘

4. RESULTS
┌─────────────────────────────────────┐
│ 🎉 BATTLE ENDED!                    │
│                                     │
│ 30-Day Returns:                     │
│ 🍎 AAPL: +8.4% 👑 WINNER           │
│ 🪟 MSFT: +6.2%                      │
│                                     │
│ Your bet: MSFT ❌                   │
│ Staked: 50 pts                      │
│ Result: LOST                        │
│                                     │
│ Better luck next time!              │
│ [Try New Pair →]                    │
└─────────────────────────────────────┘
```

### Prós & Contras

**✅ PRÓS:**
- **Tribalism** (Team AAPL vs Team MSFT = engagement)
- Visual tracking satisfying (charts, spreads)
- Skill-based (relative valuation analysis)
- Incentiva análise fundamental comparativa
- Odds dinâmicas = Polymarket feel
- Resultado claro (melhor return = winner)
- Social proof (ver community split)

**❌ CONTRAS:**
- 30 dias é longo (dopamina delayed)
- Precisa tracking real-time (infra)
- Pode incentivar tribalism tóxico
- Odds calculation complexo

### Dopamina Score: **8/10**

**Triggers:**
- ✅ Real-time tracking (spread muda constantemente)
- ✅ Social proof (community %)
- ✅ Contrarian play (apostar underdog)
- ✅ Visual juice (charts, countdowns)
- ✅ Tribalism ("go team MSFT!")
- ⚠️ Resultado delay (30 dias)

### Implementação Timeline

**2 semanas:**
- Semana 1: Pairs DB, odds calculation, staking system
- Semana 2: Real-time tracking, charts, results automation

**Custo Dev:** 60-70 horas

---

## OPÇÃO 6: VIRTUAL OPTIONS CHALLENGE

### **Rating: 5/10** ⚠️ (NÃO RECOMENDADO)

### Descrição
Users "compram" call/put options virtuais. Alavancagem 10x-100x. **EXTREMAMENTE VICIANTE**.

### Mecânica

```typescript
interface VirtualOptionsChallenge {
  duration: "30 dias",

  options_trading: {
    types: ["CALL (aposta subida)", "PUT (aposta descida)"],

    parameters: {
      underlying: "Stock escolhido (ex: AAPL)",
      strike: "Preço target (ex: $150)",
      expiry: "7, 14, ou 30 dias",
      premium: "Custo em pontos virtuais (10-100 pts)"
    },

    payout: {
      call_example: {
        buy: "CALL AAPL $150 strike, 30 dias, 50 pts premium",
        scenarios: [
          "AAPL = $160 ao expiry → GANHO $10 × 100x leverage = +1000 pts",
          "AAPL = $145 ao expiry → LOSS total = -50 pts"
        ]
      },

      put_example: {
        buy: "PUT TSLA $200 strike, 7 dias, 30 pts premium",
        scenarios: [
          "TSLA = $180 ao expiry → GANHO $20 × 50x leverage = +1000 pts",
          "TSLA = $210 ao expiry → LOSS total = -30 pts"
        ]
      }
    },

    expiry_mechanics: {
      countdown: "Timer visual (3 days, 12h, 45min left!)",
      worthless_rate: "~75% options expiram worthless (realista)",
      max_gain: "100x investment",
      max_loss: "100% premium (limited)"
    }
  },

  leaderboard: {
    metric: "Total points acumulados",
    volatility: "EXTREMA (swings de 1000+ pts possíveis)",
    strategy: "High risk, high reward"
  }
}
```

### Exemplo Jornada

```
JOÃO - Week 1:

MONDAY:
├─ Buy CALL NVDA $120, 7 dias, 50 pts
├─ NVDA at $115 → OTM (out of money)
└─ Status: -$5 strike, 6 dias left

TUESDAY:
├─ NVDA rallies to $118 → still OTM
└─ Status: -$2 strike, 5 dias left (getting close!)

WEDNESDAY:
├─ NVDA MOONS to $125! 🚀
├─ Option now ITM (in the money) +$5
└─ Potential value: 50 pts → 500 pts (+10x)

THURSDAY:
├─ NVDA drops to $121
├─ Still ITM but less (+$1)
└─ Should João sell now or hold? (FOMO!)

FRIDAY:
├─ João holds (greedy)
├─ NVDA dumps to $117
├─ Option expires WORTHLESS
└─ LOSS: -50 pts 💀

Psychological rollercoaster:
- Monday: Hope
- Tuesday: Anxiety
- Wednesday: EUPHORIA (near 10x!)
- Thursday: Greed vs Fear
- Friday: DEVASTATION
```

### Prós & Contras

**✅ PRÓS:**
- **MEGA DOPAMINA** (alavancagem = huge swings)
- Countdown timers = urgência extrema
- Near-misses frequentes (quase ganhaste!)
- Polymarket-level engagement

**❌ CONTRAS:**
- ❌ **CRIA VÍCIO REAL** (mesmo virtual)
- ❌ Ensina **BAD HABITS** (YOLO behavior)
- ❌ **Destroi brand educativo** Alfalyzer
- ❌ 75% lose = frustração
- ❌ Pode causar gambling addiction
- ❌ Zona cinzenta legal (mesmo virtual pode ser gambling)
- ❌ Atrai público errado (gamblers vs investors)

### Dopamina Score: **10/10** (TOO MUCH)

**Triggers:**
- ✅ Alavancagem (10x-100x gains possíveis)
- ✅ Countdown timers (urgência)
- ✅ Near-misses ("quase ganhei 1000 pts!")
- ✅ Variable rewards (às vezes jackpot)
- ❌ **TOO ADDICTIVE** - problema ético

### ⚠️ RECOMENDAÇÃO: **NÃO IMPLEMENTAR**

**Razões:**
1. **Ética:** Cria vício destrutivo
2. **Brand:** Alfalyzer = educação, não casino
3. **Legal:** Zona cinzenta (pode ser gambling)
4. **Público:** Atrai gamblers vs serious investors
5. **Sustainability:** Users burn out rápido

**Se insistires:**
- Caps estritos (max 3 options/mês)
- Limites de loss (max 100 pts total)
- Educational prompts ("Options são arriscados")
- Apenas para Premium users (reduzir exposição)

### Implementação Timeline

**2 semanas** (mas NÃO RECOMENDO)

---

## SISTEMA DE RECOMPENSAS

### Budget: €25/mês

```typescript
interface MonthlyRewards {
  total_budget: "€25",

  prize_structure: {
    champion: {
      rank: 1,
      cash_prize: "€25 (escolhe: cash/stocks/crypto via Revolut)",
      digital_rewards: [
        "🏆 CHAMPION Badge (lifetime)",
        "👑 Gold username (30 dias)",
        "⭐ Premium features unlock (30 dias)",
        "📸 Hall of Fame entry",
        "🎤 Winner interview (blog post)",
        "🔔 Exclusive Discord role (se tiver)"
      ],
      total_perceived_value: "~€100-150"
    },

    elite: {
      rank: "2-3",
      cash_prize: "€0",
      digital_rewards: [
        "🥈 ELITE Badge",
        "💎 Silver username (7 dias)",
        "⭐ Premium trial (7 dias)"
      ],
      total_perceived_value: "~€20-30"
    },

    masters: {
      rank: "4-10",
      cash_prize: "€0",
      digital_rewards: [
        "⭐ MASTER Badge",
        "🔓 Feature unlock (1 feature)",
        "Bronze border"
      ],
      total_perceived_value: "~€10"
    },

    rising_stars: {
      rank: "11-50",
      cash_prize: "€0",
      digital_rewards: [
        "📈 RISING STAR Badge"
      ],
      total_perceived_value: "Social proof"
    },

    top_performers: {
      rank: "Top 10%",
      cash_prize: "€0",
      digital_rewards: [
        "💎 TOP PERFORMER Achievement"
      ]
    }
  },

  actual_cost: {
    cash: "€25",
    premium_trials: "€0 (marginal cost)",
    badges: "€0 (one-time design)",
    features: "€0 (já existem)",
    total: "€25/mês"
  }
}
```

### Status System (Custo €0)

```typescript
enum PlayerRank {
  BRONZE = "0-999 pts (grey border)",
  SILVER = "1000-2499 pts (silver border)",
  GOLD = "2500-4999 pts (gold border)",
  PLATINUM = "5000-9999 pts (purple border)",
  DIAMOND = "10000+ pts (rainbow animated)",
  LEGEND = "All-time Top 10 (custom badge)"
}

interface VisualPerks {
  username_color: "Changes by rank",
  profile_border: "Animated for Diamond+",
  badge_showcase: "Display up to 5 badges",
  leaderboard_highlight: "Glowing effect for top 10"
}
```

### Achievements System (Custo €0)

```typescript
interface Achievements {
  beginner: {
    "First Blood": "Primeira prediction correta",
    "Getting Started": "Complete 5 predictions",
    "Consistent": "3-day streak"
  },

  intermediate: {
    "Hot Streak": "7-day streak 🔥",
    "Centurion": "100 predictions total",
    "Sharpshooter": "70%+ accuracy (min 20 predictions)",
    "Contrarian": "Win betting vs 90%+ majority"
  },

  advanced: {
    "Perfect Week": "7/7 correct predictions",
    "Earnings Master": "5 earnings predictions correct",
    "Diamond Hands": "30 consecutive days participating",
    "Underdog": "Win 5 contrarian bets"
  },

  legendary: {
    "Untouchable": "15-day streak",
    "Oracle": "80%+ accuracy (min 50 predictions)",
    "Champion": "Win monthly challenge",
    "Hall of Famer": "Top 10 all-time leaderboard"
  }
}
```

### Broker Partnerships (Revenue Positivo!)

```typescript
interface BrokerAffiliates {
  partners: [
    "Trading212",
    "Interactive Brokers",
    "Revolut Trading",
    "XTB"
  ],

  champion_package: {
    base: "€25 cash (teu custo)",
    affiliate_bonuses: [
      "€50 Trading212 deposit bonus (custo €0 - eles pagam)",
      "€25 commission-free trading IBKR (custo €0)",
      "€10 Revolut bonus (custo €0)"
    ],

    total_value: "€110",
    your_cost: "€25",
    your_revenue: "€50-200 comissão quando winner faz signup"
  },

  net_economics: {
    spend: "€25/mês em prizes",
    earn: "€50-200/signup (10-20% conversion = €5-40/mês)",
    net: "€-20 a €+15/mês (pode ser cash positive!)"
  }
}
```

---

## IMPLEMENTAÇÃO TÉCNICA

### Database Schema (Opção 1: Daily Predictions)

```sql
-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  prediction_date DATE NOT NULL,

  -- Prediction data
  sp500_direction BOOLEAN,           -- true = green, false = red
  vix_above_20 BOOLEAN,              -- true = yes, false = no
  featured_stock_symbol VARCHAR(10),
  featured_stock_move BOOLEAN,       -- true = yes move >1%, false = no

  -- Results (populated at 22h)
  sp500_result BOOLEAN,
  vix_result BOOLEAN,
  featured_stock_result BOOLEAN,

  -- Scoring
  points_earned INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  bonuses_applied JSONB,             -- {contrarian: true, perfect_day: true}

  -- Meta
  locked_at TIMESTAMP,               -- quando prediction foi locked
  result_verified_at TIMESTAMP,      -- quando results foram validados
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, challenge_id, prediction_date)
);

-- Challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,        -- "November 2025 Challenge"
  type VARCHAR(50) NOT NULL,         -- "daily_predictions"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  prize_amount DECIMAL(10,2),        -- 25.00
  prize_currency VARCHAR(3),         -- "EUR"
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled

  -- Config
  config JSONB,                      -- {base_points: 10, streak_multiplier: 1.5, ...}

  created_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard (materialized view - updated hourly)
CREATE MATERIALIZED VIEW challenge_leaderboard AS
SELECT
  c.id as challenge_id,
  p.user_id,
  u.username,
  u.avatar_url,
  SUM(p.points_earned) as total_points,
  MAX(p.streak_count) as max_streak,
  COUNT(DISTINCT p.prediction_date) as days_participated,
  AVG(CASE
    WHEN p.sp500_result IS NOT NULL THEN
      CASE WHEN p.sp500_direction = p.sp500_result THEN 1 ELSE 0 END
    ELSE NULL
  END) as accuracy,
  RANK() OVER (PARTITION BY c.id ORDER BY SUM(p.points_earned) DESC) as rank,
  LAG(RANK() OVER (PARTITION BY c.id ORDER BY SUM(p.points_earned) DESC)) OVER (PARTITION BY c.id, p.user_id ORDER BY NOW()) as prev_rank
FROM predictions p
JOIN challenges c ON p.challenge_id = c.id
JOIN users u ON p.user_id = u.id
WHERE c.status = 'active'
GROUP BY c.id, p.user_id, u.username, u.avatar_url;

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_code VARCHAR(50) NOT NULL, -- "first_blood", "hot_streak", etc
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,                    -- {streak_length: 7, accuracy: 0.75}

  UNIQUE(user_id, achievement_code)
);

-- User badges (monthly winners)
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  badge_type VARCHAR(50) NOT NULL,   -- "champion", "elite", "master"
  challenge_id UUID REFERENCES challenges(id),
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,              -- NULL = permanent

  metadata JSONB                     -- {rank: 1, total_points: 1247}
);

-- Indexes
CREATE INDEX idx_predictions_user_challenge ON predictions(user_id, challenge_id);
CREATE INDEX idx_predictions_date ON predictions(prediction_date);
CREATE INDEX idx_leaderboard_rank ON challenge_leaderboard(challenge_id, rank);
```

### API Endpoints

```typescript
// GET /api/challenges/active
// Returns current active challenge(s)
interface GetActiveChallengesResponse {
  challenges: {
    id: string;
    name: string;
    type: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
    prize: {
      amount: number;
      currency: string;
    };
    participants_count: number;
    your_rank?: number;
    your_points?: number;
  }[];
}

// GET /api/challenges/:id/predictions/today
// Get today's prediction questions
interface GetTodayPredictionsResponse {
  challenge_id: string;
  date: string;
  lock_time: string;              // "2025-11-01T14:30:00Z"
  locked: boolean;

  questions: {
    id: string;
    type: string;                 // "sp500_direction"
    question: string;
    options: {value: boolean, label: string}[];
    difficulty: string;
    points: {correct: number, wrong: number};
    community_split?: {yes: number, no: number}; // %
  }[];

  user_prediction?: {
    sp500_direction: boolean;
    vix_above_20: boolean;
    featured_stock_move: boolean;
    submitted_at: string;
  };
}

// POST /api/challenges/:id/predictions
// Submit today's predictions
interface SubmitPredictionsRequest {
  sp500_direction: boolean;
  vix_above_20: boolean;
  featured_stock_move: boolean;
}

interface SubmitPredictionsResponse {
  success: boolean;
  prediction: {
    id: string;
    locked_at: string;
    can_edit: boolean;
  };
}

// GET /api/challenges/:id/predictions/results
// Get results for a specific date (available after market close)
interface GetPredictionResultsResponse {
  date: string;
  user_prediction: {
    sp500_direction: boolean;
    vix_above_20: boolean;
    featured_stock_move: boolean;
  };
  actual_results: {
    sp500_direction: boolean;      // S&P closed +0.8%
    vix_above_20: boolean;          // VIX was 18.4
    featured_stock_move: boolean;   // AAPL moved +2.1%
  };
  scoring: {
    sp500_points: number;           // +10
    vix_points: number;             // -5
    stock_points: number;           // +15
    bonuses: {
      type: string;                 // "perfect_day", "contrarian", etc
      points: number;
    }[];
    total_points: number;
    streak_count: number;
    streak_bonus_applied: boolean;
  };
  rank_change: {
    previous: number;
    current: number;
    movement: number;               // +3 positions
  };
}

// GET /api/challenges/:id/leaderboard
// Get current leaderboard
interface GetLeaderboardResponse {
  challenge_id: string;
  last_updated: string;
  total_participants: number;

  leaderboard: {
    rank: number;
    user_id: string;
    username: string;
    avatar_url: string;
    total_points: number;
    days_participated: number;
    accuracy: number;               // 0.65 = 65%
    max_streak: number;
    badges: string[];               // ["champion_oct_2025", "hot_streak"]
    rank_change?: number;           // +5, -2, etc (vs yesterday)
  }[];

  your_position?: {
    rank: number;
    total_points: number;
    distance_to_top: {
      points_needed: number;
      predictions_needed_estimate: number;
    };
    distance_to_next_tier: {
      tier: string;                 // "elite" (rank 2-3)
      points_needed: number;
    };
  };
}

// GET /api/users/:id/achievements
// Get user's achievements
interface GetAchievementsResponse {
  total_achievements: number;
  completion_rate: number;          // 0.35 = 35% of all achievements

  achievements: {
    code: string;
    name: string;
    description: string;
    category: string;               // "beginner", "intermediate", etc
    earned: boolean;
    earned_at?: string;
    progress?: {
      current: number;
      required: number;
      percentage: number;
    };
  }[];
}
```

### Cron Jobs

```typescript
// 1. Daily market close validation (22:00 UTC = 18:00 ET)
// File: server/workers/predictions-validator.ts

interface DailyValidatorJob {
  schedule: "0 22 * * 1-5",         // 22h UTC, weekdays only

  steps: [
    "1. Fetch S&P500 close (via FMP API)",
    "2. Fetch VIX close (via FMP API)",
    "3. Fetch featured stock close + open (calculate move %)",
    "4. Update predictions table with actual_results",
    "5. Calculate points for each prediction",
    "6. Apply bonuses (streaks, contrarian, perfect day)",
    "7. Update user total_points",
    "8. Refresh leaderboard materialized view",
    "9. Send notifications to users (results ready)"
  ],

  error_handling: {
    api_failure: "Retry 3x with exponential backoff",
    partial_data: "Mark predictions as 'pending' for manual review",
    notify_admin: "Send alert if >10% validations fail"
  }
}

async function validateDailyPredictions() {
  const today = new Date().toISOString().split('T')[0];

  // Fetch market data
  const [sp500, vix, featuredStock] = await Promise.all([
    marketDataService.getQuote('SPY'),
    marketDataService.getQuote('VIX'),
    marketDataService.getQuote(getFeaturedStockOfDay(today))
  ]);

  // Calculate results
  const results = {
    sp500_direction: sp500.change > 0,
    vix_above_20: vix.price > 20,
    featured_stock_move: Math.abs(featuredStock.changePercent) > 1
  };

  // Get all predictions for today
  const predictions = await db.predictions.findAll({
    where: {prediction_date: today}
  });

  // Score each prediction
  for (const prediction of predictions) {
    const scoring = calculateScore(prediction, results);

    await db.predictions.update(
      {
        sp500_result: results.sp500_direction,
        vix_result: results.vix_above_20,
        featured_stock_result: results.featured_stock_move,
        points_earned: scoring.total_points,
        streak_count: scoring.streak_count,
        bonuses_applied: scoring.bonuses,
        result_verified_at: new Date()
      },
      {where: {id: prediction.id}}
    );

    // Send notification
    await notificationService.sendPredictionResults(
      prediction.user_id,
      scoring
    );
  }

  // Refresh leaderboard
  await db.query('REFRESH MATERIALIZED VIEW challenge_leaderboard');

  logger.info(`Validated ${predictions.length} predictions for ${today}`);
}

// 2. Leaderboard refresh (every hour during market hours)
// File: server/workers/leaderboard-updater.ts

interface LeaderboardUpdaterJob {
  schedule: "0 9-16 * * 1-5",       // Every hour 9am-4pm ET, weekdays

  steps: [
    "1. Refresh materialized view",
    "2. Calculate rank changes",
    "3. Identify notable movements (±10 positions)",
    "4. Send notifications for big rank changes"
  ]
}

// 3. Achievement checker (daily at midnight)
// File: server/workers/achievement-checker.ts

interface AchievementCheckerJob {
  schedule: "0 0 * * *",            // Midnight UTC

  checks: [
    "Streaks (3, 7, 15, 30 days)",
    "Accuracy milestones (70%, 80%)",
    "Total predictions (100, 500, 1000)",
    "Perfect weeks",
    "Contrarian wins"
  ]
}

// 4. Monthly challenge finalization (1st of month, 1am)
// File: server/workers/challenge-finalizer.ts

interface ChallengeFinalizer {
  schedule: "0 1 1 * *",            // 1am on 1st of every month

  steps: [
    "1. Mark previous month challenge as 'completed'",
    "2. Finalize leaderboard (lock rankings)",
    "3. Award badges to winners (rank 1-50)",
    "4. Send winner notifications",
    "5. Create Hall of Fame entry",
    "6. Notify admin to process €25 payment",
    "7. Create new challenge for current month",
    "8. Send announcement to all users"
  ]
}
```

### Frontend Components

```typescript
// Component structure for Daily Predictions

// 1. Challenge Dashboard (homepage card)
// File: client/src/components/challenges/challenge-dashboard.tsx
export function ChallengeDashboard() {
  const { data: activeChallenge } = useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: () => api.get('/challenges/active')
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <h2>🏆 {activeChallenge.name}</h2>
          <Badge>{activeChallenge.days_remaining} days left</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Your Rank" value={`#${activeChallenge.your_rank}`} />
          <Stat label="Points" value={activeChallenge.your_points} />
          <Stat label="Prize" value={`€${activeChallenge.prize.amount}`} />
          <Stat label="Players" value={activeChallenge.participants_count} />
        </div>

        <Button onClick={() => navigate('/challenges/predictions')}>
          Make Today's Predictions →
        </Button>
      </CardContent>
    </Card>
  );
}

// 2. Daily Predictions Form
// File: client/src/components/challenges/daily-predictions-form.tsx
export function DailyPredictionsForm() {
  const [predictions, setPredictions] = useState({
    sp500_direction: null,
    vix_above_20: null,
    featured_stock_move: null
  });

  const { data: questions } = useQuery({
    queryKey: ['predictions', 'today'],
    queryFn: () => api.get(`/challenges/${challengeId}/predictions/today`)
  });

  const submitMutation = useMutation({
    mutationFn: (data) => api.post(`/challenges/${challengeId}/predictions`, data),
    onSuccess: () => {
      toast.success('Predictions submitted! 🎯');
    }
  });

  return (
    <div className="space-y-6">
      <Timer lockTime={questions.lock_time} />

      {questions.questions.map(q => (
        <PredictionQuestion
          key={q.id}
          question={q}
          value={predictions[q.type]}
          onChange={(val) => setPredictions({...predictions, [q.type]: val})}
          communitySplit={q.community_split}
        />
      ))}

      <Button
        onClick={() => submitMutation.mutate(predictions)}
        disabled={!allPredictionsMade || questions.locked}
      >
        Submit Predictions
      </Button>
    </div>
  );
}

// 3. Prediction Question Component
// File: client/src/components/challenges/prediction-question.tsx
export function PredictionQuestion({ question, value, onChange, communitySplit }) {
  return (
    <Card>
      <CardHeader>
        <h3>{question.question}</h3>
        <Badge variant={question.difficulty}>{question.difficulty}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            variant={value === true ? 'default' : 'outline'}
            onClick={() => onChange(true)}
            className="flex-1"
          >
            YES 🟢
            <small className="block text-xs opacity-70">
              {communitySplit?.yes}% picking this
            </small>
          </Button>

          <Button
            variant={value === false ? 'default' : 'outline'}
            onClick={() => onChange(false)}
            className="flex-1"
          >
            NO 🔴
            <small className="block text-xs opacity-70">
              {communitySplit?.no}% picking this
            </small>
          </Button>
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          Correct: +{question.points.correct} pts | Wrong: {question.points.wrong} pts
        </div>

        {communitySplit && communitySplit.yes > 80 && (
          <Badge variant="warning" className="mt-2">
            🎯 Contrarian bonus available! (+15 pts if you pick NO and win)
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// 4. Results Screen
// File: client/src/components/challenges/prediction-results.tsx
export function PredictionResults({ date }) {
  const { data: results } = useQuery({
    queryKey: ['predictions', 'results', date],
    queryFn: () => api.get(`/challenges/${challengeId}/predictions/results?date=${date}`)
  });

  return (
    <div className="space-y-4">
      <h2>📊 Results for {formatDate(date)}</h2>

      {/* Individual predictions */}
      <ResultCard
        question="S&P 500 closed green?"
        yourPick={results.user_prediction.sp500_direction}
        actual={results.actual_results.sp500_direction}
        points={results.scoring.sp500_points}
      />

      <ResultCard
        question="VIX >20?"
        yourPick={results.user_prediction.vix_above_20}
        actual={results.actual_results.vix_above_20}
        points={results.scoring.vix_points}
      />

      <ResultCard
        question="AAPL moved >1%?"
        yourPick={results.user_prediction.featured_stock_move}
        actual={results.actual_results.featured_stock_move}
        points={results.scoring.stock_points}
      />

      {/* Bonuses */}
      {results.scoring.bonuses.map(bonus => (
        <BonusCard key={bonus.type} type={bonus.type} points={bonus.points} />
      ))}

      {/* Summary */}
      <Card className="bg-primary">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {results.scoring.total_points > 0 ? '+' : ''}
              {results.scoring.total_points} pts
            </div>
            <div className="text-sm mt-2">
              Streak: {results.scoring.streak_count} days
              {results.scoring.streak_count >= 3 && ' 🔥'}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between">
            <div>
              Rank: #{results.rank_change.current}
              {results.rank_change.movement !== 0 && (
                <Badge className="ml-2">
                  {results.rank_change.movement > 0 ? '⬆️' : '⬇️'}
                  {Math.abs(results.rank_change.movement)}
                </Badge>
              )}
            </div>
            <Button onClick={() => navigate('/leaderboard')}>
              View Leaderboard →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 5. Leaderboard
// File: client/src/components/challenges/leaderboard.tsx
export function Leaderboard({ challengeId }) {
  const { data } = useQuery({
    queryKey: ['leaderboard', challengeId],
    queryFn: () => api.get(`/challenges/${challengeId}/leaderboard`)
  });

  return (
    <div className="space-y-4">
      {/* Your position card */}
      {data.your_position && (
        <Card className="border-2 border-primary">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3>Your Position</h3>
                <div className="text-2xl font-bold">#{data.your_position.rank}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Distance to #1</div>
                <div className="font-semibold">
                  {data.your_position.distance_to_top.points_needed} pts
                </div>
                <div className="text-xs text-muted-foreground">
                  ≈ {data.your_position.distance_to_top.predictions_needed_estimate} predictions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Accuracy</TableHead>
            <TableHead>Streak</TableHead>
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.leaderboard.map(entry => (
            <TableRow
              key={entry.user_id}
              className={entry.rank <= 3 ? 'bg-yellow-50' : ''}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {entry.rank === 1 && '🥇'}
                  {entry.rank === 2 && '🥈'}
                  {entry.rank === 3 && '🥉'}
                  #{entry.rank}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar src={entry.avatar_url} />
                  <div>
                    <div className="font-medium">{entry.username}</div>
                    <div className="flex gap-1">
                      {entry.badges.map(badge => (
                        <Badge key={badge} size="xs">{badge}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-bold">{entry.total_points}</TableCell>
              <TableCell>{(entry.accuracy * 100).toFixed(0)}%</TableCell>
              <TableCell>
                {entry.max_streak} {entry.max_streak >= 7 && '🔥'}
              </TableCell>
              <TableCell>
                {entry.rank_change > 0 && (
                  <Badge variant="success">⬆️ {entry.rank_change}</Badge>
                )}
                {entry.rank_change < 0 && (
                  <Badge variant="destructive">⬇️ {Math.abs(entry.rank_change)}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## COMPLIANCE & LEGALIDADE

### EU Legal Requirements

```typescript
interface EUComplianceChecklist {
  // ✅ LEGAL na EU se TODOS forem true:

  skill_based: {
    requirement: "Skill > luck dominância",
    alfalyzer_status: "✅ YES",
    reasoning: [
      "Análise fundamental melhora accuracy",
      "Ler transcripts dá vantagem",
      "Consistência recompensada (streaks)",
      "Não é pure chance (vs lottery)"
    ]
  },

  free_entry: {
    requirement: "100% grátis participar",
    alfalyzer_status: "✅ YES",
    reasoning: [
      "Sem buy-in",
      "Sem subscription obrigatória",
      "Pontos virtuais grátis",
      "Todos podem competir"
    ]
  },

  no_cash_out: {
    requirement: "Pontos virtuais NÃO convertem para dinheiro",
    alfalyzer_status: "✅ YES",
    reasoning: [
      "Só prémios fixos (€25/mês)",
      "Sem marketplace de pontos",
      "Sem transferências entre users",
      "Sem cash withdrawal"
    ]
  },

  age_verification: {
    requirement: "18+ obrigatório",
    alfalyzer_status: "⚠️ IMPLEMENTAR",
    action_needed: [
      "KYC no signup",
      "Verificar idade antes permitir challenges",
      "GDPR compliance (consent management)"
    ]
  },

  tax_compliance: {
    requirement: "Declarar prémios >€100",
    alfalyzer_status: "⚠️ IMPLEMENTAR",
    portugal_specific: {
      threshold: "€500 (prémios individuais)",
      withholding: "28% IRS (tu reténs se >€500)",
      reporting: "Declarar à AT (autoridade tributária)"
    },
    action_needed: [
      "Track winners (NIF obrigatório para prémios)",
      "Emitir recibos",
      "Declaração anual (IRS Anexo J)"
    ]
  },

  terms_and_conditions: {
    requirement: "T&Cs claros",
    must_include: [
      "Regras do challenge explicadas",
      "Como scoring funciona",
      "Prémios e como são distribuídos",
      "Disclaimers ('não é gambling')",
      "Direito de cancelar/modificar",
      "Resolução de disputas"
    ]
  },

  responsible_gaming: {
    requirement: "Safeguards contra vício",
    implementations: [
      "Caps de participação (ex: max 5 predictions/dia)",
      "Cooldowns (1h entre predictions)",
      "Self-exclusion option",
      "Educational prompts",
      "Sinais de problema (>10 sessions/dia → warn)"
    ]
  }
}
```

### Gambling vs Skill-Based Competition

```typescript
interface LegalClassification {
  gambling_characteristics: {
    consideration: "✅ FREE (no buy-in)",
    chance: "⚠️ PARTIAL (market movements têm randomness)",
    prize: "✅ YES (€25 cash)"
  },

  // Na EU, precisa de 3/3 para ser gambling
  // Alfalyzer: 1.5/3 → NÃO é gambling

  skill_based_evidence: [
    "Users que leem analysis têm +15% accuracy",
    "Top performers consistentes (não random winners)",
    "Streak bonuses recompensam consistência",
    "Predictions educam sobre markets"
  ],

  precedents: {
    fantasy_sports: "Legal EU (skill-based, free entry)",
    duolingo_leagues: "Legal (gamification, não gambling)",
    strava_challenges: "Legal (skill competitions)",
    poker_tournaments_free: "Legal (skill + free entry)"
  },

  risk_assessment: {
    daily_predictions: "✅ LOW RISK (clearly skill-based)",
    portfolio_challenge: "✅ LOW RISK (investment skill)",
    earnings_predictions: "✅ LOW RISK (fundamental analysis)",
    pairs_trading: "⚠️ MEDIUM RISK (pode parecer betting)",
    virtual_options: "❌ HIGH RISK (muito perto de gambling)"
  }
}
```

### Recommended Legal Actions

```typescript
interface LegalSetup {
  immediate: {
    lawyer_consultation: {
      cost: "€2,000-€5,000 one-time",
      scope: "Review challenge structure + T&Cs",
      deliverable: "Legal opinion letter (para mostrar autoridades se questionado)"
    },

    terms_and_conditions: {
      cost: "€500-€1,000 (template + customization)",
      must_cover: [
        "Challenge rules",
        "Prize distribution",
        "Skill vs luck statement",
        "Age verification",
        "Tax responsibilities",
        "Disclaimers"
      ]
    },

    age_verification: {
      cost: "€0 (simple checkbox + email verification)",
      upgrade_later: "€500-€1000 (KYC service integration)"
    }
  },

  before_scaling: {
    trigger: "When prizes exceed €100/winner",

    actions: [
      "Full KYC implementation (ID verification)",
      "Tax withholding system",
      "AT (tax authority) registration",
      "Insurance policy (liability)",
      "SRIJ consultation (Portugal gambling regulator)"
    ],

    cost: "€5,000-€10,000 setup + €2,000/year maintenance"
  },

  ongoing: {
    annual_tax_filing: "Declarar prémios distribuídos",
    terms_review: "Update annually ou quando mudar estrutura",
    compliance_monitoring: "Track regulatory changes EU/Portugal"
  }
}
```

---

## RECOMENDAÇÃO FINAL

### Fase 1 (Mês 1): MVP - Daily Predictions ⭐⭐⭐⭐⭐

**Implementar:**
- Opção 1: Daily Market Predictions
- Budget: €25/mês
- Dev time: 1 semana
- Legal: Lawyer review (€2k one-time)

**Justificação:**
- ✅ Mais simples implementar
- ✅ Daily engagement (habit forming)
- ✅ Claramente skill-based (legal safe)
- ✅ Feedback rápido (dopamina alta)
- ✅ Escalável (add features depois)

### Fase 2 (Mês 3-4): Add Earnings Challenge

**Quando:**
- Após 500+ users ativos
- Daily predictions funcionando bem

**Adicionar:**
- Opção 3: Earnings Prediction Challenge
- Budget: €15 (Daily) + €10 (Earnings) = €25 total
- Incentiva usar transcripts/AI analysis

### Fase 3 (Mês 6+): Premium Tier

**Monetização:**
- Cria Premium subscription (€9.99-€19.99/mês)
- Features: Advanced charts, alerts, AI analysis, unlimited transcripts
- Premium-only challenge (€10 prize)

**Economics:**
- Spend: €25/mês prizes
- Earn: 5% conversion × 1000 users × €15/mês = €750/mês
- Net: +€725/mês profit

### NÃO Implementar:

❌ **Opção 6 (Virtual Options)**: Muito perto de gambling, vicia users, destroi brand
⚠️ **Opção 4 (Hybrid)**: Demasiado complexo para MVP

---

## PRÓXIMOS PASSOS

### Semana 1: Legal + Planning
- [ ] Consulta com lawyer (€2k)
- [ ] Draft T&Cs
- [ ] Design database schema
- [ ] Plan API endpoints

### Semana 2: Development
- [ ] Backend: DB schema, API, cron jobs
- [ ] Frontend: Predictions form, results, leaderboard
- [ ] Testing: Edge cases, scoring logic

### Semana 3: Launch Prep
- [ ] Age verification
- [ ] Email templates (notifications)
- [ ] Announcement post
- [ ] Social media assets

### Semana 4: Launch
- [ ] Soft launch (beta users)
- [ ] Monitor engagement
- [ ] Iterate based on feedback
- [ ] Public launch

### Semana 5+: Optimize & Scale
- [ ] Add achievements system
- [ ] Broker partnerships
- [ ] Earnings challenge (Fase 2)
- [ ] Premium tier planning

---

**Documento criado:** 2025-10-10
**Última atualização:** 2025-10-10
**Autor:** Claude (Anthropic)
**Versão:** 1.0
