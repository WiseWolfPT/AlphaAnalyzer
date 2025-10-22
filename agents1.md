# AGENTS.md — Alfalyzer (Agentes Específicos)

Documento de definição dos agentes responsáveis por áreas específicas do projeto. Baseado no contexto em `CLAUDE.md`. Escopo: todo o repositório.

## Modo de Trabalho Global
- Segurança: nunca expor segredos no cliente ou com `VITE_` se sensível; respeitar RLS e validação de origem.
- Qualidade: sem `any`, sem default exports, navegação com Wouter, fallback de APIs na ordem definida.
- Entregáveis: PRs pequenos, com checklist e validação local; atualizar `CLAUDE.md` quando relevante.
- Handoffs: cada agente publica outputs claros (artefatos, PRs, notas) e notifica o próximo agente do fluxo.

## Agentes e Responsabilidades

1) Agente A1 — Segurança de API e Gateway
- Missão: garantir requests seguros, proteção de endpoints sensíveis e política de origem correta.
- Escopo: `/server/middleware/api-security.ts`, rate limit, auth, CORS, proteção de `/api/market-data/batch`.
- Entradas: requisitos de segurança, domínios válidos, limites de uso.
- Saídas: middleware revisado, testes de segurança, documentação de políticas.
- Salvaguardas: regex aceitar HTTPS; nunca `*`; logs de 403; testes com Origin/Referer.
- Sucesso: 0 exposições de segredo, 0 falsos positivos críticos, sem 403 indevidos em domínios válidos.

2) Agente A2 — Dados de Mercado e Cache
- Missão: integrar provedores (FMP primário) com fallback e cache Redis eficiente.
- Escopo: `/server/routes/market-data.ts`, `/server/services/simple-cache-service.ts`, jobs de priming a cada 60s.
- Entradas: chaves de APIs (servidor), símbolos solicitados, políticas de TTL.
- Saídas: endpoints com cache, métricas de hit/miss, fallback resiliente.
- Salvaguardas: TTL 60s para preços, até 24h para dados estáticos; evitar thundering herd.
- Sucesso: >90% cache hit em preços quentes, latência 95p baixa, ausência de $0.00 por falta de chave/config.

3) Agente A3 — Frontend Navegação e UI
- Missão: navegação fluida com Wouter e UI consistente (Tailwind + shadcn/ui).
- Escopo: `client/src/App.tsx`, componentes e hooks (ex.: `use-realtime-quotes.ts`).
- Entradas: rotas e UX desejadas, estados e dados da API.
- Saídas: rotas corrigidas, telas de dashboard melhoradas, null-safe formatting.
- Salvaguardas: Wouter obrigatório; checks antes de `.toFixed()`; nada de segredos no client.
- Sucesso: zero erros de runtime de formato numérico, navegação estável.

4) Agente A4 — Transcripts e Sumarização AI
- Missão: implementar ingestão, storage (PostgreSQL local em prod) e sumarização de transcripts.
- Escopo: tabela `transcripts`, endpoints CRUD, worker de ingestão, sumarização opcional.
- Entradas: fontes de transcripts, mapeamento ticker/empresa, políticas de retenção.
- Saídas: API de transcripts, UI básica, campos `ai_summary` consistentes.
- Salvaguardas: storage fora do client; tamanho de payload paginado; cache para resultados estáticos.
- Sucesso: ingestão confiável, consultas rápidas, sem vazamento de PII.

5) Agente A5 — Admin Panel e RBAC
- Missão: criar painel de administração para chaves, limites e feature flags.
- Escopo: UI admin, endpoints protegidos, roles via Supabase Auth (ou tabela local + RLS).
- Entradas: políticas de permissão, lista de features gerenciáveis.
- Saídas: painel funcional, logs de auditoria para ações sensíveis.
- Salvaguardas: acesso somente autenticado e privilegiado; rate limit agressivo.
- Sucesso: operações de admin rastreáveis, sem acesso indevido.

6) Agente A6 — Infra/DevOps e Deploy
- Missão: confiabilidade de build/deploy (Hetzner, Nginx, PM2, SSL), scripts e rollback.
- Escopo: `npm run deploy|ship`, `ship-to-production.sh`, Nginx proxy, PM2 `alfalyzer`.
- Entradas: artefatos de build, configs de Nginx/PM2, variáveis `.env.production`.
- Saídas: deploys reproduzíveis, rollback documentado, uptime consistente.
- Salvaguardas: nunca alterar segredos via client; reiniciar com `--update-env` após mudanças.
- Sucesso: deploy sem downtime perceptível, logs limpos, certificados válidos.

