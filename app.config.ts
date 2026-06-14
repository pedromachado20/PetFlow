import { defineConfig } from "@tanstack/start/config";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

const localEnv = loadEnv("", process.cwd(), "");
const getEnv = (key: string) => localEnv[key] || process.env[key] || "";

export default defineConfig({
  tsr: {
    routesDirectory: "./src/routes",
    generatedRouteTree: "./src/routeTree.gen.ts",
  },
  routers: {
    api: {
      entry: "./src/api.ts",
    },
    ssr: {
      entry: "./src/ssr.tsx",
    },
    client: {
      entry: "./src/client.tsx",
    },
  },
  server: {
    preset: "vercel",
  },
  vite: {
    define: {
      "process.env.DATABASE_URL": JSON.stringify(getEnv("DATABASE_URL")),
      "process.env.BETTER_AUTH_SECRET": JSON.stringify(getEnv("BETTER_AUTH_SECRET")),
      "process.env.BETTER_AUTH_URL": JSON.stringify(getEnv("BETTER_AUTH_URL")),
    },
    plugins: [
      tailwindcss(),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
});
