# ALFALYZER_FINAL_CODEX.md

Data: 2025-10-12
Responsável: Codex (este documento é o guia operativo “à prova de múltiplas conversas”)

---

## 1) Estado Atual (Hetzner + Local) — Resumo

- Produção funcional em https://128.140.45.28.sslip.io (95% pronto). Stack: React 18 + Vite + Tailwind/shadcn; Backend Node/Express TS; Redis; Supabase Auth/Profiles; Nginx; PM2. Ver CLAUDE.md.
- Cache Redis com TTLs diferenciados (quotes=60s, históricos=2h, fundamentals=1h, profile=24h). Budget e pacing configuráveis por ENV.
- Worker de Transcripts reativado (event-driven por earnings calendar), uso de API reduzido 99.997% (9 calls/ciclo vs >10k antes).
- Regras de deploy seguras via npm scripts (evitar rsync --delete cruzando diretórios). Monitorização com scripts dedicados.

---

## 1.1) Avaliação de Produção (Hetzner) — 2025-10-12

- PM2/processos: `alfalyzer` (uptime ~5 dias), `price-worker` (online), `transcripts-worker` (online). Sem erros críticos.
- Health API: 200 OK, Redis e DB OK, providers FMP/Finnhub OK.
- Cache Redis: hit rate ~94%; `cacheSize` ~1094; TTL `quotes`=60s; latência cache endpoint ~175ms; memória Redis ~5.9MB usada pelos quotes.
- SLOs (monitor-all):
  - P95 latência: 227–271ms (> alvo 200ms) — acompanhamento necessário.
  - Erros 5xx: 0.00% (OK)
  - Cache hit: 94% (OK)
  - Uptime (rolling): 100% (OK)
- Price Worker: aquecimento em batches eficiente (~200 símbolos por ciclo com ~4 chamadas FMP, ciclo ~942ms); muitos `Redis SET quote:*` com TTL 600s para conjuntos quentes.
- Transcripts Worker: modo event-driven ativo; ~25 eventos/ciclo; ~0.73MB por ciclo; limitado a 100 calls/ciclo (OK); sem backfill.
- Extended Hours: endpoint devolve 304/Redis HIT quando fresco; `isExtendedHours/currentSession` corretos com TTL curto.
- Configuração: `.env.production` presente e preenchido; logs mostram “API key check explicitly disabled via SKIP_API_KEY_CHECK” — rever política em produção (sem alteração agora).
- Deploy: `dist/server/index.cjs` com timestamp atual (12-10); `dist/public` íntegro.

Observações operacionais (sem implementar):
- Manter monitor-all ativo para trend do P95 nas próximas 24–48h.
- Confirmar uso justificado de `SKIP_API_KEY_CHECK` em produção (endpoints sensíveis já validam API key por defense-in-depth).
- O batch de market data requer `MARKET_DATA_API_KEY` no ambiente de monitorização (401 esperado nos logs de cron quando não definido).

---

## 2) Avaliação por Tarefa (ALFALYZER_TAREFAS.md)