7) Agente A7 — Observabilidade e Qualidade
- Missão: métricas, logs, testes e SLOs básicos (latência, erros, cache hit).
- Escopo: testes para services críticos, dashboards simples, padrões de log.
- Entradas: KPIs do produto, endpoints-alvo.
- Saídas: testes automatizados mínimos, documentação de SLOs, scripts de verificação.
- Salvaguardas: evitar custo operacional alto; priorizar pontos críticos.
- Sucesso: regressões pegas em dev, latência e erros dentro de metas.

8) Agente A8 — Banco de Dados e RLS
- Missão: garantir esquemas, RLS e políticas corretas no Supabase; Postgres local para dados pesados.
- Escopo: migrações, políticas RLS, índices; tabelas `portfolios`, `watchlists`, `transcripts`.
- Entradas: requisitos de isolamento, consultas típicas.
- Saídas: migrações revisadas, RLS testada, índices eficazes.
- Salvaguardas: nenhuma tabela sem RLS; evitar N+1; revisar planos de consulta.
- Sucesso: consultas rápidas e seguras, sem vazamento entre usuários.

9) Agente A9 — Compliance & Data Governance
- Missão: assegurar conformidade (GDPR/PII) e governança de dados (retenção, consentimento, auditoria).
- Escopo: políticas de retenção/anonimização, trilhas de auditoria de acesso, classificação de dados.
- Entradas: requisitos legais, tipos de dados coletados, SLAs de retenção.
- Saídas: políticas aplicáveis, documentação e checks automatizados onde possível.
- Salvaguardas: nenhum dado pessoal exposto em logs; RLS obrigatória; minimização de dados.
- Sucesso: auditorias sem achados críticos; processos de deleção/anonimização verificados.

10) Agente A10 — SRE & Incident Response
- Missão: confiabilidade operacional, SLOs/SLIs, gestão de incidentes e DR/backup.
- Escopo: definição de SLO (latência/erro), runbooks, testes de carga, verificação de backups/restore.
- Entradas: métricas de A7, arquitetura de A6, prioridades de produto.
- Saídas: SLO publicados, playbooks, exercícios de incidente/restore.
- Salvaguardas: mudanças coordenadas com A6; não degradar custo/perf sem avaliação.
- Sucesso: MTTR baixo, aderência a SLO, restores validados periodicamente.

## Coordenação e Handoffs
- A1 → A2: políticas de proteção e limites aplicados aos endpoints de dados.
- A2 → A3: contratos de API estáveis e caches prontos para UI.
- A4 → A3: endpoints e schema para UI de transcripts.
- A5 → A1: rotas admin sob proteção e auditoria.
- A6 ↔ Todos: janelas de deploy e rollback.
- A7 ↔ Todos: testes mínimos e monitorização.
- A8 ↔ A2/A4: esquemas e índices para consultas eficientes.
- A9 ↔ A1/A8: políticas de acesso, retenção e auditoria alinhadas ao RLS.
- A10 ↔ A6/A7/A2: SLOs, capacidade, incidentes e DR coordenados.

## Backlog Inicial por Agente (prioritário)
- A1: proteger `/api/market-data/batch` (auth + rate limit + escopo), validar regex de origem.
- A2: métricas de cache hit/miss; garantir fallback completo; evitar $0.00.
- A3: corrigir navegação no dashboard (`client/src/App.tsx`).
- A4: CRUD + ingestão de transcripts e sumarização; paginação.
- A5: scaffold de Admin Panel com RBAC via Supabase.
- A6: confirmar `npm run deploy/ship`, revisar Nginx e PM2; script de rollback.
- A7: testes dos services de cache/market-data; scripts de verificação rápida.
- A8: revisar RLS de `portfolios` e `watchlists`, índices úteis.
- A9: política de retenção/anonimização para `transcripts` + auditoria de acesso.
- A10: definir SLOs (latência P95/erro) e runbook de incidentes (403/$0.00/queda de API).

## Definição de Pronto (DoD)
- Segurança validada (A1), performance/cache revisados (A2), UX sem quebras (A3), testes mínimos (A7).
- Sem segredos expostos; RLS ok (A8); documentação atualizada (`CLAUDE.md`/este arquivo).

## Runbooks Rápidos
- Logs PM2: `pm2 logs alfalyzer --lines 50`
- Restart com env: `pm2 restart alfalyzer --update-env`
- Testar cache batch local: `curl -X POST localhost:3001/api/cache/quotes/batch -H 'Content-Type: application/json' -d '{"symbols":["AAPL"]}'`

## Notas
- Consultar `CLAUDE.md` para detalhes de produção, portas, variáveis e troubleshooting.
