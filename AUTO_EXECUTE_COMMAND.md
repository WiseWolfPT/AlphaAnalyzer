# 🚀 COMANDO AUTOMÁTICO PARA EXECUTAR ALFALYZER

## OPÇÃO 1: Executar uma Fase Completa

```
Lê o ficheiro PARALLEL_EXECUTION_PROMPTS.md e executa TODOS os prompts da PHASE 1 sequencialmente. Quando um grupo de agentes terminar, passa automaticamente para o próximo prompt da mesma fase. Usa sempre --ultrathink.
```

## OPÇÃO 2: Executar Todas as Fases (Full Auto)

```
Lê o ficheiro PARALLEL_EXECUTION_PROMPTS.md e executa TODAS as fases em ordem:
1. Começa pela PHASE 1 (todos os prompts 1.1, 1.2, 1.3)
2. Quando a PHASE 1 estiver completa, passa para PHASE 2
3. Continua até completar todas as 5 fases
4. Usa sempre --ultrathink
5. Reporta progresso após cada prompt completado
6. Se houver erros, para e pede instruções
```

## OPÇÃO 3: Executar com Checkpoints

```
Lê PARALLEL_EXECUTION_PROMPTS.md e executa automaticamente, mas:
- Para no final de cada PHASE para eu verificar
- Mostra um resumo do que foi criado
- Pergunta se pode continuar para a próxima fase
- Usa sempre --ultrathink
```

## OPÇÃO 4: Smart Execute (Recomendado)

```
--ultrathink

1. Lê PARALLEL_EXECUTION_PROMPTS.md
2. Lê IMPLEMENTATION_GUIDE.md para contexto
3. Começa a executar pela PHASE 1
4. Para cada prompt:
   - Lança os agentes em paralelo
   - Aguarda conclusão
   - Verifica se há erros
   - Se tudo OK, passa para o próximo
5. No fim de cada fase:
   - Mostra resumo dos ficheiros criados
   - Lista any warnings ou TODOs
   - Aguarda confirmação para continuar
6. Se encontrar dependências não resolvidas:
   - Para e explica o problema
   - Sugere solução
```

## COMANDO MAIS SIMPLES POSSÍVEL:

```
Executa o Alfalyzer seguindo PARALLEL_EXECUTION_PROMPTS.md. Começa pela PHASE 1 e vai avançando automaticamente. Usa --ultrathink sempre.
```