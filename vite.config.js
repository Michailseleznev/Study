import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function copyStaticRuntimeFiles() {
  const rootDir = process.cwd();
  const distDir = resolve(rootDir, "dist");
  const tasks = [
    { from: resolve(rootDir, "assets", "img"), to: resolve(distDir, "assets", "img"), type: "dir" },
    { from: resolve(rootDir, "unsplash-local"), to: resolve(distDir, "unsplash-local"), type: "dir" },
    { from: resolve(rootDir, "sw.js"), to: resolve(distDir, "sw.js"), type: "file" }
  ];

  return {
    apply: "build",
    closeBundle() {
      tasks.forEach((task) => {
        if (!existsSync(task.from)) return;

        mkdirSync(dirname(task.to), { recursive: true });
        if (task.type === "dir") {
          cpSync(task.from, task.to, { recursive: true });
          return;
        }

        copyFileSync(task.from, task.to);
      });
    },
    name: "copy-static-runtime-files"
  };
}

export default defineConfig({
  plugins: [react(), copyStaticRuntimeFiles()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020"
  },
  server: {
    host: "127.0.0.1",
    port: 4173
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  }
});
