Claude e Codex, o tempo está a apertar e como tal precisamos de avançar com o alfalyzer e terminá-lo em 15/20 dias e mais 5 ou 10 dias de testes. Criei este documento com as tarefas que ainda precisamos de fazer para o alfalyzer. O que eu quero que façam é que avaliem o estado atual do alfalyzer (tanto localmente como no servidor do hetzner, podem ler o claude.md para verem como podem aceder ao hetzner). Preciso que leiam este documento na totalidade e vou-vos pedir tanto a um como a outro para criarem um documento cada um de vocês depois de seguirem as instruções e as tarefas que estão descritas neste documento abaixo. Claude, tu vais criar o documento que se vai chamar "ALFALYZER_FINAL_CLAUDE.md". Codex, tu vais criar o documento que se vai chamar "ALFALYZER_FINAL_CODEX.md".


Tarefas por fazer no alfalyzer

1. Ver e definir como calcular o valor intrínseco (introduzir o Alfa Value^tm (é assim que se vai chamar) que vai ser o nosso método único e exclusivo de cálculo de valor intrínseco e inserir mais modelos tradicionais automáticos de cálculo de valor intrínseco, ver doc ALFALYZER_VALOR_INTRINSECO.md)
2. Ver como devemos definir níveis de compra e de venda para os utilizadores, podemos criar um modelo matemático de acordo com as melhores práticas e teorias finaneiras ou então simplificar, quando estiver -X% abaixo do valor intrínseco é um nivel de compra, quando estiver -Z% do valor intrínseco é outro nível de compra e o mesmo ao contrário para os níveis de venda.
3. Corrigir Bug After/Extended Hours. quando os mercados abrem este valor deve desaparecer automaticamente. apenas deve estar quando o mercado fecha e a funcionar devidamente.
4. Corrigir seccção de Compare. Deve ser adequado e personalizado a cada stock/setor. Neste momento está estático ou não funciona como deveria funcionar, entre ações do mesmo setor e personalizadas a cada uma delas (mesmo setor, market cap próximos, e outras métricas que considerem essenciais)
5. Meter a secção de earnings a funcionar com as empresas no calendário e com os logos das empresas. Corrigir também o bug do retângulo de earnings quando abrimos uma stock individual, os retângulos aparecem desatualizados ou estáticos e é necessário estarem atuais e quando chegar ao dia do earnings alterar automaticamente para o próximo dia de earnings. 
6. Introduzir logos das stocks + logo do alfalyzer
7. Introduzir Secção com Insider Traders (FMP API tem isto)
8. Contactar corretoras ao portfólio dos users de forma gratuita e segura (Snaptrade verificar se tem gratuito, que corretoras tem disponíveis e se é exequível para o alfalyzer)
9. Corrigir/introduzir gráficos com as métricas das stocks -> ver como tínhamos antes o UI/UX no netlify (exemplo: https://alfalyzer.netlify.app/stock/AAPL/charts) e colocar a funcionar no alfalyzer devidamente e com os dados corretos e atualizados das empresas.
10. Introduzir AI na análise de portfólios, compare e stocks individuais. Stocks individuais pode ter um chat para o user poder falar com a AI baseado no portfólio especifico do user. Compare igual. Devemos limitar os tokens por cada user para evitar uso excessivo e desnecessário de tokens.
11. Introduzir radar charts para cada stock -> ui.shadnc (site para explorar na totalidade e tirar ideias: https://ui.shadcn.com) exemplo de radar charts para as stocks (https://ui.shadcn.com/charts/radar#charts)
12. Introduzir portfólio como tem o Fiscal AI (fazer web scrapping + playwright?)
13. Introduzir secção de pair trading (que se vai chamar AlfaPair) (fazer web scrapping + playwright do tradinglongshort.com?)
14. Introduzir uma componente de gambling/estímulos de dopamina (doc com ideias ALFALYZER_GAMIGICATION_CHALLENGES.md)
15. Melhorar UI/UX do alfalyzer, animações, cores, etc. torná-lo mais clean, moderno e minimalista
16. Otimizar a cache/chamadas a API quando navegamos nas stocks individuais. tem chamado as APIs cada vez que eu decido voltar a mesma stock no min seguinte, ou seja, faz duas chaamdas a api. supondo que eu decido abrir o cartão da aapl e clico na tab de news as 16:14. se andar para trás e ir novamente para o menu de find stocks e voltar a abrir ocartão da aapl as 16:15 no separador das news volta a fazer uma chamada a API do fmp e nao deveria ser suposto. deveria estar oimtimizado, senão com 1000 users isto vai esgotar-se rapidamente ou até pode ultrapassar as 300 chaamadas a api por min disponiveis no fmp. nao é só nas news que acontecem, noutros campos tambem está a acontecer isto. no fmp aparece que chamou o V3/profile, V3/stocknews, stable/search-symbol, pre-market-quote/MSFT (exemplo, poderia ser outra qualquer), aftermarket-quote, V3/income-statement, V3/key-metrics, V3/stock_market/gainers, stock_market/actives, etc. certamente outro deverão estar a funcionar assim sem a cache funcionar. isto é incomportável
17. Introduzir/testar com utilizadores reais, para já só nós (eu claude e codex) é que temos testado o alfalyzer. mas precisamos de ter a infraestrutura toda pronta a funcionar para os acessos e logins do alfalyzer. pensei em utilizarmos o auth0, contudo preciso que vejam se suporta até 1000 utilizadores de forma gratuita para o alfalzyer ou até quantos utilizadores podemos ter registados de forma free no auth0 (https://auth0.com/pricing). Tambem pensei em utilizarmos o supabase mas necessito que avaliem o alfalyzer e o plano gratuito do supabase para vermos se também é possivel (https://supabase.com/pricing) . comparem os dois e digam-me qual acham melhor.



Questões:

Após leres as tarefas que temos para fazer quero que me faças pedidos/perguntas daquilo que necessitas ou está em falta. Exemplo: o logo do alfalyzer que eu tenho no meu PC ainda não tens acesso a ele para colocarmos a funcionar no projeto, como tal, vais pedir-mo para to entregar de certa forma e eu vou-te entregá-lo de acordo com as tuas intstruções. 



Como implementar:


Definir ordem prioritária destas tarefas (sequência com lógica e ordem prioritária para implementações)
Atribuir fases de acordo com a ordem prioritária e sequência lógica e agentes para trabalhar em paralelo e simultâneo de forma coordenada e em ultrathink
Instalar o mcp firecrawl para facilitar e visualizar websites a part do mcp playwright (esse já o temos) . mcp firecrawl: https://github.com/firecrawl/firecrawl-mcp-server
Cada grupo de agentes deve Ler o claude.md antes da implementação de cada fase, é essencial para perceber o contexto do projeto bem como se deve implementar. (quero implementar aqui localmente, github e principalmente no alfalyzer no servidor do hetzner)
Quando os agentes em paralelo terminarem uma fase parar, informar no chat que acabaram o seu trabalho e dizer-me no chat se podem prosseguir com a verificação do que foi implementado. Após eu dar a ordem o agente responsável pela revisão das implementações revê o trabalho todo e informa-me novamente no chat para eu dar o aval se podemos avançar para a próxima fase ou não. 
Após os agentes terem terminado o seu trabalho numa Fase e o agente de revisão me tiver confirmado através do mcp playwright e da análise do backend e do frontend do alfalyzer que está tudo bem e as implementações foram bem sucedidas, deve-se reportar no documento que o trabalho foi feito, referindo a data e colocar checkmarks do que foi feito. Se tiver sido necessário fazer alguma alteração extra que não estava no plano inicial (que ainda o vais fazer) esse agente deve adicionar uma linha por de baixo da fase original e reportar aquilo que foi adicionado e tambem colocar lá a checkmark.
Cada fase deve ser feita apenas numa única conversa, ou seja, após a fase ter sido implementada, devidamente avaliada e com o sinal de luz verde para avançarmos para a próxima fase, o agente de revisão deve informar-me no chat que já foi tudo feito e que posso dar clean na conversa e começar uma nova.
O documento que vais criar deve ser à prova de multiplas conversas, ou seja, uma vez que tu e o codex têm limites de contexto por cada conversa, o ideal é em cada conversa implementar uma fase, assim vamos ter sempre contexto disponível em cada conversa e vamos evitar alucinações por terem que comprimir as conversas e passarem para as próximas.


Pedido final:

No final de teres tudo o que necessitas da minha parte após leres a lista de tarefas e comparar com o estado atual do alfalyzer localmente e no serivdor do hetzner, vais criar um documento que te disse ao início com as fases todas e tudo o que te mencionei anteriormente.