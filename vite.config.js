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
  plugins: [react()],
  server: {
    proxy: {
      "/api": backendProxy,
      "/report": backendProxy,
      "/notification": backendProxy,
    },
  },
});