1. AlfaValue™ (valor intrínseco) — Em falta no código produtivo. Documento técnico detalhado pronto (ALFALYZER_VALOR_INTRINSECO.md). Prioridade ALTA (Fase 1). Backend: endpoints `/iv/:ticker/main`, `/rf`, `/mrp`, `/gterm`; Frontend: header na página da ação.
2. Níveis de compra/venda — Não implementados. Sugerido: thresholds configuráveis vs IV (p.ex. ≥15% desconto = Buy, ≥30% Strong Buy; simétrico para vendas). Expor no header e em Compare. (Fase 2/3)
3. Bug After/Extended Hours — Backend já fornece `isExtendedHours/currentSession` e TTL dinâmico; frontend mostra bloco só quando `isExtendedHours` (deve desaparecer em abertura). Confirmar em produção; ajustar janela UTC se necessário. (Fase 1 verificação)
4. Compare personalizado — Página existe mas sem peers inteligentes. Implementar seleção automática (mesmo setor/industry, market cap próximo, métricas-chave) e UI dinâmica. (Fase 3)
5. Earnings (calendário + logos) — Página existe com mock/serviço local; integrar `server/routes/earnings-calendar.ts`, ligar ao worker/eventos e atualizar cartões + “próximo earnings”. (Fase 3)
6. Logos das stocks + logo Alfalyzer — Hook de logos existe (Clearbit/fallback). Integrar nos cartões; falta logo oficial do Alfalyzer (asset). (Fase 2)
7. Insider Traders (FMP) — Não implementado. Criar rota backend (FMP v4 insider-trading) e página. (Fase 4)
8. Integração com corretoras (SnapTrade) — Não implementado. Avaliar viabilidade/gratuito e cobertura. (Fase 6)
9. Gráficos métricas — Já existem (StockFinancialsChart) via cache; validar dados corretos/atualizados e harmonizar chamadas. (Fase 3)
10. AI na análise (portfólios/compare/stock) — Há pipeline AI para transcripts; chat no contexto de portfólio ainda não. Desenhar limites de tokens por user. (Fase 5)
11. Radar charts — Não implementado. Adicionar componente (shadcn charts/radar) por ação. (Fase 5)
12. Portfólio tipo Fiscal AI (scraping+playwright) — Não implementado. Explorar fallback MVP. (Fase 6+)
13. Pair Trading (AlfaPair) — Não implementado. Avaliar fonte (p.ex. tradinglongshort.com scraping) e métricas. (Fase 6+)
14. Gamification/Dopamina — Documento existe (ALFALYZER_GAMIFICATION_CHALLENGES.md). MVP diário de predictions. (Fase 7)
15. UI/UX — Ongoing: polir animações, cores, consistência. (Fase 7)
16. Otimização cache/chamadas — Backend robusto; no frontend alguns hooks ainda refazem fetches ao navegar (staleTime/refetchOnFocus/duplicações de endpoints). Unificar via rotas cache-first e tuning do React Query. (Fase 2)
17. Testes com utilizadores + Auth — Supabase já integrado. Comparar Auth0 vs Supabase para 1k utilizadores (preferência manter Supabase para rapidez/custos; confirmar limites/quotas). (Fase 2 decisão)

---

## 3) Plano por Fases (15–20 dias + 5–10 testes)

Fase 1 (Dias 1–3): AlfaValue™ (MAIN)
- Backend: `valuation-service`, `valuation-controller`, rotas `/iv/:ticker/main`, `/rf`, `/mrp`, `/gterm`; Redis keys (`iv:*`, `mrp:*`, `rf:*`). Jobs: diário/mensal.
- Frontend: `AlfaValueHeader.tsx` no topo de `/stock/:symbol` com IV, status, discount%.
- Verificar Extended Hours no servidor (desaparecer na abertura). Ajustar se necessário.
- Critérios: endpoints estáveis, clamps aplicados, header visível, logs de inputs/assumptions.

Fase 2 (Dias 3–5): Cache & Autenticação
- Frontend: reduzir chamadas duplicadas (unificar para `/api/cache/*`), ajustar `staleTime`, `gcTime` e `refetchOnWindowFocus=false` em endpoints pesados, prefetch inteligente ao navegar.
- Decisão Auth: manter Supabase para piloto (1k users), documento de trade-offs vs Auth0. Limites e custos a confirmar.
- Logos: integrar hook nos cartões/earnings; receber asset do logotipo Alfalyzer.

Fase 3 (Dias 5–8): Compare + Earnings
- Compare: peers automáticos (industry, cap, métricas), UI responsiva, export CSV/PDF mantém.
- Earnings: calendário real (com logos), atualização automática de “next earnings” em stocks individuais.

Fase 4 (Dias 8–10): Insider Trading
- Rota backend (FMP v4), UI de Insider Trades por símbolo (tabela + filtros), cache.

Fase 5 (Dias 10–13): AI & Radar
- Chat de análise por portfólio/compare com limites de tokens por user.
- Radar charts por ação (set de métricas normalizado).

