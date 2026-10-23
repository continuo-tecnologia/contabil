# CLAUDE.md

Este arquivo orienta o Claude Code neste repositório. O README diz o que a peça mostra e como rodá-la.

## Visão geral

> **Descontinuado.** O app é o repositório [`financeiro`](https://github.com/continuo-tecnologia/financeiro); este repositório será arquivado
> depois da carga do Mongo no `financeiro` e da virada (`docs/virada.md` de lá). Mudança nova vai ao `financeiro`, não aqui.
>
> A virada já foi feita: em 2026-10-23, de fora, `financeiro.<DOMAIN>` responde pelo repositório `financeiro` (`/api/eu` 401, `/` 302 ao
> login). **Não rode `/srv/deploy contabil`**: ele subiria de novo o `app` daqui, com routers no mesmo host que os do `financeiro`.

"contabil", que hoje serve `financeiro.<domínio>` até a virada: a DRE (Demonstrativo de Resultado do Exercício), o fluxo de caixa e os lançamentos. Termos, rótulos e mensagens são
pt-BR. Backend Express + Mongoose em `backend/` (não mudou); app React 19 + TypeScript + Vite em `web/`, sobre o kit `@ctn/base` (peças de `@ctn/base/casa`).

## Regras

- **Sem dado fictício na tela.** Mês ou conta sem lançamento diz a ausência (`Absence`); os totais calculados que o servidor devolve em zero sem lançamento não são dado (`valorDaLinha`). Dado sintético só em teste.
- **Uma fonte para a árvore de contas**: `backend/categories.json` (export do Mongo) → `web/src/data/categories.json` (cópia, que `categorias.test.ts` confere) → `web/src/lib/dre.ts` (ordem do demonstrativo, as linhas calculadas e as depreciações, que o export não traz). A tela não repete a árvore: é uma tabela só dirigida por esses dados. Mudou conta? Mude o export, a cópia e `dre.ts` (e `getTotalsByYearMonth.js`, que soma por prefixo e deriva as calculadas).
- **Competência × caixa**: `competence_date` é quando a DRE reconhece; `cash_flow[].date` é quando o dinheiro se move. O fluxo de caixa vem das operações (`lib/fluxo.ts`), pelo sinal da conta; `/cash_flow/s/ym` soma sem sinal e o mês dele vai de 0 a 11.
- O mês de `/totals/ym` e `/operations/ym` vai de 1 a 12.
- O mapa da casa (`web/src/data/casa.json`) é cópia do `casa.json` da POPA (Plataforma de Objetivos, Planejamento e Acompanhamento; antes OWP, em troca para `popa`; a fonte). O kit entra pelo tarball `web/vendor/` (o build da imagem não tem credencial do GitHub).
- Os nomes do compose (projeto, contêineres, imagem, volume `contabil-mongo-data`) seguem `contabil` de propósito: o volume do Mongo guarda os dados.

## Comandos

`cd web && npm ci && npm run build:tudo` (tsc, vitest, build). `docker compose up -d --build` na raiz (precisa de `DOMAIN` no `.env`; `CTN_PLATFORM_DIR` é opcional, só o `compose.yaml` o lê, com padrão
`../infra-core`).
