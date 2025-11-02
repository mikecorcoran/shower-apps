# AGENTS.md — Project Operating Guide (Codex / GPT-5-Codex)

**Purpose**
This repository hosts a modular, mobile-first website that acts as a hub for small tools and experiments (“shower apps”). Codex uses this file as the project’s ground truth for architecture, quality bars, and contribution workflow.

**Model & Environment**

* **Default model:** use **GPT-5-Codex** when available; fall back to **GPT-5**. GPT-5-Codex is optimized for agentic coding with Codex and is available via the Responses API; it’s regularly snapshot-updated. ([platform.openai.com][1])
* **Codex surfaces:** Codex can run locally (CLI/IDE) and in the cloud; it can read/modify/run code in a targeted directory. ([developers.openai.com][2])
* **This file’s role:** Codex supports a repo-level **AGENTS.md** convention used to define behaviors, tools, and guardrails. ([developers.openai.com][3])

---

## 1) Project Summary

* **Goal:** a clean, crisp, responsive web hub where each “tool” is a self-contained module with its own page, route, and icon.
* **Stack:** Next.js (App Router, latest), TypeScript, Tailwind CSS v4, Node 22+, Vite for isolated packages when needed, deployed on Vercel.
* **Design:** minimal, high-contrast, accessible, fast. No gratuitous motion. Maximize content density without clutter.
* **Audience:** general users on mobile and desktop.

---

## 2) Architecture & Conventions

### 2.1 Directory layout

```
/
├─ apps/
│  └─ web/                      # Next.js app (App Router)
│     ├─ app/                   # routes, layouts, metadata
│     │  ├─ (marketing)/        # landing + generic pages
│     │  ├─ tools/              # dynamic tool routes: /tools/[slug]
│     │  └─ api/                # server actions / edge APIs (minimal)
│     ├─ components/            # UI primitives (headless where possible)
│     ├─ lib/                   # shared utils (env, analytics, seo, zod)
│     ├─ public/                # static assets (favicon, og images)
│     ├─ styles/                # tailwind.css, tokens.css
│     └─ tools.manifest.ts      # registry of tools (single source of truth)
├─ packages/
│  ├─ icons/                    # SVG icon factory + templates
│  └─ ui/                       # optional shared UI (no framework lock-in)
├─ scripts/                     # codemods, scaffolds, lint hooks
└─ .github/                     # CI, PR templates
```

### 2.2 Tool module contract

Each tool lives at `apps/web/app/tools/[slug]/` and must export:

* **page**: a server component page (`page.tsx`)
* **metadata**: a `metadata.ts` exporting Next’s `Metadata`
* **client**: optional `client.tsx` for interactive UI
* **schema**: optional `schema.ts` (zod) for inputs/outputs
* **tests**: Playwright + Vitest as applicable
* **icon**: an SVG placed via the icons package (`packages/icons/[slug].tsx`)
* **registry entry**: an object in `tools.manifest.ts` (see §3)

**Routing:** tool is reachable at `/tools/[slug]`. If the tool requires parameters, prefer URLSearchParams over path params unless the path semantics are obvious.

---

## 3) Tools Registry (single source of truth)

`apps/web/tools.manifest.ts` drives the landing tiles, navigation, sitemap, and OG images.

```ts
export type ToolEntry = {
  slug: string;                 // url-safe, kebab-case
  title: string;                // short label
  description: string;          // one-liner (<= 120 chars)
  icon: string;                 // icon id in packages/icons
  tags?: string[];              // e.g., math, text, images
  dateAdded: string;            // ISO8601
  status?: 'alpha'|'beta'|'stable'|'deprecated';
};

export const TOOLS: ToolEntry[] = [ /* entries */ ];
```

**Invariant:** The landing page and nav render directly from `TOOLS`. Never hard-code tiles elsewhere.

---

## 4) Code Standards

* **TypeScript strict** everywhere.
* **Tailwind v4** with CSS Variables for design tokens (`:root` scale for color, radius, spacing).
* **Accessibility:** semantic HTML first; ARIA only when needed; all icons labeled or `aria-hidden`.
* **State:** prefer server components + ephemeral client state; avoid global stores unless a tool demands it.
* **Data validation:** zod on input boundaries.
* **Security:** never trust client input; sanitize; rate-limit APIs; edge runtime only when safe.
* **No dead code / unused deps.**
* **Unless requested or stated otherwise by the user**, do not add new pages, forms, or features beyond the specific task.

---

## 5) Visual System

* **Layout grid:** fluid, 4–12 columns depending on breakpoint; content max-widths of 720–1200px.
* **Spacing scale:** 4px base; consistent rhythm.
* **Typography:** system fonts or a single well-hinted variable font; avoid FOUT.
* **Color:** minimal palette with WCAG AA contrast for text.
* **Motion:** prefers-reduced-motion respected; use springy micro-interactions sparingly.
* **Icons:** single-color SVG, 1.5–2px stroke, rounded caps/joins, 24px grid. Provide both outline and filled variants when meaningful.

---

## 6) Performance, SEO, Analytics

* Image optimization (Next Image); responsive sizes; lazy loading.
* Preload critical fonts; inline critical CSS where beneficial.
* Metadata per route (`Metadata` API); canonical URLs; robots; sitemap.
* OG/Twitter cards generated per tool.
* Analytics: simple, privacy-respecting pageview + event logging (toggle via env).

---

## 7) PWA (optional but supported)

* Installable manifest; service worker for offline access to tool UIs that don’t require network.
* Cache static assets aggressively; versioned busting on deploy.

---

## 8) Testing & QA

