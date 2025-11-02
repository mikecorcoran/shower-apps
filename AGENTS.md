# AGENTS.md — Project Operating Guide (Codex / GPT-5-Codex) — **2025.11 update**

**Purpose**
Modular, mobile-first hub for small tools (“shower apps”). This file is the repo’s ground truth for architecture, quality bars, versions, and guardrails.

**Model & Environment**

* **Default model:** GPT-5-Codex (fallback GPT-5).
* **Codex surfaces:** local (CLI/IDE) and cloud; may read/modify/run within this repo.
* **This file’s role:** treat as authoritative “agent spec” for contributors.

---

## 1) Project Summary

* **Goal:** crisp, fast, responsive web hub; each tool is a self-contained module with its own page, route, and icon.
* **Stack:** **Next.js 16 (App Router)** + **React 19**, TypeScript 5.8, **Tailwind CSS v4**, Node 22 LTS (on Vercel), pnpm 10, Playwright/Vitest, deployed on Vercel. ([Next.js][2])
* **Design:** minimal, high-contrast, accessible, fast.

---

## 2) Versions & Engines (pinned)

**Runtime & package manager**

```json
// package.json (root)
{
  "packageManager": "pnpm@10",
  "engines": { "node": "22.x" }
}
```

* Vercel supports **22.x (default)** and **20.x**. Pin **22.x** unless you have a blocker. ([Vercel][1])
* Node 18 is deprecated on Vercel; Node 16 is long EOL. ([Vercel][3])

**Framework & libs (recommended ranges)**

