// @ts-check
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

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
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location?.file}:${location?.line}:${location?.column}:`
        );
      });
      console.log("[watch] build finished");
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  target: ["es2020"],
  platform: "node",
  external: [
    "vscode",
    // These are imported by the @modelcontextprotocol/sdk package but are not required at runtime
    "node:test",
    "node:worker_threads",
    "canvas",
  ],
  loader: {
    ".ts": "ts",
  },
  plugins: [excludeWebviewPlugin],
  tsconfig: path.resolve(__dirname, "tsconfig.json"),
  mainFields: ["module", "main"],
  logLevel: "info",
};

// Build the extension
const extensionBuild = async () => {
  /** @type {import('esbuild').BuildOptions} */
  const options = {
    ...sharedOptions,
    entryPoints: ["./src/extension.ts"],
    outfile: path.resolve(outdir, "extension.js"),
    plugins: [excludeWebviewPlugin, esbuildProblemMatcherPlugin],
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

// Run the build
extensionBuild().catch((err) => {
  console.error(err);
  process.exit(1);
});
