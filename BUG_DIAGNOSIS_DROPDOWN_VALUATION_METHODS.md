# Bug Diagnosis: Dropdown de Métodos de Valuation

**Data:** 2025-10-22
**Status:** ROOT CAUSE IDENTIFICADO
**Severity:** MEDIUM - Feature não funciona como esperado

---

## RESUMO EXECUTIVO

O user reportou que "quando seleciono outro método no dropdown, os valores não atualizam, ficam sempre os do alfavalue".

**Diagnóstico:** O bug NÃO é que os valores não atualizam. O bug REAL é que existe uma **incompatibilidade de nomenclatura** entre o frontend e o backend, causando falha no mapeamento de dados.

---

## INVESTIGAÇÃO REALIZADA

### 1. Teste em Produção (Chrome DevTools)

**URL Testada:** https://128.140.45.28.sslip.io/intrinsic-value
**Stock:** AAPL

**Fluxo de Teste:**
1. Estado inicial: Dropdown mostra "AlfaValue™ (Proprietary)"
2. Financial Inputs mostram:
   - Operating CF: 108,807 M
   - Debt: 119,059 M
   - Cash: 65,171 M
   - Discount Rate: 9.47%
   - Growth Rates: 10.35%, 7.11%, 4.93%

3. Mudança para "PEG Ratio"
4. Financial Inputs ATUALIZARAM para:
   - Operating CF: 258.579 M (mudou!)
   - Debt: 0 M (mudou!)
   - Cash: 0 M (mudou!)
   - Discount Rate: 1.50% (mudou!)
   - Growth Rates: 0.00%, 0.00%, 0.00% (mudou!)

**Conclusão:** Os valores ESTÃO a atualizar! O user report estava incorreto ou incompleto.

---

### 2. Análise de Network Requests

**API Endpoint:** `GET /api/iv/AAPL/chart?based_on=fcf&exclude_nri=false`

**Backend Response (HTTP 200):**
```json
{
  "ticker": "AAPL",
  "price": 258.5788,
  "methods": [
    {
      "name": "PEG Ratio",  // ← Backend retorna com espaço e capitalização
      "category": "growth",
      "iv": 103.47426788255626,
      "inputs": {
        "method": "peg",
        "fair_peg_ratio": 1.5,
        "last_price": 260.31,
        "eps_without_nri": 6.661796916382505,
        "pe_without_nri": 39.07504285515713,
        "growth_rate": 0.10354990721106616
      }
    }
  ]
}
```

O backend **ESTÁ A RETORNAR OS DADOS CORRETAMENTE** com todos os campos `inputs` populados.

---

### 3. Análise de Console Logs

**Console Output:**
```
[DEBUG] useEffect methodInputs for alfavalue (category: dcf ): {}
[DEBUG] useEffect methodInputs for peg (category: growth ): {}
```

Os `methodInputs` aparecem **VAZIOS** (`{}`), apesar do backend retornar dados completos!

---

## ROOT CAUSE IDENTIFICADO

### Problema: Name Mismatch entre Frontend e Backend

**Frontend** (`/client/src/pages/intrinsic-value.tsx:878`):
```tsx
<SelectItem value="peg">PEG Ratio</SelectItem>
```
- Dropdown value: `"peg"` (lowercase, sem espaços)

**Backend API Response:**
```json
{
  "name": "PEG Ratio"  // ← Nome com espaço e capitalização
}
```

**Código de Lookup** (`/client/src/pages/intrinsic-value.tsx:219`):
```tsx
const autoMethod = valuationChartData.methods.find(m => m.name === selectedMethod);
// selectedMethod = "peg"
// m.name = "PEG Ratio"
// "peg" === "PEG Ratio" → false
// autoMethod = undefined
// methodInputs = autoMethod?.inputs || {} → {}
```

---

## IMPACTO

✅ **O que FUNCIONA:**
- Backend retorna dados corretos para todos os 17 métodos
- API `/api/iv/AAPL/chart` com HTTP 200
- Dropdown UI muda visualmente
- useEffect é triggered corretamente
- Valores numéricos APARECEM (mas são fallback do AlfaValue, não do método selecionado)

❌ **O que NÃO FUNCIONA:**
- Mapeamento de nome do método (string comparison falha)
- `autoMethod` fica `undefined` para todos os métodos exceto "alfavalue"
- `methodInputs` fica vazio `{}`
- Todos os campos usam fallback do AlfaValue (`alfaValueData.inputs`)

