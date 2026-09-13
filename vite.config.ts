import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    {
      name: "standalone-jekyll-explainers",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          if (!context.filename.endsWith("posts/speculative-decoding.html")) {
            return html;
          }
          const content = html
            .replace(/^---[\s\S]*?---\s*/, "")
            .replace(
              "<!-- explainer-body -->",
              "</head><body><!-- explainer-body -->",
            );
          return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="An interactive explanation of speculative decoding variants, comparing EAGLE, DFlash, DFlash 2, DSpark, and MTP.">
  <title>Speculative Decoding · LLM Explainers</title>
${content}
</body>
</html>`;
        },
      },
    },
    react(),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        quantization: resolve(__dirname, "posts/quantization-explainer.html"),
        "posts/speculative-decoding": resolve(
          __dirname,
          "posts/speculative-decoding.html",
        ),
      },
    },
  },
});
