# Plano de Execução Final UI/UX — Alfalyzer (v2 UTF‑8)

Data: 2025-10-02
Baseado em: Análises completas de Claude (Black‑box) + Codex (White‑box)
Modo: Ultrathink — implementação faseada com validação contínua (local + Hetzner)

Notas: O ficheiro FINAL original contém caracteres fora de UTF‑8. Esta versão v2 consolida e corrige instruções, incluindo os ajustes pedidos (hook de auth correto, rota “/find-stocks”, A11y quick wins adicionais e STOP POINT da Fase 2).

---

## Rating Projetado (evolução)

Estado atual: 4.5/10 (bugs P0 em produção)
Após Fase 1: 7.5/10 (plataforma funcional)
Após Fase 2: 8.5/10 (plataforma profissional)
Após Fase 3: 9.5/10 (arquitetura excelente)

---

## Fase 1 — Correção de Bugs P0 (1–2 semanas)

Objetivo: Remover bloqueadores em produção. Deploy imediato após cada fix (com rollback pronto).
Agente responsável: bug-detective-tdd
Modo: Ultrathink com TDD mínimo (quando aplicável) + validação local e produção.

### Bug #1: $NaN nos índices (omnipresente)
Severidade: P0 crítico
Onde: `client/src/components/layout/top-bar.tsx:45`
Root cause: `convertCurrency(...)` é assíncrono mas usado sem await; o valor passa como Promise → `formatCurrency` gera NaN.
Fix:
- Converter via `useEffect` + estado local (Promise.all) com fallback a valores originais em erro.
- Mostrar loading curto ou “—” até conversão.
Aceitação:
- Zero “$NaN” em qualquer página (desktop/mobile).
- Conversão EUR/USD correta; console sem erros.

### Bug #2: /news crash (Error Boundary)
Severidade: P0 crítico
Onde: `client/src/pages/news.tsx:1`
Root cause: uso de `formatDistanceToNow` sem import.
Fix:
- Adicionar `import { formatDistanceToNow } from 'date-fns'` e `import { pt } from 'date-fns/locale'`; usar `locale: pt`.
Aceitação:
- Página /news carrega sem crash; 5+ artigos; timestamps “há X…” em PT.

### Bug #3: Links GDPR 404 (Terms/Privacy)
Severidade: P0 crítico (compliance)
Onde: `client/src/pages/Register.tsx:308`
Fix:
- Substituir `/terms` → `/terms-of-service` e `/privacy` → `/privacy-policy`.
- Auditar o codebase por outras ocorrências.
Aceitação: Zero 404 para termos/privacidade; leitura disponível antes de aceitar.

### Bug #4: Intrinsic Value (IV) sempre N/A
Severidade: P0 crítico (core)
Onde: `client/src/pages/stock-detail.tsx:1`, `client/src/pages/compare.tsx:1`
Root cause: shape de resposta do endpoint pode variar; normalização insuficiente.
Fix:
- Normalizar múltiplos caminhos possíveis (value, intrinsicValue, dcf.value, dcfValue, fairValue) e logar quando nulo (com símbolo e payload).
- Testar endpoint diretamente (curl) e ajustar server-side se necessário.
Aceitação: IV apresentado para símbolos suportados; quando indisponível, mensagem clara com ação.

### Bug #5: Beta Login → /find-stocks (404)
Severidade: P0 (fluxo bloqueado)
Onde: `client/src/components/layout/Header.tsx:44`, `client/src/App.tsx:1`
Fix (duas opções, escolher uma e documentar):
- A) Adicionar alias explícito em `App.tsx`: `/<Route path="/find-stocks" component={FindStocks} />`.
- B) Trocar destino do botão para rota existente canónica (ex.: `/home` ou `/stocks`).
Aceitação: Clicar “Beta Login” leva à listagem de ações sem 404.

