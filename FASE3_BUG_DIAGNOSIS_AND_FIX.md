# FASE 3: Diagnóstico e Fix do Bug Dropdown

**Data:** 2025-10-21 20:15 UTC
**Bug:** Dropdown de métodos só mostra valores do AlfaValue™, não atualiza para outros métodos

---

## 🐛 BUG CONFIRMADO

**Sintoma:**
- User seleciona método diferente no dropdown (ex: "DCF-20", "PEG", "Mean P/E")
- UI **NÃO atualiza** os inputs
- **Sempre** mostra os mesmos valores (do AlfaValue™)

**Root Cause:**
Backend `/api/iv/:ticker/chart` retorna array de métodos **SEM** o campo `inputs`

---

## 🔍 ANÁLISE DO CÓDIGO ATUAL

### Frontend: intrinsic-value.tsx

**Linha 83:**
```typescript
const [selectedMethod, setSelectedMethod] = useState('alfavalue');
```

**Linhas 183-211:** `useEffect` tenta buscar `inputs` do método selecionado:
```typescript
useEffect(() => {
  if (alfaValueData && valuationChartData) {
    const autoMethod = valuationChartData.methods.find(m => m.name === selectedMethod);
    const price = valuationChartData.price;
    const iv = autoMethod?.iv || alfaValueData.iv;
    const premium = ((price - iv) / iv) * 100;

    // ❌ BUG: autoMethod?.inputs é SEMPRE undefined!
    const methodInputs = autoMethod?.inputs || {};
    console.log('[DEBUG] useEffect methodInputs for', selectedMethod, ':', methodInputs);

    setMyCalculation({
      stockPrice: price,
      iv: iv,
      premium: premium,
      // ❌ Sempre usa alfaValueData porque methodInputs está vazio
      operatingCF: methodInputs.ocf_ttm_musd || alfaValueData.operatingCF || 0,
      totalDebt: methodInputs.total_debt_musd || alfaValueData.totalDebt || 0,
      cash: methodInputs.cash_musd || alfaValueData.cash || 0,
      // ...
    });
  }
}, [alfaValueData, valuationChartData, selectedMethod]);
```

**Linha 712:** Dropdown onChange chama `setSelectedMethod()`:
```typescript
<Select
  value={selectedMethod}
  onValueChange={(value) => setSelectedMethod(value)}  // ✅ Funciona
>
```

**Conclusão Frontend:** ✅ Código está CORRETO, espera `inputs` no array `methods`

---

### Backend: iv-chart-controller.ts

**Linhas 124-150:** Função `addMethod()`:
```typescript
const addMethod = (
  result: PromiseSettledResult<any>,
  name: string,
  category: 'proprietary' | 'dcf' | 'multiples' | 'growth',
  formula: string,
  source: 'internal' | 'fmp' | 'hybrid',
  extractIV: (data: any) => number | null
) => {
  if (result.status === 'fulfilled' && result.value) {
    const rawIV = extractIV(result.value);
    if (rawIV && rawIV > 0 && isFinite(rawIV)) {
      const adjustedIV = macroService.applyMultiplier(rawIV, macroMultiplier);
      const discount_pct = ((adjustedIV - price) / price) * 100;

      // ❌ BUG: NÃO retorna `inputs`!
      methods.push({
        name,
        category,
        iv: adjustedIV,
        discount_pct,
        formula,
        confidence: result.value.confidence || 'MED',
        source,
        as_of: result.value.as_of || new Date().toISOString().split('T')[0],
        // ❌ FALTA: inputs: getInputsForMethod(name, result.value)
      });
    }
  }
};
```

**Conclusão Backend:** ❌ `addMethod()` NÃO retorna campo `inputs`

---

## ✅ FIX NECESSÁRIO

### 1. Criar Função `getInputsForMethod()`

**Localização:** `/server/controllers/iv-chart-controller.ts`

**Adicionar ANTES de `addMethod()`:**

