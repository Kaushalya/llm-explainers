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
- `vite.config.ts` adapts the Jekyll-authored speculative-decoding post into a
  valid standalone document without altering its front matter for Jekyll.

To publish another explainer, add its entry to `src/explainers.ts` and, if it is
a standalone HTML page, add the document to Vite's multi-page inputs.
