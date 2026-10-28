import { networkInterfaces } from "node:os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendProxy = {
  target: "http://localhost:8080",
  changeOrigin: true,
  configure(proxy) {
    // Keep HTTP Basic challenges inside the app so its sign-in form can show the error.
    proxy.on("proxyRes", (response) => {
      if (response.statusCode === 401) delete response.headers["www-authenticate"];
    });
  },
};

export default defineConfig({
  plugins: [react(), {
    name: "ons-local-network-tracking",
    configureServer(server) {
      server.middlewares.use("/__ons/network-origin", (request, response) => {
        if (request.method !== "GET") { response.statusCode=405; response.end(); return; }
        const interfaces=networkInterfaces();
        const entries=[...(interfaces.en0 || []),...(interfaces.en1 || [])];
        const address=entries.find(item=>!item.internal && item.family === "IPv4" && /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(item.address));
        const listener=server.httpServer?.address();
        const port=listener && typeof listener === "object" ? listener.port : null;
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify({origin:address && port ? `http://${address.address}:${port}` : null}));
      });
    },
  }],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": backendProxy,
      "/report": backendProxy,
      "/notification": backendProxy,
    },
  },
});
