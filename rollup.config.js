import fs from "node:fs";
import path from "node:path";
import commonjsPlugin from "@rollup/plugin-commonjs";
import jsonPlugin from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import swcPlugin from "@rollup/plugin-swc";
import copyPlugin from "rollup-plugin-copy";

// Custom plugin to handle markdown imports
const markdownPlugin = () => ({
	name: "markdown",
	load(id) {
		if (id.endsWith(".md")) {
			const content = fs.readFileSync(id, "utf-8");
			return `export default ${JSON.stringify(content)};`;
		}
	},
});

// Detect if we're in production mode
const isProduction = process.env.NODE_ENV === "production";

// Shared output directory
const outDir = path.resolve(process.cwd(), "dist");

// Common plugin configuration
const getPlugins = () => [
	markdownPlugin(),
	jsonPlugin(),
	nodeResolve({
		extensions: [".ts", ".js", ".json"],
		preferBuiltins: true,
		exportConditions: ["node"],
	}),
	swcPlugin({
		include: /\.(ts|tsx)$/,
		exclude: /node_modules/,
		jsc: {
			parser: {
				syntax: "typescript",
				decorators: true,
			},
			target: "es2022",
		},
		sourceMaps: !isProduction,
		minify: isProduction,
	}),
	commonjsPlugin({
		extensions: [".js"],
	}),
	copyPlugin({
		targets: [
			{ src: "src/assets/*", dest: "dist/assets" },
			{ src: "src/lib/rules/*.md", dest: "dist/rules" },
		],
		verbose: true,
		hook: "buildStart",
		copyOnce: true,
	}),
];

export default [
	// Extension Build
	{
		input: "src/extension.ts",
		output: {
			file: path.join(outDir, "extension.cjs"),
			format: "cjs",
			sourcemap: !isProduction,
			exports: "auto",
		},
		external: ["vscode", "canvas", "node:test", "node:worker_threads"],
		plugins: getPlugins(),
		onwarn(warning, warn) {
			// Suppress circular dependency warnings from third-party libraries
			if (
				warning.code === "CIRCULAR_DEPENDENCY" &&
				warning.message.includes("node_modules")
			) {
				return;
			}
			// Suppress "this" rewrite warnings from third-party libraries
			if (warning.code === "THIS_IS_UNDEFINED" && warning.message.includes("node_modules")) {
				return;
			}
			// Show all other warnings
			warn(warning);
		},
	},

	// MCP CLI Build
	{
		input: "src/mcp/mcpServerCliEntry.ts",
		output: {
			file: path.join(outDir, "index.cjs"),
			format: "cjs",
			sourcemap: !isProduction,
			exports: "auto",
		},
		external: ["vscode", "canvas", "node:test", "node:worker_threads"],
		plugins: getPlugins(),
		onwarn(warning, warn) {
			// Suppress circular dependency warnings from third-party libraries
			if (
				warning.code === "CIRCULAR_DEPENDENCY" &&
				warning.message.includes("node_modules")
			) {
				return;
			}
			// Suppress "this" rewrite warnings from third-party libraries
			if (warning.code === "THIS_IS_UNDEFINED" && warning.message.includes("node_modules")) {
				return;
			}
			// Show all other warnings
			warn(warning);
		},
	},
];
