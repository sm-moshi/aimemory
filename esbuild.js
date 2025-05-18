// @ts-check
// IMPORTANT: Your tsconfig.json must have "module": "NodeNext" or "Node16" for import.meta.url to work in ESM.
import { build } from "esbuild";
import copy from "esbuild-plugin-copy";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import { analyzeMetafile } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const production = args.includes("--production");

// Define outdir
const outdir = path.resolve(__dirname, "dist");

// Create outdir if it doesn't exist
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const shared = {
  bundle: true,
  platform: "node",
  target: ["es2022"],
  external: [
    "vscode",
    "express", // Remove when refactored
    "canvas",
    "node:test",
    "node:worker_threads"
  ],
  sourcemap: !production,
  minify: production,
  logLevel: "info",
  loader: /** @type {any} */ ({
    ".ts": "ts",
    ".md": "text"
  })
};

const copyPlugin = copy({
  resolveFrom: 'cwd',
  assets: [
    { from: ['./src/assets/*'], to: ['./dist/assets'] },
    { from: ['./src/lib/rules/*.md'], to: ['./dist/lib/rules'] }
  ]
});

// Build the extension
const extensionBuild = async () => {
  await build({
    ...(shared),
    entryPoints: ["./src/extension.ts"],
    format: "cjs",
    outfile: path.resolve(outdir, "extension.cjs"),
    plugins: [copyPlugin]
  });
  console.log("Build complete!");
};

// Build the MCP CLI/server (if needed)
const mcpCliBuild = async () => {
  await build({
    ...(shared),
    entryPoints: ["./src/mcp/mcpServerCli.ts"],
    format: "cjs",
    outfile: path.resolve(outdir, "index.js"),
    plugins: [copyPlugin]
  });
  console.log("MCP CLI build complete!");
};

// Run both builds
(async () => {
  await extensionBuild();
  await mcpCliBuild();
})();
