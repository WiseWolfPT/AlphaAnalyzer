# 🧪 Suíte de Testes - Alfalyzer

Esta suíte de testes valida o fluxo completo do sistema: Frontend → Backend → Cache → Realtime.

## 📋 Estrutura dos Testes

```
tests/
├── e2e/                    # Testes end-to-end com Playwright
│   └── full-flow.spec.ts   # Fluxo completo do sistema
├── integration/            # Testes de integração
│   └── resilience.test.ts  # Testes de resiliência e fallback
├── performance/            # Testes de performance
│   └── load-test.ts        # Testes de carga e latência
├── monitoring/             # Dashboard de monitoramento
│   └── dashboard.html      # Interface visual de monitoramento
└── README.md              # Este arquivo
```

## 🚀 Como Executar os Testes

### Instalação de Dependências

```bash
# Instalar Playwright (se ainda não instalado)
npx playwright install

# Instalar outras dependências
npm install
```

### Execução Rápida

```bash
# Executar todos os testes
./scripts/run-tests.sh all

# Executar tipo específico
./scripts/run-tests.sh e2e          # Testes E2E
./scripts/run-tests.sh performance  # Testes de performance
./scripts/run-tests.sh integration  # Testes de integração
./scripts/run-tests.sh monitoring   # Abrir dashboard
```

### Execução Manual

#### Testes E2E (Playwright)

```bash
# Executar todos os testes E2E
npx playwright test

# Executar com interface visual
npx playwright test --ui

# Executar com navegador visível
npx playwright test --headed

# Executar teste específico
npx playwright test tests/e2e/full-flow.spec.ts

# Ver relatório após execução
npx playwright show-report
```

#### Testes de Integração (Vitest)

```bash
# Executar testes de resiliência
npx vitest run tests/integration/resilience.test.ts

# Modo watch
npx vitest watch tests/integration/

# Com coverage
npx vitest run --coverage
```

#### Testes de Performance

```bash
# Executar testes de carga
npx playwright test tests/performance/load-test.ts

# Com métricas detalhadas
VERBOSE=true npx playwright test tests/performance/
```

### Dashboard de Monitoramento

```bash
# Abrir dashboard no navegador
open tests/monitoring/dashboard.html

# Ou usar o script
./scripts/run-tests.sh monitoring
```

## 📊 O Que é Testado

### 1. Fluxo Completo (E2E)
- ✅ Cache hit vs cache miss
- ✅ Atualizações realtime via Supabase
- ✅ Visualização de dados no frontend
- ✅ Fallback quando backend offline
- ✅ Rate limiting
- ✅ Cold start do Koyeb

### 2. Performance
- ⚡ Latência com cache hit/miss
- ⚡ Requisições concorrentes
- ⚡ Latência WebSocket/Realtime
- ⚡ Teste de stress sustentado
- ⚡ Métricas e percentis (P50, P90, P99)

### 3. Resiliência
- 🛡️ Backend offline
- 🛡️ APIs externas falhando
- 🛡️ Circuit breaker
- 🛡️ Reconexão automática
- 🛡️ Degradação graciosa
- 🛡️ Proteção contra sobrecarga

### 4. Monitoramento em Tempo Real
- 📈 Status dos serviços
- 📈 Métricas de performance
- 📈 Uso de APIs externas
- 📈 Estatísticas realtime
- 📈 Logs em tempo real

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# URLs dos serviços
export BACKEND_URL=http://localhost:3001
export FRONTEND_URL=http://localhost:3000
export KOYEB_URL=https://seu-app.koyeb.app

# Supabase (necessário para testes realtime)
export VITE_SUPABASE_URL=sua-url
export VITE_SUPABASE_ANON_KEY=sua-chave
```

### Arquivo .env.test

Crie um arquivo `.env.test` para configurações de teste:

```env
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
VITE_SUPABASE_URL=sua-url
VITE_SUPABASE_ANON_KEY=sua-chave
```

## 📈 Interpretando os Resultados

### Métricas de Performance

- **Latência Média**: Deve ser < 100ms para cache hit
- **Cache Hit Rate**: Ideal > 80%
- **Taxa de Erro**: Deve ser < 1%
- **P99**: Deve ser < 500ms mesmo sob carga

### Indicadores de Saúde

🟢 **Healthy**: Sistema funcionando normalmente
🟡 **Warning**: Degradação parcial, mas funcional
🔴 **Error**: Falha crítica necessitando atenção

## 🐛 Troubleshooting

### Testes falhando com "connection refused"

```bash
# Verificar se os serviços estão rodando
npm run health

# Iniciar serviços manualmente
npm run dev
```

### Testes de realtime falhando

1. Verificar credenciais do Supabase
2. Confirmar que o canal está configurado corretamente
3. Verificar logs do backend para erros de broadcast

### Performance abaixo do esperado

1. Verificar se o cache Redis está funcionando
2. Confirmar rate limits das APIs
3. Analisar logs de performance no dashboard

## 🚀 CI/CD

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:ci
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## 📝 Adicionando Novos Testes

### Teste E2E

```typescript
// tests/e2e/novo-teste.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Nova funcionalidade', () => {
  test('deve fazer algo específico', async ({ page }) => {
    await page.goto('/');
    // seu teste aqui
  });
});
```

### Teste de Integração

```typescript
// tests/integration/novo-teste.test.ts
import { describe, it, expect } from 'vitest';

describe('Nova integração', () => {
  it('deve integrar corretamente', async () => {
    // seu teste aqui
  });
});
```

## 🎯 Próximos Passos

1. Adicionar testes de segurança
2. Implementar testes de acessibilidade
3. Criar testes de regressão visual
4. Adicionar monitoramento de SLA
5. Implementar alertas automáticos

---

💡 **Dica**: Use o dashboard de monitoramento durante o desenvolvimento para acompanhar métricas em tempo real!