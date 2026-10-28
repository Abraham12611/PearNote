import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Phase 00 review: Vite serves nested HTML automatically in dev, but only
  // builds explicit HTML entry points. Ship the isolated UI review harness
  // alongside the real app in preview builds so owner can inspect every state.
  // This does not enable the PearNotes shell or connect to a Convex backend.
  build: {
    rolldownOptions: {
      input: {
        app: new URL("./index.html", import.meta.url).pathname,
        "pearnotes-ui-review": new URL(
          "./src/pearnotes/ui/preview/index.html",
          import.meta.url,
        ).pathname,
      },
    },
  },
  server: {
    proxy: {
      // SomaFM 403s browser requests that include a Referer. Same-origin proxy strips it.
      "/soma-ice": {
        target: "https://ice4.somafm.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/soma-ice/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("referer");
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
  },
});