```json
// apps/web/package.json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "eslint": "^9.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

* **Next.js 16** is current stable (Oct 21, 2025). ([Next.js][2])
* **React 19** is stable; Next 16 supports React 19. ([react.dev][4])
* **TypeScript 5.8** is the stable 2025 line; 5.9 is in RC. ([Microsoft for Developers][5])
* **ESLint 9** is the current major (flat config). ([eslint.org][6])
* **Tailwind CSS v4** is the current major. ([tailwindcss.com][7])

**Vercel project settings**

* **Project → Settings → Functions / Build**: Node.js **22.x**. (If “Managed by vercel.json” is shown, see §3.) ([Vercel][1])
* **Root dir** for builds: repo root (monorepo supported), or set `buildCommand`/`installCommand` explicitly.
* Use **Corepack** (bundled with Node) or `pnpm@10` via `packageManager`. ([pnpm.io][8])

---

## 3) vercel.json (modernize & remove legacy keys)

If you have **"builds"** in `vercel.json`, you’re on a legacy config that **disables** Project UI build settings (your log warning). Replace with framework-detected settings or the minimal runtime config below. ([Vercel][9])

```json
// vercel.json (recommended)
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "env": {
    "NEXT_TELEMETRY_DISABLED": "1"
  }
}
```

> If you must keep custom routes/functions, keep them—but **remove** the legacy `"builds"` array so Vercel can apply Node 22 and the Next.js integration.

---

## 4) Architecture & Conventions

**Layout**

```
/
├─ apps/
│  └─ web/                      # Next.js app
│     ├─ app/                   # routes/layouts
│     │  ├─ (marketing)/
│     │  ├─ tools/              # /tools/[slug]
│     │  └─ api/
│     ├─ components/
│     ├─ lib/
│     ├─ public/
│     ├─ styles/
│     └─ tools.manifest.ts
├─ packages/
│  ├─ icons/                    # SVG React icon components
│  └─ ui/                       # optional shared UI
└─ scripts/
```

**Tool contract**
`apps/web/app/tools/[slug]/` exports `page.tsx`, `metadata.ts`; optional `client.tsx`, `schema.ts` (zod), tests, and an icon in `packages/icons/[slug].tsx`. Registry lives in `apps/web/tools.manifest.ts`; landing & nav render from it.

---

## 5) Monorepo Type Safety (fix for the error you hit)

Your build error:

```
Type error: Cannot find module 'react' or its corresponding type declarations
```

Happens when a **package** (e.g., `packages/icons`) imports React types but doesn’t declare **peer deps / dev deps**.

Fix:

```json
// packages/icons/package.json
{
  "name": "@shower-apps/icons",
  "version": "0.1.0",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": "^18 || ^19"
  },
  "devDependencies": {
    "@types/react": "^18 || ^19",
    "typescript": "^5.8.0"
  }
}
```

```ts
// packages/icons/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["react"]
  }
}
```

Then in the **app** package:

```json
// apps/web/package.json
{
  "dependencies": {
    "@shower-apps/icons": "workspace:*",
    "react": "^19",
    "react-dom": "^19"
  }
}
```

Run: `pnpm -w i && pnpm -w build` (or let Vercel run `pnpm install && pnpm build`).

---

## 6) Code Standards

* **TypeScript strict**; **ESLint 9 flat config**; format with Prettier or ESLint stylistic. ([eslint.org][6])
* **Tailwind v4** with CSS variables for tokens. ([tailwindcss.com][7])
* Accessibility first; ARIA only when necessary.
* Data validation at edges (zod).
* **Unless requested or stated otherwise by the user**, do not add pages/forms/features beyond the specific task.

---

## 7) Performance, SEO, Analytics

* Next Image; responsive sizes; lazy load.
* Preload critical fonts; inline critical CSS when it helps.
* Per-route metadata (Next Metadata API).
* OG images per tool.
* Lightweight analytics (env-toggled).

---

## 8) PWA (optional)

Manifest + SW for offline tools; cache static aggressively; version bust on deploy.

---

## 9) Testing & QA

* **Unit:** Vitest; **E2E:** Playwright.
* **A11y:** axe checks in CI.
* **DoD:** types pass, lints clean, tests green; Lighthouse (mobile) ≥ 90 on new pages.

---

## 10) CI/CD

* **Vercel** previews for PRs; production on `main`.
* Checks: typecheck, lint, test, a11y, build.
* Release notes from PR titles/labels.

---

## 11) Icon Generation Rules

* Each icon is an **inline React SVG component** in `packages/icons/[slug].tsx`, 24×24 viewBox, `currentColor` stroke/fill, `aria-hidden`.

---

## 12) Landing Page

* Renders tiles from `TOOLS` (no duplication).
* Search + tag filtering; keyboard nav; focus outlines.

---

## 13) API & Server Actions (lightweight)

Prefer server actions for simple tasks; for heavier work, `/app/api/[name]/route.ts` with validation & rate limiting.

---

## 14) Config & Secrets

* All secrets via env vars; `.env.example`; fail fast with typed `env.ts`.

---

## 15) Accessibility & i18n

Landmarks/headings form a valid outline; focus states visible; 44×44 hit areas; strings centralized for future i18n.

---

## 16) Local Dev

* **Node 22.x**; **pnpm 10**; `pnpm dev`.
* Keep repo fast to clone/build; large assets in `public/` or remote.

---

## 17) Documentation

* Each tool ships an MDX readme (purpose, inputs, outputs, edge cases).
* Root README covers setup, scripts, and contribution flow.

---

## 18) Guardrails (read carefully)

* Do the **smallest coherent change**.
* Keep style/arch consistency.
* Never break existing tool URLs.
* **User override:** *Unless requested or stated otherwise by the user*, don’t change tokens/layouts or add deps.
* If a user instruction conflicts with a rule, **user instruction wins**.

---

### Footnotes & receipts

* Vercel Node versions: **22.x default; 20.x available**. ([Vercel][1])
* Node 18 deprecation on Vercel (and Node 18 EOL): ([Vercel][3])
* Node LTS cadence (use LTS for prod): ([GitHub][10])
* **Next.js 16** release (Oct 21, 2025): ([Next.js][2])
* **React 19** stable (Dec 2024): ([react.dev][4])
* **Tailwind v4** release (Jan 2025): ([tailwindcss.com][7])
* **TypeScript 5.8** (Mar 2025): ([Microsoft for Developers][5])
* ESLint 9 is current major (flat config): ([eslint.org][6])

---

[1]: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions?utm_source=chatgpt.com "Supported Node.js versions"
[2]: https://nextjs.org/blog/next-16?utm_source=chatgpt.com "Next.js 16"
[3]: https://vercel.com/changelog/node-js-18-is-being-deprecated?utm_source=chatgpt.com "Node.js 18 is being deprecated on September 1, 2025"
[4]: https://react.dev/blog/2024/12/05/react-19?utm_source=chatgpt.com "React v19"
[5]: https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/?utm_source=chatgpt.com "Announcing TypeScript 5.8"
[6]: https://eslint.org/blog/2024/04/eslint-v9.0.0-released/?utm_source=chatgpt.com "ESLint v9.0.0 released - ESLint - Pluggable JavaScript Linter"
[7]: https://tailwindcss.com/blog/tailwindcss-v4?utm_source=chatgpt.com "Tailwind CSS v4.0"
[8]: https://pnpm.io/installation?utm_source=chatgpt.com "Installation | pnpm"
[9]: https://vercel.com/docs?utm_source=chatgpt.com "Vercel Documentation"
[10]: https://github.com/nodejs/Release?utm_source=chatgpt.com "Node.js Release Working Group"