### Bug #6: “Phantom toast” de autenticação e contextos a duplicar
Severidade: P0 (confusão de estado)
Onde: `client/src/contexts/supabase-auth-context.tsx:1`, `client/src/contexts/temp-auth.tsx:1`, header/top-bar
Root cause: toasts no evento `SIGNED_IN` sem gating; uso de `temp-auth` em componentes visuais.
Fix (ajustado):
- Substituir TODOS os usos de `@/contexts/temp-auth` por `useSupabaseAuth` de `@/contexts/supabase-auth-context` (o hook correto é `useSupabaseAuth`, não `useAuth`).
- Só depois de substituir e validar, deprecar `temp-auth.tsx` (não remover antes).
- Introduzir flags em supabase-auth-context: `hasShownWelcomeToast` e `isAuthenticating` para evitar toast prematuro; rever handler de `#access_token&type=recovery` em `client/src/App.tsx:310` para fluxos de recovery.
Aceitação:
- Toast de boas‑vindas apenas após login real; não aparece em navegação anónima.
- Não existem imports de `temp-auth` no codebase.
- Sessão estável entre páginas.

#### Execução (geral Fase 1)
Local:
- `npm run dev` e validação manual dos 6 pontos acima.
Produção (Hetzner):
- `npm run deploy` → validar https://128.140.45.28.sslip.io; `pm2 logs alfalyzer --lines 50` sem erros novos.
Rollback pronto: `scripts/rollback/rollback.sh <ref>`.

#### STOP POINT — Fase 1
Reportar no chat (modelo):
- FASE 1 COMPLETA — Bugs P0 corrigidos (listar 6 itens)
- Ambientes validados (Local/Produção)
- Rating atualizado: 4.5/10 → 7.5/10

---

## Fase 2 — Melhorias de Qualidade e Acessibilidade (2–4 semanas)

Objetivo: Tornar a plataforma profissional — A11y AA, copy PT, consistência visual.
Agentes: ui-ux-specialist + frontend-react-specialist

### Quick Win #1: Skip‑link global (WCAG 2.1 AA)
Onde: `client/src/components/layout/main-layout.tsx:1`
Snippet:
- Adicionar `<a href="#main" className="sr-only focus:not-sr-only ...">Saltar para conteúdo principal</a>` antes do header/sidebar e `id="main"` no `<main>`.
Teste: Tab inicial foca skip‑link; Enter move foco para `<main>`.

### Quick Win #2: Normalizar Microcopy PT/EN
Onde: `client/src/pages/stock-detail.tsx:1`, `client/src/pages/find-stocks.tsx:1`.
- “Back to Find Stocks” → “Voltar à pesquisa” (idealmente `<Link href="/stocks">`).
- Placeholder da pesquisa em PT.

### Quick Win #3: ARIA Labels completos
Onde: ícones/botões no header/top‑bar/menus
- Adicionar `aria-label`/`title` em botões só com ícone (tema, menu, logout, user) e `aria-hidden` quando decorativos.
- Garantir `focus-visible` consistente.
Teste: Navegação por teclado + leitor de ecrã anunciam ações corretamente.

### Quick Win #4: i18n fallback PT por omissão
Onde: `client/src/i18n/index.ts:1`
- `fallbackLng: 'pt'`; garantir `public/locales/pt/common.json` básico.

### Quick Win #5: html lang="pt"
Onde: `client/index.html:1`
- `<html lang="pt">`.

### Quick Win #6: Tap targets ≥44px (mobile)
Onde: `client/src/components/layout/top-bar.tsx:68`, `client/src/components/layout/Header.tsx:164`
- Padronizar `className="h-11 w-11 p-0"` em botões de ícone (tema/menu/user), respeitando guidelines iOS.

### Quick Win #7: Contraste nos botões “ghost” em dark
Onde: `client/src/components/layout/Header.tsx:1`, menus relacionados
- Ajustar para `text-foreground hover:bg-secondary/60 border-border/50` ou usar `teya-green` sólido em CTAs críticos.

### Quick Win #8: Menu mobile acessível (focus‑trap)
Onde: `client/src/components/layout/Header.tsx:1`
- Trocar implementação custom por `Sheet`/`Dialog` do shadcn (Radix) com `aria-modal`, focus‑trap, `Esc` para fechar, e foco inicial no primeiro item.
Teste: Teclado e leitor de ecrã conseguem abrir, navegar e fechar o menu sem “fugas” de foco.

### Quick Win #9: Skeleton loaders consistentes
Onde: listagens iniciais (`find-stocks`, componentes de cards)
- Renderizar 12–15 placeholders estáveis (<100ms) e retirar quando `isLoading=false`.
Teste: Sem “saltos” de layout e sem piscar.

### Quick Win #10: aria‑live para preços em tempo real
Onde: `components/stock/realtime-stock-header-v2.tsx`
- Container do preço com `role="status" aria-live="polite" aria-atomic="true"`; respeitar `prefers-reduced-motion`.

