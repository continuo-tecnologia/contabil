# financeiro (ex-contabil)

DRE, fluxo de caixa e lançamentos da casa. Backend Node.js/Express/MongoDB (`backend/`, intacto) e app React 19 + TypeScript
(`web/`, Vite) sobre o kit `@ctn/base`. Endereço: `financeiro.<DOMAIN>` (só IPs do escritório); `contabil.<DOMAIN>` responde 301
ao mesmo caminho. Finanças pessoais saíram desta peça.

## O que o app mostra

| Caminho | O que é |
|---|---|
| `/?mes=AAAA-MM` | **DRE**: no topo o Resultado Líquido do Exercício (RLE) do mês de competência, o navegador de meses e uma tabela só do demonstrativo. As linhas vêm de `web/src/data/categories.json` (cópia do export `backend/categories.json`, que um teste confere), os totais chegam prontos de `/totals/ym`. Mês ou conta sem lançamento diz a ausência: nunca um zero que pareça dado. |
| `/fluxo-de-caixa?desde=AAAA-MM` | **Fluxo de caixa** desde o mês escolhido (padrão: janeiro do ano corrente): as parcelas das operações pela data em que o dinheiro se move, realizado × a realizar. Não há saldo inicial no sistema: o que se mostra é o movimento do período. |
| (diálogo "Lançar") | **Lançamento** de operação ou de bem, aberto da linha da DRE (a conta já vem escolhida). Fora do menu do dia a dia. |

O fluxo é montado das operações de cada mês (`/operations/ym`), e não de `/cash_flow/s/ym`: este soma as parcelas sem sinal (entrada e
saída como positivas) e não diz a conta, então o sinal não se acha nele. Lê no máximo os últimos 36 meses por vez.

## Comandos

```bash
cd web
npm ci                   # o kit vem de vendor/ (tarball do dist do base-ui; veja vendor/KIT); sem credencial do GitHub
npm run dev              # Vite; /api vai para http://127.0.0.1:3333 (VITE_API_PROXY muda)
npm run build:tudo       # tsc, testes (vitest) e build
```

Atualizar o kit: `frontend/vendor/atualizar-kit.sh` do repositório `infra-delivery-platform` gera o tarball a partir de um commit do `base-ui`.
O mapa da casa (`web/src/data/casa.json`) é uma cópia do `casa.json` do OWP, que é a fonte (o endereço `financeiro` está lá); o app nunca o lê do OWP em tempo de execução.

## Docker

```bash
cp .env.example .env            # once per checkout (staging values; laptop values commented inside)
docker compose up -d --build    # web (nginx, proxies /api/ to the API) + api + mongo
```

On ctn-srv: `/srv/deploy contabil` (the project, containers and the Mongo volume keep the name `contabil` on purpose: the data does not move).
Routing (`financeiro.<DOMAIN>`, office IPs only, and the 301 from `contabil.<DOMAIN>`) is declared by the Traefik labels in `compose.yaml`;
the edge lives in `/srv/infra-core`.

## O que o servidor ainda tem de errado (a API foi mantida como estava)

- `getMonthStartEndDates` termina o mês no penúltimo dia (`new Date(ano, mês, -1)`): a operação com competência no último dia do mês fica fora da DRE desse mês.
- `RFL`, `RNO` e `AED` somam receita e despesa como positivas e a DRE as subtrai inteiras: uma receita financeira reduz o resultado.
- `POST /operations` não trata a validação do Mongoose que falha: a requisição não é respondida (o app dá o prazo de 15 s e diz isso).
