# yuchu-essay-admin

Operations admin panel for **予初作文 (Yuchu Essay)** — a content platform for Chinese
primary-school writing classes. Built as a mid-size React SPA: 12 feature domains,
7,271 lines of TypeScript, a full type and lint gate, and 19 tests.

**React 19 · Vite 8 · TypeScript 6 · TanStack Query 5 · Zustand 5 · Zod 4 · Ant Design 6**

**Live:** https://admin.vunbo.com (account `admin` / `admin123`)

Sibling repositories:

| Repo | What | Stack |
|---|---|---|
| [`yuchu-essay-api`](https://github.com/VunboYao/yuchu-essay-api) | The backend this panel talks to | Go · Gin · GORM |
| [`yuchu-essay-web`](https://github.com/VunboYao/yuchu-essay-web) | Public content website | Nuxt 4 |

> **Documentation note:** everything under [`docs/`](./docs/) is written in Chinese. It is
> the project's working record — engineering contract, per-step build logs, acceptance
> notes, and retrospective Q&A. The English version below covers the architecture and the
> decisions; `docs/` is where the reasoning lives in full.

---

## What it is

An editor and operations team use this panel to manage everything the mini program and the
website serve: article topics, writing samples, downloadable materials, textbook taxonomy,
tags, home-page blocks, ad slots, official-account routing, user feedback, and audit logs.

12 feature domains:

```
auth  dashboard  article  essay  download  taxonomy  tag
home-block  ad-slot  official-account  feedback  operation-log
```

---

## Stack

| | |
|---|---|
| Framework | React 19 |
| Build | Vite 8 |
| Language | TypeScript 6 — `strict` + `noUncheckedIndexedAccess` |
| Routing | React Router 8 (data router, lazy routes) |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 (`persist`) — **session only** |
| Forms | React Hook Form 7 + Zod 4, with Ant Design components via `Controller` |
| UI | Ant Design 6 |
| Rich text | TipTap 3 |
| Drag & drop | dnd-kit |
| Uploads | `ali-oss` — browser-to-OSS direct upload with STS credentials |
| Lint | Oxlint |
| Tests | Vitest 4 + Testing Library + jsdom |

---

## Layout

```text
src/
  app/        # shell only — providers, router, layout, theme. No business code.
  shared/     # http client, QueryClient defaults, env parsing, OSS upload, UI primitives
  features/   # one directory per route domain
```

A write-capable feature has a fixed four-file shape:

| File | Responsibility |
|---|---|
| `api.ts` | paths, query-param cleanup, response types |
| `queries.ts` | a `queryKeys` factory + `queryOptions()` |
| `schemas.ts` | Zod — the single source of truth for what may be submitted |
| `pages/`, `components/` | pages and forms owned by this domain only |

**Cross-domain rule:** a feature may import another feature's `queries` and write
functions, but never its pages or form components. After a successful write it calls
`invalidateQueries` on the other domain's key prefix — it does not copy the other domain's
list into its own state.

---

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:5174
```

`vite.config.ts` proxies `/admin/api` to `http://localhost:8080`, so start the backend
first. `.env.development` and `.env.production` are committed and only contain the API
base path.

```bash
pnpm dev          # dev server on 5174
pnpm build        # tsc -b && vite build
pnpm verify       # lint + type-check + test — the quality gate
pnpm test         # vitest run
```

---

## Testing

```bash
pnpm test         # 19 tests, 3 files, no network and no backend needed
```

The suite deliberately does not chase coverage. It covers the branches that are easy to
get wrong and expensive to get wrong:

| File | Tests | Covers |
|---|---|---|
| `test/auth-gate.test.tsx` | 8 | Every redirect branch: unauthenticated → login with return path, already-authenticated on `/login`, protocol-relative `//evil.com` rejected, `redirect` pointing back at `/login`, deliberate logout must *not* carry a redirect, and no redirect at all under qiankun |
| `test/http.test.ts` | 8 | The response envelope's four branches, `Authorization` injection, and 401 handling — including the exception that a 401 from the login endpoint must **not** clear the session |
| `test/query-keys.test.ts` | 3 | `tagKeys` factory output, and that `lists()` is a prefix of any single-page key — the property that makes one `invalidateQueries` call correct |

**With no test framework mocking the module:** `http.test.ts` replaces
`axios.defaults.adapter` and then *dynamically imports* the HTTP module. Order matters — the
axios instance is created at import time and merges `axios.defaults` then, so importing
first means the fake adapter is never used and the test silently hits the real network.

The suite was validated by mutation, not by the colour green: breaking
`isLoginRequest()` to always return `false` turns exactly the two login-401 tests red and
leaves the other 17 green.

The known gap is stated plainly: **Zod schemas are not covered yet.**

---

## Decisions worth explaining

### State ownership: three places, no overlap

| Data | Where | Why not elsewhere |
|---|---|---|
| Server data — lists, details, metrics | TanStack Query | No `useEffect` copies a response into `useState`; no list lives in Zustand |
| Session — token, admin identity | Zustand with `persist` | The Axios interceptor is not inside the component tree, so it reads `useAuthStore.getState()`; a hook would not work there |
| Dialog flags, the row being edited, filter drafts | component state | Not worth a store |
| Derived values — e.g. dashboard metrics | computed during render | Never synced into a second piece of state |

`persist` uses `partialize` to keep only the token and identity. The rest — including a
one-shot navigation flag — must not survive a refresh.

Two defaults matter more than they look: `staleTime: 30_000` is a *freshness window*, not a
cache lifetime, and `refetchOnWindowFocus` is off because admins switch windows constantly
and the default makes every table flash.

### The HTTP layer throws; it never shows UI

The backend wraps everything in `{ code, message, data }`. One `unpack` function either
returns the data or throws a typed `ApiError` carrying the message, the HTTP status, and the
business `code`. The response interceptor does **not** toast and does **not** navigate —
those decisions belong to the page's `catch`.

The one subtle rule: on HTTP 401 the interceptor clears the session, **unless the failing
request was `/auth/login`**. A 401 from the login endpoint means a wrong password, not an
expired token; clearing the session there would also wipe the `?redirect=` parameter in the
URL, and the user would never get back to the page they came from.

### Authorization is a component, not a route guard

There is no `beforeEach`. `AuthGate` reads the token from the store and returns a
`<Navigate>`. If you are authenticated but sitting on `/login`, it sends you to the redirect
target; if you are not, it sends you to `/login?redirect=…`.

The redirect value is validated against open redirects: it must start with a single `/`, it
cannot be protocol-relative (`//host`), and its pathname cannot be `/login`. Anything else
falls back to the dashboard.

### Pagination: `isPending && !isPlaceholderData`

TanStack Query v5 gives a new cache key when the page changes, so the query is `isPending`
— but `keepPreviousData` means the previous page is still in `data` with
`isPlaceholderData` set. The full-page skeleton condition therefore excludes the
placeholder. Checking only `isPending` makes every page change flash a skeleton.

### Also mounts as a qiankun sub-app

`main.tsx` exports the qiankun lifecycle (`bootstrap` / `mount` / `unmount`) alongside the
standalone `render()`. Under qiankun, session and theme come from the host's `globalState`
and the store's storage is swapped for a no-op, so the sub-app and the host cannot disagree
about who is logged in. The login page is statically imported because dynamic `import()` is
not usable inside qiankun 3's ESM sandbox, and HMR is disabled because Fast Refresh injects
a runtime marker the sandbox mistakes for a lifecycle hook.

---

## Related

- [`docs/01-工程契约.md`](./docs/01-工程契约.md) — the engineering contract: what is banned
  and why, including the list of Vue patterns deliberately *not* carried over
- [`docs/04-验收记录.md`](./docs/04-验收记录.md) — per-step acceptance notes, including the
  test-policy revision and the mutation-test evidence

---

## License

MIT — see [LICENSE](./LICENSE).

The original Chinese README is kept at [`README.zh-CN.md`](./README.zh-CN.md).