Fase 6 (Dias 13–15): Portfólio/SnapTrade/AlfaPair (MVP)
- Avaliar SnapTrade (gratuito/corretoras). Desenhar MVP portfólio conectado.
- AlfaPair: estudo de viabilidade e protótipo simples.

Fase 7 (Dias 15–20): UI/UX + Gamification + Observabilidade
- Polimento UI/UX, gamification diária, SLO dashboards, E2E (Playwright) e tuning final.

Janela Testes (5–10 dias):
- Playwright MCP para regressão; validações de performance; verificação manual guiada; hardening de segurança/RLS.

---

## 4) Fluxo de Trabalho por Fase (Single-conversation)

1) Cada fase começa com leitura de `CLAUDE.md` e alinhamento técnico.
2) Implementação paralela coordenada (Codex/Claude) conforme escopo da fase.
3) STOP → Reportar no chat que a fase terminou e pedir luz verde para verificação.
4) Agente de revisão valida (Playwright MCP + análise backend/frontend). Se ok → checkmarks + data no documento.
5) Se houve alterações extra fora do plano, adicionar linha sob a fase e marcar com checkmark.
6) Encerrar conversa e abrir nova para próxima fase (evitar limites de contexto).

---

## 5) Dependências e Pedidos ao António

- Enviar ficheiro do logotipo Alfalyzer (ideal: SVG + PNG) e guidelines de uso.
- Confirmar chaves/limites: FMP (prod), tokens/quotas pretendidos por minuto/dia; policy para budgets.
- Preferência Auth: confirmar se seguimos com Supabase para o piloto (1k utilizadores) vs avaliar Auth0 (quero confirmar limites atuais com preços).
- Confirmar critérios de peers em Compare (industry precisa de granularidade? adicionar filtro por país/currency?).
- SnapTrade: se houver credenciais/parceria a explorar; caso contrário, manter apenas avaliação.
- Aprovar instalação do MCP firecrawl (para scraping/documentação assistida) além do MCP playwright (já presente).

---

## 6) Verificação Remota (Hetzner) — Proposta de Checks

Comandos (não destrutivos):
- pm2/processos e saúde:
  - `ssh root@128.140.45.28 "cd '/home/teste 1' && pm2 status && pm2 logs alfalyzer --lines 50 | tail -n 50"`
- Health endpoints:
  - `ssh root@128.140.45.28 "curl -s localhost:3001/api/health"`
  - `curl -s https://128.140.45.28.sslip.io/api/health`
- Monitorização:
  - `ssh root@128.140.45.28 "tail -40 /var/log/alfalyzer/monitoring/cron.log"`
  - `ssh root@128.140.45.28 "cd '/home/teste 1' && TARGET_URL=https://128.140.45.28.sslip.io scripts/monitoring/monitor-all.sh"`

Objetivo: confirmar cache hit‑rate, latências, budget atual, e comportamento de Extended Hours em produção.

---

## 7) Critérios de Aceitação por Fase (resumo)

- Fase 1: Endpoints IV estáveis (clamps, logs), header visível e coerente; verificação Extended Hours ok.
- Fase 2: Redução de chamadas duplicadas (>50% vs baseline), UX inalterada, Supabase Auth alinhado; logos integrados.
- Fase 3: Compare com peers automáticos e Earnings calendar com logos + “next earnings” correto.
- Fase 4: Insider Trading página + cache; FMP 200 OK e quotas sob controlo.
- Fase 5: Chat IA por portfólio com limites, radar charts estáveis.
- Fase 6: Relatório SnapTrade/AlfaPair e MVP(s) conforme viabilidade.
- Fase 7: SLOs, Playwright verde, UI/UX polida, gamificação ativa.

---

## 8.1) Conclusões Cruzadas (Produção vs Tarefas) — 2025-10-12

- Infraestrutura e caching em produção suportam bem a Fase 1 (AlfaValue™) sem risco de quotas (Redis sólido, workers estáveis).
- O bloco de Extended Hours está coerente no backend; a validação no frontend deverá confirmar o desaparecimento automático na abertura (ajuste apenas se surgirem reports contrários durante sessão regular).
- A subida de P95 acima do alvo sugere oportunidades na Fase 2 (redução de refetches/duplicações no frontend e prefetch inteligente), sem necessidade de mexer no backend.
- Elementos ausentes do produto atual (Insider Trades, peers dinâmicos no Compare, radar charts) seguem como fases posteriores sem impacto na estabilidade.

