import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/

export default defineConfig({
  // The plugin was imported but never registered, which silently disabled React
  // Fast Refresh in development. Registering it restores HMR; production output
  // is unchanged, since Vite already applied the automatic JSX runtime to .jsx.
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
