# contabil
Contabilidade e finanças empresarial e pessoal. (Node.js + React)

## Docker

```bash
cp .env.example .env            # once per checkout (staging values; laptop values commented inside)
docker compose up -d --build    # web (nginx, proxies /api/ to the API) + api + mongo
```

On ctn-srv: `/srv/deploy contabil`. Routing (`contabil.<DOMAIN>`, office IPs only) is declared by the
Traefik labels in `compose.yaml`; the edge lives in `/srv/infra-core`.
