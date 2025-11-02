# Shower Apps

Shower Apps is a mobile-first collection of small web utilities built with Next.js and Tailwind CSS. Each tool lives on its own route under `/tools/[slug]` and is registered through a manifest that feeds the landing page, navigation, and metadata.

## Getting started

```bash
pnpm install
pnpm dev --filter web
```

## Workspaces

- `apps/web` – Next.js app (App Router)
- `packages/icons` – Shared SVG icon components

## Available scripts

All scripts run from the repo root:

```bash
pnpm dev        # start Next.js dev server
pnpm build      # build the production bundle
pnpm start      # run the production server
pnpm lint       # lint via next lint
pnpm test       # run vitest unit tests
pnpm test:e2e   # run Playwright tests
```

## Archive Explorer

The initial tool is **Archive Explorer**, a client-side archive inspector that supports Zip, Tar, GZip, Tar.Gz, and 7z files. It exposes a folder hierarchy flyout and an image gallery for selective downloads.