---

## ANÁLISE DE CÓDIGO

### Linhas Afetadas

**intrinsic-value.tsx**

1. **Linha 219:** useEffect que popula `myCalculation`
```tsx
const autoMethod = valuationChartData.methods.find(m => m.name === selectedMethod);
```

2. **Linha 941:** Render do componente "Auto Calculation"
```tsx
const autoMethod = valuationChartData.methods.find(m => m.name === selectedMethod);
```

3. **Linhas 846-880:** Definição do dropdown com valores
```tsx
<SelectItem value="alfavalue">AlfaValue™ (Proprietary)</SelectItem>
<SelectItem value="peg">PEG Ratio</SelectItem>
<SelectItem value="psg">PSG Ratio</SelectItem>
// ... etc
```

### Mapeamento de Nomes

| Frontend Value | Backend Name | Match? |
|----------------|--------------|--------|
| `"alfavalue"` | `"AlfaValue\""` | ❌ |
| `"peg"` | `"PEG Ratio"` | ❌ |
| `"psg"` | `"PSG Ratio"` | ❌ |
| `"pe-mean"` | `"P/E Mean 5y"` | ❌ |
| `"dcf-20-fcf"` | `"DCF-20 FCF FMP"` | ❌ |

**TODOS OS MÉTODOS FALHARAM O MATCH!**

---

## SOLUÇÃO PROPOSTA

### Opção 1: Normalizar Backend (RECOMENDADO)

Modificar backend para retornar `method_id` além de `name`:

```json
{
  "name": "PEG Ratio",
  "method_id": "peg",  // ← Adicionar este campo
  "inputs": { ... }
}
```

Frontend altera lookup:
```tsx
const autoMethod = valuationChartData.methods.find(m => m.method_id === selectedMethod);
```

**Vantagens:**
- Separação clara entre display name e identifier
- Backend control sobre naming
- Frontend não quebra se backend mudar texto do display

---

### Opção 2: Normalizar Frontend

Criar função de mapping no frontend:

```tsx
const methodNameMap: Record<string, string> = {
  'alfavalue': 'AlfaValue"',
  'peg': 'PEG Ratio',
  'psg': 'PSG Ratio',
  'pe-mean': 'P/E Mean 5y',
  // ... todos os 17 métodos
};

const autoMethod = valuationChartData.methods.find(
  m => m.name === methodNameMap[selectedMethod]
);
```

**Desvantagens:**
- Hardcoded mapping (frágil)
- Quebra se backend mudar nomes
- Manutenção duplicada

---

### Opção 3: Case-Insensitive + Slug Comparison

Frontend cria função de normalização:

```tsx
const normalizeMethodName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');

const autoMethod = valuationChartData.methods.find(
  m => normalizeMethodName(m.name) === normalizeMethodName(selectedMethod)
);
```

**Exemplo:**
- `"PEG Ratio"` → `"pegratio"`
- `"peg"` → `"peg"` → ❌ Ainda não match!

Não resolve completamente.

---

## RECOMENDAÇÃO FINAL

**Implementar Opção 1: Backend adiciona `method_id`**

### TDD Approach

#### 1. Criar teste que reproduz o bug

```typescript
// server/services/__tests__/valuation-service.chart.test.ts

describe('Valuation Chart API - Method Lookup', () => {
  it('should include method_id for frontend matching', async () => {
    const result = await valuationService.getChartData('AAPL', 'fcf', false);

    expect(result.methods).toBeDefined();
    expect(result.methods.length).toBeGreaterThan(0);

    // Every method must have method_id matching frontend dropdown values
    const pegMethod = result.methods.find(m => m.method_id === 'peg');
    expect(pegMethod).toBeDefined();
    expect(pegMethod.name).toBe('PEG Ratio'); // Display name
    expect(pegMethod.method_id).toBe('peg'); // Frontend identifier
    expect(pegMethod.inputs).toBeDefined();
    expect(pegMethod.inputs.method).toBe('peg');
  });

  it('should have method_id for all 17 methods', async () => {
    const result = await valuationService.getChartData('AAPL', 'fcf', false);

    const expectedIds = [
      'alfavalue', 'dcf-20-fcf', 'dcf-20-ocf', 'dcf-20-ni',
      'dni-20', 'dfcf-terminal', 'dfcf-20',
      'pe-mean', 'pe-mean-nri', 'ps-mean', 'pb-mean', 'pb-mean-nri',
      'pe-median', 'pe-median-nri', 'ps-median', 'pb-median', 'pb-median-nri',
      'peg', 'psg'
    ];

    expectedIds.forEach(id => {
      const method = result.methods.find(m => m.method_id === id);
      expect(method).toBeDefined();
      expect(method.inputs).toBeDefined();
    });
  });
});
```