* **Unit:** Vitest (components, utils).
* **E2E:** Playwright (core user flows: landing → tool → interaction).
* **Accessibility:** axe checks in CI for key pages.
* **Definition of Done (per PR):**

  1. Types pass + lints clean
  2. Tests updated/added + all green
  3. Lighthouse (mobile) PWA ≥ 90 perf/seo/accessibility on the tool page
  4. Storybook or MDX doc for complex components (if applicable)

---

## 9) CI/CD

* **Vercel**: preview deployments on PRs; production on `main`.
* **Checks:** typecheck, lint, test, a11y, build.
* **Release notes:** autogenerated from PR titles/labels.

---

## 10) Codex Behaviors (Required)

When the user asks to **add a new tool**, Codex must:

1. **Plan** the change and show a short plan before edits (files to add/modify, new routes, tests). Use GPT-5-Codex’s planning style; keep it terse. ([cookbook.openai.com][4])
2. **Scaffold** the tool:

   * Create `apps/web/app/tools/[slug]/page.tsx` (+ `metadata.ts`, optional `client.tsx`, `schema.ts`).
   * Add icon component in `packages/icons/[slug].tsx` (see §11).
   * Append entry to `apps/web/tools.manifest.ts`.
   * Add tests (Vitest + Playwright).
3. **Wire up** landing tile and nav from the registry only (no duplication).
4. **Run locally** (CLI/IDE) to build and smoke-test; surface logs and fix obvious issues. ([developers.openai.com][2])
5. **Produce a PR** with a clean diff, description, screenshots (mobile + desktop), and a 1-minute GIF of the tool in action.
6. **Do not** introduce unrelated refactors, new dependencies, or design overhauls **unless the user requests or states otherwise**.

When the user asks to **modify an existing tool**, Codex must:

* Read its module and registry entry; list the impacted files; propose migration steps; add/adjust tests accordingly.

When ambiguity exists, ask exactly one focused question, then proceed.

---

## 11) Icon Generation Rules

* Generate a simple **inline SVG React component** in `packages/icons/[slug].tsx`:

  * 24×24 viewBox; currentColor fill/stroke; `aria-hidden="true"` by default.
  * Geometry: avoid tiny details; prefer recognizable silhouettes.
  * Export default component named `IconSlug` (PascalCase).
* Update registry `icon` field to the file’s default export name or mapped id.

---

## 12) Landing Page

* Renders tiles from `TOOLS`: icon, title, short description, status chip.
* Supports search and tag filtering client-side; keyboard navigation; focus outlines.
* Tiles are dense on mobile (2-col) and expand to 3–4 columns on larger screens.
* Empty states are friendly and actionable.

---

## 13) API & Server Actions (Lightweight)

* Prefer server actions for simple, bounded operations (rate-limited).
* For heavier or external calls, add `/app/api/[name]/route.ts` with input validation and error mapping.
* No long-running jobs in Next API routes; if necessary, stub and leave a note for a future worker.

---

## 14) Configuration & Secrets

* All secrets via environment variables; never commit keys.
* Provide `.env.example` with placeholders.
* Fail fast on missing envs with a typed `env.ts` guard.

---

## 15) Accessibility & Internationalization

* Landmarks and headings form a valid, linear outline.
* All interactive elements have visible focus; hit areas ≥ 44×44.
* Text resizes to 200% without loss of content/func.
* Strings centralized for future i18n; tools can ship English-only initially.

---

## 16) Local Development

* Node 22+, pnpm or npm (consistent lockfile).
* `pnpm dev` runs the web app; Storybook optional at `pnpm storybook`.
* Keep repo fast to clone and build; large assets belong in `public/` or remote storage.

---

## 17) Documentation

* Each tool includes a short MDX readme with: purpose, inputs/outputs, edge cases, and examples.
* The root README documents setup, scripts, and contribution flow.
* Changelogs via conventional commits or PR labels.

---

## 18) Guardrails (Read Carefully)

* Follow the smallest change that achieves the user’s request.
* Maintain visual and architectural consistency with the current system.
* Never break existing tools or their URLs.
* **User override:** *Unless requested or stated otherwise by the user*, do not change tokens (colors, spacing, typography), global layouts, or add new dependencies.
* If a requested addition conflicts with a rule here, **the user’s explicit instruction wins**.

---

## 19) Acceptance Checklist (for Codex PRs)

* [ ] New/changed files match the structure in §2 and §3
* [ ] Typesafe; lints clean; tests added/updated and pass
* [ ] Mobile first, keyboard usable, contrast AA
* [ ] Lighthouse (mobile) ≥ 90 on perf/seo/a11y for new page
* [ ] Registry updated; landing tile and nav appear correctly
* [ ] Screenshots + short GIF included in PR description
* [ ] No unrelated changes

---

## 20) Notes on Models (for reference)

* **GPT-5** is the general-purpose coding/reasoning model family; **GPT-5-Codex** is tuned for agentic coding with Codex and recommended when available. ([platform.openai.com][5])

---

**End of AGENTS.md**

[1]: https://platform.openai.com/docs/models/gpt-5-codex?utm_source=chatgpt.com "Model - OpenAI API"
[2]: https://developers.openai.com/codex/cli/?utm_source=chatgpt.com "Codex CLI"
[3]: https://developers.openai.com/codex/?utm_source=chatgpt.com "Codex"
[4]: https://cookbook.openai.com/examples/gpt-5-codex_prompting_guide?utm_source=chatgpt.com "GPT-5-Codex Prompting Guide"
[5]: https://platform.openai.com/docs/models?utm_source=chatgpt.com "Models - OpenAI API"
