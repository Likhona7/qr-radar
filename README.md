# QR Radar Modular Frontend

This folder is the modularized source for the QR Radar v11.4.14 frontend.

## Structure

- `index.html` loads the modular app shell.
- `components/` contains HTML sections split by feature area.
- `styles/radar.css` contains the extracted stylesheet.
- `scripts/` contains the extracted runtime scripts, kept in the original execution order.
- `tools/build-bundle.mjs` rebuilds a single-file HTML bundle for direct sharing.
- `dist/qr_radar_v11_4_14_modular_bundle.html` is the generated bundled output.

Serve this folder over localhost for the modular version because browser security blocks `fetch()` from local file paths. The bundled file in `dist/` can be opened directly.

## Local Data Loading

Use the included dev server when running the modular version locally:

```powershell
node .\tools\dev-server.mjs
```

Then open:

```text
http://localhost:3000
```

This server also proxies `/api/...` requests to the Render backend, so the frontend can load backend/Supabase data from localhost without CORS blocking it.
