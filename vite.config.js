import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const NETLIFY_MAX_STATIC_FILES = 500;

function countFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((count, entry) => {
    const nextPath = resolve(dir, entry.name);
    if (entry.isDirectory()) return count + countFiles(nextPath);
    return entry.isFile() ? count + 1 : count;
  }, 0);
}

function allowOptimizedImageCopy(relativePath, sourcePath) {
  if (!relativePath) return true;
  if (statSync(sourcePath).isDirectory()) return true;

  return relativePath === "manifest.json" || extname(relativePath).toLowerCase() === ".jpg";
}

function copyStaticRuntimeFiles() {
  const rootDir = process.cwd();
  const distDir = resolve(rootDir, "dist");
  const tasks = [
    {
      from: resolve(rootDir, "assets", "img", "optimized"),
      to: resolve(distDir, "assets", "img", "optimized"),
      type: "dir",
      filter: allowOptimizedImageCopy
    },
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
          cpSync(task.from, task.to, {
            recursive: true,
            filter: task.filter
              ? (sourcePath) => task.filter(relative(task.from, sourcePath), sourcePath)
              : undefined
          });
          return;
        }

        copyFileSync(task.from, task.to);
      });

      const distFileCount = countFiles(distDir);
      if (distFileCount > NETLIFY_MAX_STATIC_FILES) {
        throw new Error(
          `Build output has ${distFileCount} files, which exceeds Netlify's ${NETLIFY_MAX_STATIC_FILES}-file upload limit.`
        );
      }
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
