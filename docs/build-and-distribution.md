# Build and distribution

Four outputs from one source tree. The differences between them are almost entirely about
the **base path**, which is where every distribution bug in this project has come from.

| Script | Config | Output | Base |
|---|---|---|---|
| `pnpm dev` | `vite.config.ts` | dev server | `/gantt/` |
| `pnpm deploy:gh` | `vite.config.ts` | `dist/` → `gh-pages` branch | `/gantt/` |
| `pnpm build:single` | `vite.singlefile.config.ts` | one `dist-single/index.html` | `./` |
| `pnpm build:exe` | `vite.config.ts` + `@yao-pkg/pkg` | `dist-exe/GanttChart.exe` | see below |

## Why base is `/gantt/`

The GitHub Pages deploy lands under a `/gantt/` path, so `vite.config.ts` sets
`base: '/gantt/'`. That literal is repeated in three more places:

- the PWA manifest `scope` and `start_url` in `vite.config.ts`
- `index.html`'s `<link rel="icon">` and `<link rel="apple-touch-icon">`

The `index.html` hrefs are the trap: they are written as absolute `/gantt/...` paths, which
Vite does **not** rebase when a different config sets a different base. Use
`%BASE_URL%`-relative or root-relative-to-base references there, or the icons 404 in every
build that is not served from `/gantt/`.

## The EXE build

`build:exe` runs `pnpm build` (base `/gantt/`) and packages the resulting `dist/` with
`@yao-pkg/pkg` alongside `launcher/server.cjs`. The launcher serves `dist/` at the **root**
of a local HTTP server on `127.0.0.1:9473+`.

That mismatch breaks the packaged app: `dist/index.html` requests
`/gantt/assets/index-*.js`, the launcher's `fs.stat` misses, the SPA fallback returns
`index.html` labelled `text/html`, and the browser's strict MIME check refuses to execute a
`type="module"` script served as HTML. The window opens blank.

The EXE needs its own build with `base: './'` (or the launcher needs to mount `dist/` under
`/gantt/`). Track this as roadmap item R-16.

The launcher also sets a strict CSP:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; connect-src 'self'
```

Anything the app loads from a third-party origin is therefore blocked in the EXE. The
Google Fonts `@import` at the top of `src/index.css` is exactly that: the stylesheet is
blocked by `style-src 'self'` and the woff2 by `font-src 'self'`, so the offline build
silently falls back to system fonts and every tuned 10–13px label re-flows at different
metrics. Self-host the font (roadmap R-37).

The EXE is unsigned — Windows SmartScreen prompts "More info" → "Run anyway" on first launch.

## The single-file build

`vite.singlefile.config.ts` sets `base: './'`, drops the PWA plugin, and inlines every
asset into one `dist-single/index.html` (~500 KB). It is the easiest artifact to email or
drop on a share. It inherits the same absolute-href problem from `index.html` for its icons,
and the same Google Fonts dependency.

## PWA

`vite-plugin-pwa` in `generateSW` mode with `registerType: 'autoUpdate'` precaches
`**/*.{js,css,html,svg,png,jpg,woff2}`. The manifest declares fullscreen display and
landscape orientation.

Installability depends on the icons in `public/icons/` existing. If `public/` is missing,
the manifest's icons 404 and the app is not installable — while the Help dialog still claims
it is.

## Toolchain notes

- The repo lives under OneDrive. pnpm creates junctions with **absolute** targets, so moving
  or re-syncing the folder invalidates every one of them and each script dies with
  `Cannot find module .../node_modules/<tool>`. Fix with `CI=true pnpm install` (the `CI`
  flag is needed because pnpm will not purge `node_modules` without a TTY).
- `pnpm-workspace.yaml` lists `esbuild` under `ignoredBuiltDependencies`, so its postinstall
  is skipped; pnpm prints `ERR_PNPM_IGNORED_BUILDS` as a warning and the build still works.
- `lint` is not invoked by any build script, and there is no CI. Both are roadmap items
  (R-19).
