# AI usage

## Tools

- **Claude Code** (CLI), model Claude Opus 5.5, for planning, code, tests and docs.
- Checked every file for both UI and backend, ran the app against each acceptance criterion.
- Agent instructions: [CLAUDE.md](CLAUDE.md)

## Plan

I asked Claude to analyse the brief, then iterated on the plan three times before any code was written. The final plan, in short:
- React + Express; SQLite for the 5 chosen products; Mailpit; Docker Compose.
- `ProductRepository` and `EmailSender` interfaces, chosen in a single composition root.
- Unit, API and component tests only.

## Key prompts and moments

1. Claude identified the requirement, "data source, look and feel and email provider are all expected to change", which became the three swap points in the design.
2. **"For the top 5, what is the best way to store them: in the DB or client side?"** This led to the table design where SQLite enforces the rules itself: `position` 1–5 as the primary key, `UNIQUE product_id`, IDs only.
3. **"Top rated for a category should come from the 5 we have chosen, right?"** I fixed this reading of the criteria; Claude added the edge case (some categories have none, so the section is hidden).
4. **"Is TypeORM suitable or is Express enough?" and "the architecture should not be complex, with no unused files."** These made Claude re-examine its own plan. It explained the real choice was ORM vs. plain driver, and dropped TypeORM, a shared-types package, a health endpoint, CORS config and a honeypot.
5. **"Can't we give a star option on each product tile, max 5?" then "this is a demo with one user, we don't need an admin token."** How the owner chooses the top 5 went through three designs:
   - Claude proposed an `/admin` page with checkboxes and an admin token.
   - Then a token-protected "owner mode" with stars on the tiles.
   - I pointed out the PDF describes a single-user demo with no login requirement, so the final design is a star on every tile, no auth, with the limit of 5 enforced by the API and the database.
   - The missing auth is recorded as a deliberate assumption, and the first "next" item before any public deployment.

## Where the AI was wrong, and how I caught it

- **Over-engineering.** The first plan had TypeORM, enquiry persistence, a shared package, a health check, CORS and spam protection. I questioned each one and cut them. Later, it proposed an admin page and token to choose the top 5, which a single-user demo doesn't need. These are tracked in DECISIONS.md.
- **Tile images covering the text.** After the visual redesign, I saw in the browser that tall product images overflowed their frame and hid the title and price. Claude's CSS limited the image height to its container's, but the container had no fixed height in the card layout. Fixed with a fixed-size frame, `overflow: hidden` and `object-fit: contain`.
- **Top rated choice coming back after a restart.** When adding the stars, the database was seeded "whenever empty", so unstarring all 5 and restarting would restore the seed. Caught while reviewing the change; seeding now happens once per database (SQLite `user_version`), and a test covers it.
- **Site broken after restarting the API container.** nginx resolved the API's address once at startup, so after an API restart it returned 502s. Caught by a restart check; nginx now re-resolves the address.
- **Debounce vs. the criteria.** Claude proposed search-as-you-type with debounce. I pointed out the criteria say "when I click the search button", so it was removed.
- **Docker vs. Podman.** Claude assumed Docker. I use Podman, and the build failed in two ways it had to work through:
  - TLS errors from the corporate proxy, fixed with a local, gitignored compose override that mounts the CA.
  - A native-module rebuild that needed Python, fixed by using `better-sqlite3`'s bundled prebuilt binaries with `--ignore-scripts`.
  - Its first Dockerfile comment ("prebuilt binaries are downloaded") was wrong; the binaries ship inside the package.
- **Fake Store's 404s.** The plan assumed a 404 for unknown products. A quick `curl` showed Fake Store returns **200 with an empty body**. That's why the repository fetches the whole (validated) catalogue and looks products up itself, rather than trusting single-product responses.
- **Small code issues caught in review:**
  - A test fake used a TypeScript parameter property, which Node's type stripping can't run; caught by `tsc`.
  - A test had a redundant ternary.
  - `npm install` once silently didn't save the web runtime dependencies; caught by failing type checks.
