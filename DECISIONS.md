# Decisions

## Assumptions

| Gap in the criteria | Assumption |
|---|---|
| "I have chosen 5 products to be top rated" | The owner curates them; they aren't derived from Fake Store's `rating`. They choose by clicking a star on any product tile: **up to 5**, shown in the order starred. Stored in the DB (IDs only), seeded once on first start. |
| Who can star products | The PoC has a **single user** (the entrepreneur demoing it), so starring is open, with no login. Customer and owner roles are a later concern (see "Next"). |
| Reordering top rated products | The order is the order they were starred; to reorder, unstar and star again. Drag-and-drop would need a new library. |
| Zero top rated products | Allowed (unstarring all). The home page then explains how to choose some, instead of showing an empty grid. |
| Top rated for a category | The chosen products that belong to that category, in chosen order, so ≤ 5. With 4 categories and 5 picks some categories have none; the section is then hidden rather than falling back to `rating.rate`. |
| Additional products in a category | All other products in the category, never repeating a top-rated one. |
| Search | Runs on button click or Enter only (as the criteria say), no search-as-you-type. Case-insensitive substring match on title, description and category. Results live at `/search?q=` so they can be shared. |
| Enquiry | One product per enquiry. Name and email required; phone and message optional. The sales inbox is config (`SALES_INBOX`). |
| A featured product disappears from the source | Skipped with a warning log, never an error page. |
| Fake Store's 20 products | Small enough to fetch once and cache for 5 minutes; every query runs against the cache. |

## Dropped or simplified

- **TypeORM:** I first planned it, then dropped it. One 5-row table and one `SELECT` don't justify entities, decorators and data-source config. `better-sqlite3` behind a `FeaturedRepository` interface is easier to read and to swap.
- **Storing enquiries:** email is the requirement. Saving leads (so none are lost if SMTP is down) is on the "next" list.
- **Debounced search:** the criteria say "when I click the search button".
- **Admin screen and admin token:** first planned (a separate page, then a token-protected "owner mode"), then dropped. For a single-user demo they added a login step and config without changing what the demo shows. A star on every tile is the simplest way to choose.
- **Spam protection, CORS, health endpoint, auth, cart, pagination, i18n:** out of scope for the PoC. There's no CORS because the browser only ever uses one origin.
- **End-to-end tests:** unit, API and component tests cover the critical path; Playwright is a "next" item.
- **Visual design:** a clean, generic look on purpose, because creative work is in progress. All styling flows from the tokens in `theme.css`.

## How it grows

- **New data source:** implement `ProductRepository` and change one line in `server.ts`. Routes, services and the web client don't change. Product IDs are strings, so they aren't tied to Fake Store's numbers.
- **New email provider (e.g. SES):** implement `EmailSender`.
- **New look and feel:** replace the tokens in `theme.css`; components only use classes built on those tokens.
- **Real database:** `FeaturedRepository` is an interface. Postgres/RDS replaces one file.
- **Owner-only starring:** add auth middleware to the two star routes; the UI shows stars only to the owner. Nothing else changes.
- **Mobile client:** all business logic (featured, category split, search) is in the API, so a mobile app reuses it.
- **AWS:** the containers map to ECS/Fargate behind an ALB, or the web build to S3 + CloudFront, with Mailpit → SES and SQLite → RDS.

## Next, with another day

1. **Before any public deployment:** restrict starring to the owner (login, e.g. AWS Cognito), so customers can't change the home page.
2. Store enquiries before emailing (and retry sending), so a lead is never lost.
3. Playwright tests for the five acceptance criteria against `docker compose up`.
4. Search in the data source (or a search engine) once the catalogue is bigger than an in-memory list.
5. CI: typecheck, test and `npm audit` on every PR; structured logging (pino) with request IDs.

## Time spent

About 2 h 30 m in total, within the 2–3 hour time-box:

| Phase | Time |
|---|---|
| Design approach (reading the brief, iterating on the plan with the AI) | 30 m |
| Development (API, web, Docker, with tests written alongside the code) | 1 h 30 m |
| Reviewing, testing and docs (manual checks against Fake Store and Mailpit, README, DECISIONS, AI_USAGE) | 30 m |