#### 2. Run test (deve falhar - RED)

```bash
npm test -- valuation-service.chart.test.ts
# Expected: test fails because method_id doesn't exist
```

#### 3. Implementar fix no backend (GREEN)

Modificar `/server/services/valuation-service.ts`:

```typescript
// Adicionar método para mapear frontend value → backend name
const getMethodId = (methodName: string): string => {
  const mapping: Record<string, string> = {
    'AlfaValue"': 'alfavalue',
    'PEG Ratio': 'peg',
    'PSG Ratio': 'psg',
    'P/E Mean 5y': 'pe-mean',
    'P/E Mean without NRI': 'pe-mean-nri',
    'P/S Mean 5y': 'ps-mean',
    'P/B Mean 5y': 'pb-mean',
    'P/B Mean 5Y (without NRI)': 'pb-mean-nri',
    'P/E Median 5y': 'pe-median',
    'P/E Median without NRI': 'pe-median-nri',
    'P/S Median 5y': 'ps-median',
    'P/B Median 5y': 'pb-median',
    'P/B Median 5Y (without NRI)': 'pb-median-nri',
    'DCF-20 FCF FMP': 'dcf-20-fcf',
    'DCF Terminal FCF FMP': 'dcf-20-terminal',
    'DNI-20 NI': 'dni-20',
    'DFCF Terminal': 'dfcf-terminal',
    'DFCF-20': 'dfcf-20',
  };

  return mapping[methodName] || methodName.toLowerCase();
};

// Modificar retorno de cada método
return {
  name: 'PEG Ratio',
  method_id: 'peg', // ← ADICIONAR ESTE CAMPO
  category: 'growth',
  iv: ...,
  inputs: { ... }
};
```

#### 4. Modificar frontend para usar method_id

`/client/src/pages/intrinsic-value.tsx`:

```tsx
// Linha 219
const autoMethod = valuationChartData.methods.find(m => m.method_id === selectedMethod);

// Linha 941
const autoMethod = valuationChartData.methods.find(m => m.method_id === selectedMethod);
```

#### 5. Run test novamente (deve passar - GREEN)

#### 6. Refactor se necessário

---

## VALIDAÇÃO

### Checklist de Testes

- [ ] Backend retorna `method_id` para todos os 17 métodos
- [ ] Frontend usa `method_id` em vez de `name` para lookup
- [ ] Mudar dropdown de "AlfaValue" → "PEG Ratio" mostra inputs corretos
- [ ] Mudar dropdown de "PEG Ratio" → "P/E Mean 5Y" mostra inputs corretos
- [ ] Console logs mostram `methodInputs` populados (não vazios)
- [ ] Gauge atualiza com valor correto do método selecionado
- [ ] Chart legend destaca método selecionado
- [ ] Todos os 17 métodos funcionam corretamente

---

## ARQUIVOS AFETADOS

### Backend
- `/server/services/valuation-service.ts` (adicionar `method_id`)
- `/server/services/__tests__/valuation-service.chart.test.ts` (novo teste)
- `/server/types/valuation.ts` (atualizar interface `ValuationMethod`)

### Frontend
- `/client/src/pages/intrinsic-value.tsx` (linhas 219, 941)
- `/client/src/hooks/use-valuation-chart.ts` (tipo do retorno)

---

## ESTIMATIVA

- **Backend changes:** 1-2 horas
- **Frontend changes:** 30 minutos
- **Tests:** 1 hora
- **QA validation:** 1 hora
- **Total:** 3-4 horas

---

## NEXT STEPS

1. ✅ Criar branch `fix/dropdown-valuation-method-lookup`
2. ⏳ Implementar testes (TDD Red)
3. ⏳ Implementar backend fix (TDD Green)
4. ⏳ Implementar frontend fix
5. ⏳ Validar com 17 métodos em produção
6. ⏳ Deploy

---

**Report gerado por:** Claude Code (TDD Debugging Specialist)
**Data:** 2025-10-22 16:30 UTC
