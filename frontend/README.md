# Project Camp — Frontend

The React 19 + Vite single-page app for Project Camp, styled with Tailwind against the Obsidian Precision design tokens in [tailwind.config.js](tailwind.config.js).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle into dist/
npm run lint
```

There is no environment file. The app calls the API through the relative path `/api/v1`, which the dev server proxies to `http://localhost:8000` — so the backend must be running on that port. See [vite.config.js](vite.config.js).

Setup instructions live in the [root README](../README.md); the API contract is in [docs/API.md](../docs/API.md).