Estado Fase 0 (avaliação de produção): CONCLUÍDA em 2025-10-12.

---

## 8) Notas Técnicas (pontos de atenção)

- Deploy: usar apenas `npm run deploy:*` conforme CLAUDE.md (evitar rsync destrutivo).
- Cache: preferir rotas `/api/cache/*` no frontend; alinhar `staleTime`, `gcTime` e `refetchOnWindowFocus` para não refazer chamadas desnecessárias.
- Segurança: manter RLS Supabase ativo; não expor segredos `VITE_` no frontend; defense‑in‑depth de API Key nos endpoints sensíveis.

---

Este documento será atualizado no fim de cada fase com checkmarks, data e alterações extra (se existirem).


---

## 9) Auth – Matriz Comparativa (Auth0 vs Supabase)

Escopo desta comparação: ~1.000 utilizadores no piloto, custo mínimo, integração rápida, segurança adequada (RLS/isolamento), e caminho de escala.

Critérios: custo inicial, esforço de integração, segurança/RLS, UX de login, escalabilidade, risco de lock‑in.

Auth0 (Okta CIC)
- Pontos fortes: plataforma enterprise, OAuth/social providers “turnkey”, MFA/SSO/B2B maduros, deteção de anomalias.
- Pontos fracos: complexidade e custo sobem cedo (SSO, MFA, custom domain e RBAC avançado tendem a estar em planos pagos); risco de lock‑in; configuração de claims/roles para alinhar com RLS do Postgres.
- Integração: SDK no frontend + callbacks; validação JWT no backend; RBAC no Auth0; para RLS no Supabase exige mapear claims → policies.
- Adequação (piloto ~1k): viável com plano básico; confirmar limites/MAU e custo real para features necessárias (SSO/MFA). Verificar preços atuais: https://auth0.com/pricing

Supabase Auth
- Pontos fortes: Auth nativo com Postgres e RLS; social providers e magic link; integração direta com perfis; menor sobrecarga operacional; custos previsíveis; latência reduzida (co‑localizado com DB); open‑source (migração viável).
- Pontos fracos: SSO B2B mais limitado; MFA/Passkeys suportados mas a maturidade pode variar por caso; limites do plano gratuito variam — confirmar quotas atuais: https://supabase.com/pricing
- Integração: já existente no projeto; RLS ativo em tabelas sensíveis; menos moving parts.
- Adequação (piloto ~1k): muito forte (baixo custo/rápida execução) sem sacrificar RLS.

Segurança/Compliance
- GDPR e residência de dados: ambos suportam regiões UE; escolher região consistente com DB (Supabase EU, Auth0 EU tenant) para reduzir latência e facilitar compliance.
- Tokens/Claims: alinhar claims (roles/user_id) com políticas RLS no Postgres.

Operação e Risco
- Auth0: gestão separada (dashboards/tenants), forte para SSO B2B e requisitos enterprise; cuidado com lock‑in e custos incrementais.
- Supabase: unifica auth+DB; simplifica operação e RLS; atenção a limites de free tier e plano pro quando escalar.

Recomendação (piloto ~1k utilizadores)
- Manter Supabase (já integrado, RLS ativo, menor custo e menor esforço). Reavaliar Auth0 apenas se surgir necessidade clara de SSO B2B/enterprise ou requisitos específicos de MFA/políticas corporativas.

Checklist de decisão
- Precisa SSO B2B e integração enterprise (SAML/OIDC multi‑org)? → inclina para Auth0.
- Prioridade máxima é RLS nativa e custo mínimo/rapidez? → Supabase.
- MFA obrigatória/Passkeys? → ambos suportam; confirmar custos/limites do plano pretendido.
- SLA/Soporte enterprise imediato? → Auth0 (ou Supabase Pro/Enterprise conforme orçamento).
