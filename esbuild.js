// @ts-check
// IMPORTANT: Your tsconfig.json must have "module": "NodeNext" or "Node16" for import.meta.url to work in ESM.
import * as esbuild from "esbuild";
// import { nodeExternalsPlugin } from "esbuild-node-externals"; // Remove if not installed/needed
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

/**
 * @type {import('esbuild').Plugin}
 */
const assetsCopyPlugin = {
  name: "assets-copy",
  setup(build) {
    build.onEnd(() => {
      // Source assets directory
      const srcAssetsDir = path.resolve(__dirname, "src/assets");
      // Destination assets directory
      const destAssetsDir = path.resolve(outdir, "assets");

      // Create destination directory if it doesn't exist
      if (!fs.existsSync(destAssetsDir)) {
        fs.mkdirSync(destAssetsDir, { recursive: true });
      }

      // Copy all files from src/assets to dist/assets
      if (fs.existsSync(srcAssetsDir)) {
        const files = fs.readdirSync(srcAssetsDir);
        for (const file of files) {
          const srcFile = path.join(srcAssetsDir, file);
          const destFile = path.join(destAssetsDir, file);

          // Only copy files, not directories
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
            console.log(`Copied asset: ${file} to ${destAssetsDir}`);
          }
        }
      } else {
        console.warn("Source assets directory does not exist:", srcAssetsDir);
      }
    });
  },
};

/**
 * @type {import('esbuild').Plugin}
 */
const excludeWebviewPlugin = {
  name: "exclude-webview",
  setup(build) {
    // Filter out files from the webview directory
    build.onResolve({ filter: /\/webview\// }, (args) => {
      return {
        external: true,
      };
    });
  },
};

/**
 * @type {import('esbuild').Plugin}
 */
const markdownCopyPlugin = {
  name: "markdown-copy",
  setup(build) {
    // Intercept all .md file imports and handle them
    build.onResolve({ filter: /\.md$/ }, (args) => {
      // Get the full path of the markdown file
      const resolvedPath = path.resolve(args.resolveDir, args.path);

      // Calculate where it should go in the output directory
      const srcDir = path.resolve(__dirname, "src");
      const relativePath = path.relative(srcDir, resolvedPath);
      const outputPath = path.join(outdir, relativePath);

      // Create directory structure if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Copy the file
      fs.copyFileSync(resolvedPath, outputPath);
      console.log(`Copied ${relativePath} to output directory`);

      // Get the content for bundling
      const content = fs.readFileSync(resolvedPath, "utf-8");

      return {
        // Return the contents and mark as resolved
        path: args.path,
        namespace: "markdown-ns",
        pluginData: { content, outputPath },
      };
    });

    // Provide the file contents when esbuild asks for them
    build.onLoad({ filter: /.*/, namespace: "markdown-ns" }, (args) => {
      return {
        contents: args.pluginData.content,
        loader: "text",
      };
    });
  },
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location?.file}:${location?.line}:${location?.column}:`
        );
      }
      console.log("[watch] build finished");
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  target: ["es2022"],
  platform: "node",
  external: [
    "vscode",
    // "express", - for now it has to be bundled
    // These are imported by the @modelcontextprotocol/sdk package but are not required at runtime
    "node:test",
    "node:worker_threads",
    "canvas",
  ],
  loader: {
    ".ts": "ts",
    ".md": "text", // Add loader for .md files
  },
  plugins: [assetsCopyPlugin, excludeWebviewPlugin, markdownCopyPlugin],
  tsconfig: path.resolve(__dirname, "tsconfig.json"),
  mainFields: ["module", "main"],
  logLevel: "info",
  metafile: true,
};

// Build the extension
const extensionBuild = async () => {
  /** @type {import('esbuild').BuildOptions} */
  const options = {
    ...sharedOptions,
    format: "cjs", // <-- Ensure CommonJS for VS Code extension host
    entryPoints: ["./src/extension.ts"],
    outfile: path.resolve(outdir, "extension.cjs"),
    plugins: [
      assetsCopyPlugin,
      excludeWebviewPlugin,
      markdownCopyPlugin,
      esbuildProblemMatcherPlugin,
    ],
    metafile: true,
  };

  if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(options);
    console.log("Build complete!");
  }
};

// Build the MCP CLI stdio server
const mcpCliBuild = async () => {
  /** @type {import('esbuild').BuildOptions} */
  const options = {
    ...sharedOptions,
    entryPoints: ["./src/mcpServerCli.ts"],
    outfile: path.resolve(outdir, "index.js"), // This is what Cursor expects!
    plugins: [
      assetsCopyPlugin,
      excludeWebviewPlugin,
      markdownCopyPlugin,
      esbuildProblemMatcherPlugin,
    ],
    metafile: true,
  };

  if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
    console.log("Watching for changes (MCP CLI)...");
  } else {
    await esbuild.build(options);
    console.log("MCP CLI build complete!");
  }
};

// Run both builds
(async () => {
  await extensionBuild();
  await mcpCliBuild();
})();