```typescript
/**
 * Extract method-specific inputs from valuation data
 * @param methodName - Name of the method (e.g., 'DCF-20 FCF FMP')
 * @param data - Raw valuation data from service
 * @param ticker - Stock symbol
 * @returns Method inputs object or null
 */
function getInputsForMethod(
  methodName: string,
  data: any,
  ticker: string
): any | null {
  if (!data) return null;

  // Map method name to input structure
  switch (methodName) {
    case 'AlfaValue™':
      return {
        method: 'alfavalue',
        based_on: 'fcf',
        fcf_ttm_musd: data.fcf || 0,
        total_debt_musd: data.totalDebt || 0,
        cash_musd: data.cash || 0,
        discount_rate: data.discountRate || 0.0627,  // CAPM conservador default
        shares_outstanding_m: data.sharesOutstanding || 0,
        growth_rate_y1_5: data.growthY1_5 || 0,
        growth_rate_y6_10: data.growthY6_10 || 0,
        growth_rate_y11_20: data.growthY11_20 || 0,
        deduct_debt: true,
        add_cash: true,
      };

    case 'DCF-20 FCF FMP':
    case 'DCF-20 FCFE FMP':
      return {
        method: 'dcf-20',
        based_on: methodName.includes('FCFE') ? 'fcfe' : 'fcf',
        fcf_ttm_musd: data.freeCashFlow || 0,
        total_debt_musd: data.totalDebt || 0,
        cash_musd: data.cashAndCashEquivalents || 0,
        discount_rate: 0.0627,  // ✅ CAPM conservador (Rf=1%, MRP=4.8%)
        shares_outstanding_m: data.sharesOutstanding || 0,
        growth_rate_y1_5: data.growthRateY1_5 || 0,
        growth_rate_y6_10: data.growthRateY6_10 || 0,
        growth_rate_y11_20: data.growthRateY11_20 || 0,
        deduct_debt: true,
        add_cash: true,
      };

    case 'DFCF Terminal':
      return {
        method: 'dfcf-terminal',
        based_on: 'fcf',
        fcf_ttm_musd: data.fcf || 0,
        total_debt_musd: data.totalDebt || 0,
        cash_musd: data.cash || 0,
        discount_rate: data.wacc || 0.1036,  // ✅ WACC (calculated)
        shares_outstanding_m: data.sharesOutstanding || 0,
        stage1_years: 5,
        stage1_growth_rate: data.growthY1_5 || 0,
        stage1_value: data.stage1Value || 0,  // CALCULATED
        stage2_years: 5,
        stage2_growth_rate: data.growthY6_10 || 0,
        stage2_value: data.stage2Value || 0,  // CALCULATED
        terminal_growth_rate: data.terminalGrowth || 0.0363,
        terminal_value: data.terminalValue || 0,  // CALCULATED
        deduct_debt: true,
        add_cash: true,
      };

    case 'DNI-20':
      return {
        method: 'dni-20',
        based_on: 'ni',
        net_income_ttm_musd: data.netIncome || 0,
        total_debt_musd: data.totalDebt || 0,
        cash_musd: data.cash || 0,
        discount_rate: 0.0627,  // ✅ CAPM conservador
        shares_outstanding_m: data.sharesOutstanding || 0,
        growth_rate_y1_5: data.growthY1_5 || 0,
        growth_rate_y6_10: data.growthY6_10 || 0,
        growth_rate_y11_20: data.growthY11_20 || 0,
        deduct_debt: true,
        add_cash: true,
      };

    case 'Mean P/E 5Y':
    case 'Mean P/E Without NRI':
      return {
        method: 'pe-mean',
        exclude_nri: methodName.includes('Without NRI'),
        mean_pe_ratio_5y: data.avgPE || 0,
        current_price: data.currentPrice || 0,
        eps_ttm: data.eps || 0,
        // Historical ratios (read-only)
        pe_ratios: data.historicalPE || [],
      };

    case 'Median P/E 5Y':
    case 'Median P/E Without NRI':
      return {
        method: 'pe-median',
        exclude_nri: methodName.includes('Without NRI'),
        median_pe_ratio_5y: data.medianPE || 0,
        current_price: data.currentPrice || 0,
        eps_ttm: data.eps || 0,
        pe_ratios: data.historicalPE || [],
      };

    case 'Mean P/S 5Y':
      return {
        method: 'ps-mean',
        mean_ps_ratio_5y: data.avgPS || 0,
        current_price: data.currentPrice || 0,
        sales_per_share_ttm: data.salesPerShare || 0,
        ps_ratios: data.historicalPS || [],
      };

    case 'Median P/S 5Y':
      return {
        method: 'ps-median',
        median_ps_ratio_5y: data.medianPS || 0,
        current_price: data.currentPrice || 0,
        sales_per_share_ttm: data.salesPerShare || 0,
        ps_ratios: data.historicalPS || [],
      };

    case 'Mean P/B 5Y':
    case 'Mean P/B Without NRI':
      return {
        method: 'pb-mean',
        exclude_nri: methodName.includes('Without NRI'),
        mean_pb_ratio_5y: data.avgPB || 0,
        current_price: data.currentPrice || 0,
        book_value_per_share_ttm: data.bookValuePerShare || 0,
        pb_ratios: data.historicalPB || [],
      };

    case 'Median P/B 5Y':
    case 'Median P/B Without NRI':
      return {
        method: 'pb-median',
        exclude_nri: methodName.includes('Without NRI'),
        median_pb_ratio_5y: data.medianPB || 0,
        current_price: data.currentPrice || 0,
        book_value_per_share_ttm: data.bookValuePerShare || 0,
        pb_ratios: data.historicalPB || [],
      };

    case 'PEG':
      return {
        method: 'peg',
        fair_peg_ratio: 1.5,  // ✅ DEFAULT EDITÁVEL
        last_price: data.currentPrice || 0,
        eps_without_nri: data.epsWithoutNRI || 0,
        pe_without_nri: data.peWithoutNRI || 0,
        growth_rate: data.epsGrowthRate || 0,
        peg_ratio_without_nri: data.pegRatio || 0,
      };

    case 'PSG':
      return {
        method: 'psg',
        fair_psg_ratio: 0.2,  // ✅ DEFAULT EDITÁVEL
        last_price: data.currentPrice || 0,
        sales_per_share: data.salesPerShare || 0,
        ps_ratio: data.psRatio || 0,
        growth_rate: data.revenueGrowthRate || 0,
        psg_ratio: data.psgRatio || 0,
      };

    default:
      return null;
  }
}
```

