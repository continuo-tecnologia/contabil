# Notas fiscais para a Colinear (financeiro.<domínio>/notas)

A Colinear (contabilidade, externa) lê as notas fiscais **aceitas** dos parceiros em `https://financeiro.<domínio>/notas`, por **usuário e senha**
(basic auth do nginx do financeiro.). O resto do financeiro. continua só por IP do escritório.

> Este documento valia até a virada, feita antes de 2026-10-23. A porta mora agora no repositório `financeiro`, com o mesmo passo a passo em
> [`docs/notas-colinear.md`](https://github.com/continuo-tecnologia/financeiro/blob/main/docs/notas-colinear.md) de lá.

## Como funciona

```
navegador --basic auth--> Traefik (router financeiro-notas, sem ipAllowList) --> nginx do contêiner contabil
                                  nginx: confere usuário/senha, tira Cookie e Authorization do navegador, põe "Authorization: Bearer <token>"
                                  --> POPA (contêiner workforce-manager, rede shared) /interfaces/v1/notas/...   (leitor `financeiro`)
```

- Tela: `/notas` (a mesma SPA, seção "Notas fiscais"). Lê `/notas/api/meses.json`, `/notas/api/<AAAA-MM>.json` e abre `/notas/api/arquivo/<sha256>.pdf`.
- O token do leitor mora só no `.env` do servidor e no ambiente do contêiner; nunca no git nem no JavaScript do navegador.
- O nginx repassa **só esses três caminhos** (regex fechada), só GET/HEAD, com limite de 5 pedidos/s por IP, `Cache-Control: private, no-store`
  e `X-Robots-Tag: noindex`. Qualquer outro caminho sob `/notas/` responde 404 e nunca chega à POPA (Plataforma de Objetivos, Planejamento e Acompanhamento, antes OWP).
- O Traefik abre sem lista de IPs **apenas**: `/notas*`, `/assets/*` (o JavaScript da tela, público e sem dado) e os ícones/marcas estáticos
  (`/favicon.*`, `/apple-touch-icon.png`, `/marca-*.svg`). `/`, `/api/` e as telas de DRE e fluxo continuam só por IP do escritório.
- A rota de máquina da POPA (`/interfaces/`) não restringe origem: quem protege é o token do leitor (sem token, 401). Por isso o contêiner chama a
  POPA pela rede interna `shared` (`workforce-manager`), sem sair pela internet.
- Limite conhecido: a POPA não sabe qual pessoa da Colinear abriu qual nota (há um usuário só). Se for preciso por pessoa, cria-se um usuário por pessoa no
  `notas.htpasswd` (o log do nginx do contêiner registra o usuário) ou, mais tarde, um papel de escritório na POPA.
- Nada em `/srv/infra-core` precisa mudar: os rótulos novos usam o `office-allowlist` só no router principal, que não foi tocado.

## Passo a passo do dono (rode com `!` no Claude Code, ou direto no servidor)

Já executado: em 2026-10-22, `https://financeiro.<domínio>/notas` responde 401 sem senha. Fica como registro e para refazer a porta.

1. **Gerar o token do leitor** (32+ caracteres) e somar à POPA. No servidor (ajuste os caminhos se forem outros):

   ```
   ! TOKEN=$(openssl rand -hex 32); echo "$TOKEN" > /root/.notas-token.tmp; chmod 600 /root/.notas-token.tmp
   ```

   Edite `/srv/objectives-workforce-platform/.env` (o `.env` da POPA; a pasta e o prefixo `WFM_*` estão em troca para `/srv/popa` e `POPA_*`) e **acrescente**
   `financeiro:<token>` ao fim de `WFM_INTERFACE_TOKENS`, separado dos outros por
   vírgula, sem apagar os leitores que já existem (por exemplo `...,financeiro:<token>`). Depois recrie só a API:

   ```
   ! cd /srv/objectives-workforce-platform && docker compose up -d --force-recreate api
   ```

2. **Pôr o mesmo token no `.env` do contabil**: em `/srv/contabil/.env` acrescente a linha `OWP_NOTAS_TOKEN=<o mesmo token>` (o modelo está em
   `.env.example`). Depois apague o arquivo temporário: `! shred -u /root/.notas-token.tmp`.

3. **Criar o usuário e a senha da Colinear** (fora do git; o arquivo fica só no servidor). Pede a senha duas vezes, sem aparecer na tela:

   ```
   ! sudo htpasswd -B -c /srv/contabil/notas.htpasswd colinear
   ! sudo chmod 644 /srv/contabil/notas.htpasswd
   ```

   (`htpasswd` vem do pacote `apache2-utils`. Para mais de um usuário, repita sem o `-c`.) O arquivo precisa existir **antes** do deploy: sem ele o
   Docker recusa subir o serviço `app` (de propósito, em vez de criar uma pasta no lugar do arquivo). Outro caminho: defina `NOTAS_HTPASSWD` no `.env`.

4. **Deploy do contabil** (do jeito de sempre): `! /srv/deploy contabil`.

5. **Testar** (de fora do escritório e de dentro):

   ```
   ! curl -s -o /dev/null -w '%{http_code}\n' https://financeiro.<domínio>/notas            # esperado: 401 (sem senha)
   ! curl -s -u colinear:<senha> https://financeiro.<domínio>/notas/api/meses.json         # esperado: {"meses":[...]} (ou 404 com motivo se não há nota aceita)
   ! curl -s -o /dev/null -w '%{http_code}\n' https://financeiro.<domínio>/                 # de fora do escritório: esperado 403 (o IP continua valendo)
   ! curl -s -o /dev/null -w '%{http_code}\n' -u colinear:<senha> https://financeiro.<domínio>/notas/api/termos/x.json   # esperado: 404
   ```

   Se a tela mostrar erro 502 ou 401 de leitura: o token do `.env` do contabil não é o do `financeiro` em `WFM_INTERFACE_TOKENS`, ou a API da POPA
   não foi recriada. `! docker logs contabil --tail 50` mostra o que o nginx recebeu.

## Girar a senha

```
! sudo htpasswd -B /srv/contabil/notas.htpasswd colinear
```

Como o arquivo entra no contêiner por montagem de arquivo único e o `htpasswd` pode trocá-lo por outro (inode novo), recrie o app para valer: `! cd /srv/contabil && docker compose up -d --force-recreate app`. Entregue a nova senha à Colinear por canal seguro.

## Girar o token do leitor

1. Gere outro (`openssl rand -hex 32`), troque `financeiro:<token>` em `WFM_INTERFACE_TOKENS` da POPA e recrie a API (`docker compose up -d --force-recreate api`).
2. Troque `OWP_NOTAS_TOKEN` no `.env` do contabil e recrie o app: `! cd /srv/contabil && docker compose up -d --force-recreate app`.
   Entre um passo e outro a tela de notas dá erro de leitura (segundos); o resto não é afetado.

## Desligar o acesso da Colinear

Apague `financeiro:<token>` de `WFM_INTERFACE_TOKENS` (recriando a API) e/ou o usuário do `notas.htpasswd`. Para fechar também a porta externa, remova
os três rótulos `financeiro-notas` do `compose.yaml` e faça o deploy.

## Fora do repositório (a fonte da tela é a POPA)

`web/src/data/casa.json` é a cópia do mapa da casa, cuja fonte é `frontend/src/data/casa.json` da POPA. Esta mudança acrescentou à cópia a seção
`notas` (`Notas fiscais`, `/notas`) do endereço `financeiro`; a mesma seção precisa entrar na fonte da POPA, ou a próxima sincronização da cópia a apaga.
