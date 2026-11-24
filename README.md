# eProduct – Product Catalogue PoC

Browse, search and enquire about products. A proof of concept built as a foundation to grow, not to throw away.

## Quick start

**You need:** Docker with Compose v2 (Docker Desktop, or Docker Engine + the compose plugin), **or** Podman 4+ with `podman compose`. Ports **8080**, **8025** and **1025** must be free, and the machine needs internet access (the product data comes from the public [Fake Store API](https://fakestoreapi.com)).

```bash
git clone https://github.com/namangarg98/eProduct.git
cd eProduct
docker compose up --build        # Podman: podman compose up --build
```

The first build takes a couple of minutes. It's ready when the log shows `api_listening port=3001`. Then open:

| URL | What |
|---|---|
| http://localhost:8080 | The web app |
| http://localhost:8025 | Mailpit: the local **sales inbox**. Every enquiry email arrives here |

No accounts, API keys, `.env` file or paid services are needed: `docker-compose.yml` already contains all configuration.

To stop: `Ctrl+C`, then `docker compose down`. To also reset the top rated choice to its defaults: `docker compose down -v`.

## Try the acceptance criteria

| Criterion | How to check it |
|---|---|
| Home page shows the 5 chosen products | Open http://localhost:8080: **Top rated** shows 5 products |
| Choose the top rated products | Click **☆** on any product tile to make it top rated (**★**), click again to remove it. At most 5; once 5 are chosen the other stars are disabled |
| Category page | Click a category in the header: **Top rated** (the chosen products in that category) then **More products** |
| Search | Type e.g. `jacket` and click **Search**: only matching products are shown |
| Product page | Click any product tile |
| Enquiry | On a product page click **Enquire**, fill in name and email, click **Send enquiry**. You see a **Thank you** message, and the email appears at http://localhost:8025 |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `error listing credentials ... docker-credential-desktop: executable file not found` | Docker Desktop was uninstalled (or replaced by Podman) but `~/.docker/config.json` still has `"credsStore": "desktop"`. Remove that line (back the file up first), or run with an empty config: `mkdir -p /tmp/dc && ln -sfn ~/.docker/cli-plugins /tmp/dc/cli-plugins && echo '{}' > /tmp/dc/config.json && DOCKER_CONFIG=/tmp/dc docker compose up --build` |
| `port is already allocated` / `address already in use` | Another app uses 8080, 8025 or 1025. Stop it, or change the left-hand port in `docker-compose.yml` (e.g. `"8081:80"`) |
| Pages show **Product service unavailable** | The API can't reach the Fake Store API. Check internet access. Behind a TLS-inspecting corporate proxy (e.g. Zscaler) the API log shows `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`: see below |

**Behind a corporate proxy**, give the API container your proxy's root CA. Create `docker-compose.override.yml` (gitignored; Compose loads it automatically) and point the path at your CA file:

```yaml
services:
  api:
    environment:
      NODE_EXTRA_CA_CERTS: /certs/corporate-ca.pem
    volumes:
      - /path/to/corporate-ca.pem:/certs/corporate-ca.pem:ro
```

On macOS you can export it from the Keychain, e.g. `security find-certificate -c "Zscaler" -p > ~/corporate-ca.pem`.

## Develop (without containers)

Requires **Node 24.15+** (or 22.22+), which the test tooling needs. The API runs TypeScript directly with Node's type stripping, so there is no build step.

```bash
npm install
docker compose up -d mailpit     # just the local SMTP inbox (or: podman compose up -d mailpit)
cp .env.example .env
npm run dev                      # api on :3001, web on http://localhost:5173 (proxies /api to the api)
```

```bash
npm test                         # api (Vitest + supertest) and web (Vitest + Testing Library)
npm run typecheck
```

Behind a corporate proxy, start the dev servers with `NODE_OPTIONS=--use-system-ca npm run dev`.

## Configuration

All variables are documented in [`.env.example`](.env.example). `docker-compose.yml` sets them for the containers; `.env` is only used by `npm run dev`.

| Variable | Purpose |
|---|---|
| `PRODUCTS_API_URL` | Product data source (Fake Store) |
| `DB_PATH` | SQLite file for the top rated choice |
| `SMTP_HOST`, `SMTP_PORT` | Mail server (Mailpit locally) |
| `SALES_INBOX` | Address that receives enquiry emails |
| `MAIL_FROM` | Sender address of enquiry emails |
| `PORT` | API port |

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Client | React + TypeScript (Vite) | Preferred option; quickest way to a shareable PoC |
| Backend | Node.js + TypeScript, Express 5 | One language end to end; Express 5 handles async errors natively |
| Storage | SQLite (`better-sqlite3`) | The only stored data is the 5 chosen products. No database server to run; moves to Postgres/RDS behind the same interface |
| Email | SMTP (nodemailer) → Mailpit | Free and local, with an inbox the reviewer can see; SES later via a new `EmailSender` |
| Tests | Vitest, supertest, Testing Library | One test runner for both apps |

## Architecture

```
browser ──► web (nginx: static files + /api proxy) ──► api (Express) ──► ProductRepository ──► Fake Store API
                                                          ├──► FeaturedRepository ──► SQLite
                                                          └──► EmailSender ──► SMTP (Mailpit)
```

- `api/src/server.ts` is the only file that chooses concrete implementations. Everything else depends on interfaces.
- **Data source:** implement `ProductRepository` (`api/src/products/`).
- **Email provider:** implement `EmailSender` (`api/src/email/`).
- **Look and feel:** design tokens in `web/src/theme.css`.
- The browser only talks to its own origin, so there's no CORS, and Fake Store is never called from the client.

### API

| Method | Path | Returns |
|---|---|---|
| GET | `/api/products/featured` | The chosen top-rated products, in order |
| PUT | `/api/products/featured/:id` | Star a product (appended last) → `{ productIds }`; 409 if 5 already, 404 if unknown |
| DELETE | `/api/products/featured/:id` | Unstar a product → `{ productIds }` |
| GET | `/api/categories` | Category names |
| GET | `/api/categories/:name/products` | `{ topRated, others }`, 404 if unknown |
| GET | `/api/products?search=term` | Products matching title, description or category |
| GET | `/api/products/:id` | One product, 404 if unknown |
| POST | `/api/enquiries` | `{ productId, name, email, phone?, message? }` → 204, emails the sales inbox |

The top rated choice is stored in the `featured_products` table and survives restarts. On the very first start it's seeded from `api/src/db/featured.seed.json`.

## Security basics

- **HTTP:** `helmet` security headers; request bodies capped at 10 kb; `POST /api/enquiries` rate limited to 5 per minute per IP; the API isn't published to the host, only reachable through the web proxy.
- **Input validation (Zod)** at every route: the enquiry body, product id format, and search term (trimmed, 1–100 chars). Unknown fields are dropped.
- **Upstream data isn't trusted:** Fake Store responses are schema-validated, requests time out after 5 s, and failures return 502 rather than crashing.
- **Email:** plain text only (no HTML injection); name and phone must be single-line (no header injection); the product title is looked up on the server, never taken from the client; `Reply-To` is the validated customer email.
- **Database:** every statement is prepared, and the only user input (a validated product ID) is passed as a bound parameter, never built into SQL. The table itself enforces at most 5 rows, ordered, no duplicates (`CHECK`, `PRIMARY KEY`, `UNIQUE`, `STRICT`); changes run in transactions, so two requests can't both add a 6th.
- **No authentication (deliberate):** this is a single-user demo, so anyone using the app can star products. The star endpoints must be restricted to the owner before any public deployment (see [DECISIONS.md](DECISIONS.md)).
- **Errors:** one central handler returns generic messages, with no stack traces or upstream details.
- **Secrets:** nothing secret is committed; Mailpit needs no credentials; config comes from env, documented in `.env.example`.
- **Containers:** the API runs as the non-root `node` user; `npm ci --ignore-scripts` (no dependency install scripts run in the image).

## More

- [DECISIONS.md](DECISIONS.md): assumptions, cuts, how it grows, next steps, time spent
- [AI_USAGE.md](AI_USAGE.md): how AI was used, and where it was wrong
