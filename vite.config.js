import { defineConfig } from "vite";
import wishesHandler from "./api/wishes.js";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "wishes-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = (req.url || "").split("?")[0];
          if (path !== "/api/wishes") return next();
          Promise.resolve(wishesHandler(req, res)).catch((error) => {
            console.error(error);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: "wishes" }));
            }
          });
        });
      },
    },
  ],
});
