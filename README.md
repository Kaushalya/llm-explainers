# LLM Explainers

Interactive, source-backed guides to language-model systems.

## Development

```bash
npm install
npm run dev
npm run build
```

The Vite build is multi-page: it emits the React application plus the
quantization and speculative-decoding standalone documents.

## Architecture

- `src/explainers.ts` is the public catalog and route registry.
- `src/HomePage.tsx` renders the collection homepage from that registry.
- `src/SiteHeader.tsx` is the React global navigation.
- `src/standalone-shell.ts` gives non-React documents the same catalog-driven
  navigation and design tokens.
- `src/site-shell.css` contains shared site-level visual primitives.
- `src/main.tsx` routes the React homepage, SpecDec lab, and diffusion guide.
- `posts/` contains standalone explainer documents.
- `vite.config.ts` adapts the Jekyll-authored speculative-decoding post into a
  valid standalone document without altering its front matter for Jekyll.

To publish another explainer, add its entry to `src/explainers.ts` and, if it is
a standalone HTML page, add the document to Vite's multi-page inputs.

## Text comments

Select text inside an explainer section or panel and choose **Add comment**.
The **Comments** button opens saved notes; each note can be edited or deleted,
and its quote can be clicked to return to the passage. Notes are stored in
localStorage per explainer, only in the current browser (no account or server
sync). Clearing site data removes them. If interactive content has changed or
is hidden, the original quote remains available in the note.

`src/TextComments.tsx` provides the shared UI for React and standalone pages.
Run `tests/comments-smoke.cjs` with `PLAYWRIGHT_MODULE` pointing to Playwright
and optionally `BASE_URL` pointing to the dev server (default port 5174).