---

### 2. Atualizar `addMethod()` para incluir `inputs`

**Modificar linha 138:**

```typescript
// ❌ ANTES:
methods.push({
  name,
  category,
  iv: adjustedIV,
  discount_pct,
  formula,
  confidence: result.value.confidence || 'MED',
  source,
  as_of: result.value.as_of || new Date().toISOString().split('T')[0],
});

// ✅ DEPOIS:
methods.push({
  name,
  category,
  iv: adjustedIV,
  discount_pct,
  formula,
  confidence: result.value.confidence || 'MED',
  source,
  as_of: result.value.as_of || new Date().toISOString().split('T')[0],
  inputs: getInputsForMethod(name, result.value, ticker),  // ✅ ADICIONAR
});
```

---

### 3. Atualizar TypeScript Interface

**Localização:** `/server/types/valuation.ts`

**Modificar `ValuationMethod` interface (linha ~50):**

```typescript
export interface ValuationMethod {
  name: string;
  category: 'proprietary' | 'dcf' | 'multiples' | 'growth';
  iv: number;
  discount_pct: number;
  formula: string;
  confidence: 'HIGH' | 'MED' | 'LOW';
  source: 'internal' | 'fmp' | 'hybrid';
  as_of: string;
  inputs?: any;  // ✅ ADICIONAR (opcional para backward compatibility)
}
```

---

## 🧪 TESTING PLAN

### Test Case 1: AlfaValue™
```bash
curl "http://localhost:3001/api/iv/AAPL/chart"
```

**Expected:**
```json
{
  "methods": [
    {
      "name": "AlfaValue™",
      "iv": 199.61,
      "inputs": {
        "method": "alfavalue",
        "fcf_ttm_musd": 96184,
        "discount_rate": 0.0627,
        // ...
      }
    }
  ]
}
```

### Test Case 2: Dropdown Change (Frontend)
1. Abrir `/intrinsic-value?ticker=AAPL`
2. Verificar dropdown mostra "AlfaValue™"
3. Mudar para "DCF-20 FCF FMP"
4. **Verificar:** Inputs atualizam (OCF, Debt, Cash mudam)
5. **Verificar:** IV muda para valor do DCF-20

### Test Case 3: Multiple Stocks
```bash
curl "http://localhost:3001/api/iv/GOOGL/chart"
curl "http://localhost:3001/api/iv/MSFT/chart"
```

**Verificar:** Cada ticker retorna inputs diferentes (beta → WACC diferente)

---

## 📊 IMPACTO DO FIX

### Antes (Bug):
- ❌ Dropdown não funciona
- ❌ Sempre mostra AlfaValue™ inputs
- ❌ User confuso (seleciona DCF-20 mas vê outros valores)
- ❌ "My Calculation" inútil (não consegue editar outros métodos)

### Depois (Fix):
- ✅ Dropdown funciona
- ✅ Inputs atualizam por método
- ✅ User vê valores corretos para cada método
- ✅ Pode editar e comparar "Auto" vs "My Calculation"
- ✅ Competitivo com StockOracle (17 métodos funcionais)

---

## 🚀 DEPLOYMENT

### 1. Build
```bash
cd "/Users/antoniofrancisco/Documents/teste 1"
npm run build:server
```

### 2. Deploy
```bash
tar czf /tmp/fase3-dropdown-fix.tar.gz server/
scp /tmp/fase3-dropdown-fix.tar.gz root@128.140.45.28:/tmp/
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && rm -rf server && tar xzf /tmp/fase3-dropdown-fix.tar.gz'
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env"
```

### 3. Validation
```bash
# Test endpoint
curl "https://128.140.45.28.sslip.io/api/iv/AAPL/chart" | jq '.methods[0].inputs'

# Should return object, not null/undefined
```

---

## ✅ CHECKLIST

- [x] Diagnóstico completo do bug
- [ ] Implementar `getInputsForMethod()`
- [ ] Atualizar `addMethod()` com `inputs` field
- [ ] Atualizar TypeScript interface
- [ ] Build local
- [ ] Test local (localhost:3001)
- [ ] Deploy para produção
- [ ] Test produção com AAPL
- [ ] Test dropdown no frontend produção
- [ ] Test com GOOGL/MSFT (múltiplas stocks)
- [ ] Marcar bug como RESOLVED

---

**Data:** 2025-10-21 20:20 UTC
**Status:** ✅ Diagnóstico completo, aguardando implementação
**Próximo passo:** Implementar `getInputsForMethod()` e fazer deploy