#### STOP POINT — Fase 2 (novo)
Checklist mínimo antes de avançar:
- [ ] html lang=pt
- [ ] fallbackLng=pt
- [ ] Skip‑link funcional
- [ ] Tap targets ≥44px
- [ ] Contraste ghost AA em dark
- [ ] aria‑live em preços
- [ ] Microcopy PT padronizada
Reportar no chat com evidências e rating atualizado: 7.5/10 → 8.5/10.

---

## Fase 3 — Refactors Estruturais (2–3 semanas)

Objetivo: Arquitetura de excelência — navegação unificada, breadcrumbs, landing modular e perceived latency.

### Refactor #1: Landing page modular
Onde: `client/src/pages/landing.tsx:1`
- Criar `client/src/components/landing/*` e quebrar em secções (Hero, Demo, Pricing, etc.).
Benefícios: A/B por secção, manutenção, code‑splitting.

### Refactor #2: Config única de rotas + breadcrumbs
Onde: `client/src/config/routes.ts` e `client/src/App.tsx:1`
- Declarar rotas com metadados (title, breadcrumb, requireAuth) e gerar `<Route>`.
- Canonizar `/stocks` como listagem; manter aliases `/home` e `/insights` como redirects.
- Breadcrumbs simples no `<main>`.

### Refactor #3: Prefetch em hover (perceived latency)
Onde: `components/stock/stock-search.tsx`
- `queryClient.prefetchQuery` ao hover de resultados.

### Refactor #4: Design tokens refinados
Onde: `client/src/index.css:1`, `tailwind.config.ts:1`
- Consolidar escala de espaçamentos e tipografia (tokens CSS) e mapear em Tailwind.
- Estados semânticos (success/warn/error/info) e documentação breve.

#### STOP POINT — Fase 3
Reportar no chat: refactors concluídos, sem regressões, rating 8.5/10 → 9.5/10.

---

## Fase 4 — Validação Final e Documentação (1 semana)

Auditorias (reviews):
- Review #1: Conteúdo e microcopy (PT/EN, consistência de CTAs, mensagens de erro/estado)
- Review #2: Testes de regressão nos fluxos principais (pesquisa→detalhe, comparação, IV, transcripts, watchlists)
- Review #3: Acessibilidade final (WCAG 2.1 AA: foco, semântica, contrastes, teclado)
- Review #4: Performance (LCP < 2.5s, CLS < 0.1, Lighthouse > 90)
- Review #5: Documentação — atualizar `CLAUDE.md` (padrões, A11y, performance, deploy/rollback)

STOP POINT — Fase 4
- Report final com métricas, screenshots e checklist 100%.

---

## Workflow e Regras

- Sequencialidade: Fase N+1 só inicia após aprovação da Fase N.
- Stop Points: obrigatório report no chat após cada fase.
- Validação dual: testar local e produção sempre que aplicável.
- Rollback: manter scripts e referências de commit/tag prontos.
- Logs: documentar decisões e alterações relevantes.

Template de Report (após cada fase):

Título: [FASE X] — [Nome] — COMPLETA
- Implementações realizadas (lista)
- Ambientes validados (Local/Produção)
- Testes executados
- Problemas encontrados (se houver)
- Rating atualizado (antes → depois)
- Screenshots/evidências (links/nomes)
- Próximos passos (aguardar autorização para Fase X+1)

---

## Métricas de Sucesso (exemplo)

| Métrica              | Antes | F1  | F2  | F3  |
|----------------------|-------|-----|-----|-----|
| Bugs P0              | 6     | 0   | 0   | 0   |
| WCAG AA              | ~40%  | 40% | 100%| 100%|
| Conversion Rate      | base  | +15%| +25%| +35%|
| User Satisfaction    | 6.0   | 7.5 | 8.5 | 9.2 |
| Lighthouse (perf)    | 65    | 75  | 85  | 92  |

---

## Suporte e Escalação

Durante a implementação:
- Documentar bloqueios e reportar no chat imediatamente.
- Aguardar orientação antes de workarounds com risco.
- Manter rollback pronto e registos de alterações.

---

Autor: Claude + Codex (consolidado)
Última atualização: 2025-10-02
Status: PRONTO PARA EXECUÇÃO (com STOP POINTS por fase)
