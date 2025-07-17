# 🧹 PHASE 5 - CLEANUP TASKS

**Para**: Claude Sonnet  
**De**: Claude Opus 4 (após auditoria completa)  
**Data**: 14/07/2025  
**Prioridade**: Alta - Corrigir antes de avançar para próxima fase

## 📋 TAREFAS DE CORREÇÃO IDENTIFICADAS

### 1. 🎨 REMOVER COMPLETAMENTE "chartreuse" DO CÓDIGO

**Problema**: Encontrei 20 arquivos ainda contendo referências a "chartreuse" ou "#D8F22D"

**Arquivos afetados** (pelo grep):
- `/client/src/App.tsx` (linhas 317 e 336)
- `/client/src/components/stock/performance-modal.tsx`
- `/client/src/components/stock/earnings-trends.tsx`
- `/client/src/pages/intrinsic-value.tsx`
- `/client/src/pages/earnings.tsx`
- `/client/src/pages/stock-detail.tsx`
- `/client/src/components/layout/sidebar.tsx`
- `/client/src/components/stock/unified-stock-card.tsx`
- `/client/src/pages/portfolios.tsx`
- E mais 11 arquivos...

**Ação requerida**:
```bash
# Substituir TODAS as ocorrências de:
- "chartreuse" → "teya-green"
- "#D8F22D" → "#F4FA4E"
- "from-chartreuse" → "from-teya-green"
- "to-chartreuse" → "to-teya-green"
- "bg-chartreuse" → "bg-teya-green"
- "text-chartreuse" → "text-teya-green"
- "border-chartreuse" → "border-teya-green"
```

**IMPORTANTE**: Fazer a substituição em TODOS os 20 arquivos identificados

### 2. 📊 REVERTER CHART-2 COLOR (OPCIONAL)

**Problema**: A cor `--chart-2` foi alterada para teya-green, mas o plan.md dizia para NÃO alterar cores dos charts

**Arquivo**: `/client/src/index.css`
- Linha 27: `--chart-2: 61 96% 64%; /* #F4FA4E - teya-green */`
- Linha 63: `--chart-2: 61 96% 64%; /* #F4FA4E - teya-green */`

**Ação requerida** (SE NECESSÁRIO):
- Verificar qual era a cor original do chart-2
- Decidir se mantém teya-green ou reverte para cor original
- Documentar a decisão

### 3. 📦 OTIMIZAR CHUNKS GRANDES (BAIXA PRIORIDADE)

**Problema**: 2 chunks são maiores que 150KB
- `charts-auto-BRg0Ppvl.js`: 144.06KB
- `charts-components-analysis-Bw5B1YjY.js`: 185.98KB

**Ação sugerida** (OPCIONAL):
- Analisar se podem ser divididos em chunks menores
- Considerar lazy loading mais granular
- OU simplesmente documentar que é aceitável pois são lazy loaded

## ✅ CRITÉRIOS DE CONCLUSÃO

1. **Obrigatório**: ZERO ocorrências de "chartreuse" no código (exceto em comentários explicativos)
2. **Obrigatório**: Build passa sem erros
3. **Opcional**: Decisão documentada sobre chart-2 color
4. **Opcional**: Chunks otimizados ou justificativa documentada

## 📝 INSTRUÇÕES PARA O SONNET

1. **Prioridade 1**: Corrigir TODAS as referências a chartreuse
2. **Prioridade 2**: Testar que o build continua funcionando
3. **Prioridade 3**: Atualizar plan2.md com as correções feitas
4. **Verificação**: Rodar `grep -r "chartreuse" client/src` para confirmar zero ocorrências

## 🎯 RESULTADO ESPERADO

Após estas correções:
- Fase 5 estará 100% completa
- Sistema de cores Teya 100% consistente
- Zero referências ao chartreuse antigo
- Código pronto para produção

---

**IMPORTANTE**: Estas são correções MENORES que não afetam funcionalidade. O trabalho da Fase 5 foi EXCELENTE, apenas precisamos desta limpeza final para perfeição total.

Tempo estimado: 1-2 horas máximo