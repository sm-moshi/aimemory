import fs from "node:fs";
import path from "node:path";
import alias from "@rollup/plugin-alias";
import commonjsPlugin from "@rollup/plugin-commonjs";
import jsonPlugin from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import swcPlugin from "@rollup/plugin-swc";
import bundleAnalyzer from "rollup-plugin-analyzer";
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

const isProduction = process.env.NODE_ENV === "production";
const isAnalyze = process.env.ANALYZE === "true";
const isDevelopment = !isProduction;

// Shared output directory
const outDir = path.resolve(process.cwd(), "dist");

const getSWCConfig = () => ({
	include: /\.(ts|tsx)$/,
	exclude: /node_modules/,
	jsc: {
		parser: {
			syntax: "typescript",
			decorators: true,
			dynamicImport: true,
		},
		target: "es2022",

		transform: {
			useDefineForClassFields: true,
			legacyDecorator: false,
			react: {
				runtime: "automatic",
			},
		},

		minify: isProduction
			? {
					compress: {
						dropConsole: true,
						dropDebugger: true,
						pureFuncs: ["console.log", "console.debug"],
					},
					mangle: {
						toplevel: true,
						keepFnames: false,
					},
				}
			: false,
	},

	sourceMaps: isDevelopment,
	inlineSourcesContent: isDevelopment,
});

const getPlugins = () =>
	[
		alias({
			entries: [
				// Match TypeScript paths exactly
				{ find: /^@\/(.+)/, replacement: path.resolve(process.cwd(), "src/$1") },
				{
					find: /^@test-utils\/(.+)/,
					replacement: path.resolve(process.cwd(), "src/test/test-utils/$1"),
				},
				{ find: /^@\/lib\/(.+)/, replacement: path.resolve(process.cwd(), "src/lib/$1") },
				{ find: /^@\/vscode\/(.+)/, replacement: path.resolve(process.cwd(), "src/vscode/$1") },
				{ find: /^@\/templates\/(.+)/, replacement: path.resolve(process.cwd(), "src/templates/$1") },
				{ find: /^@types\/(.+)/, replacement: path.resolve(process.cwd(), "src/lib/types/$1") },
				{ find: /^@core\/(.+)/, replacement: path.resolve(process.cwd(), "src/core/$1") },
				{ find: /^@mcp\/(.+)/, replacement: path.resolve(process.cwd(), "src/mcp/$1") },
			],
		}),

		markdownPlugin(),
		jsonPlugin(),

		nodeResolve({
			extensions: [".ts", ".js", ".json"],
			preferBuiltins: true,
			exportConditions: ["node", "import", "require"],
		}),

		swcPlugin(getSWCConfig()),

		commonjsPlugin({
			extensions: [".js"],
			ignoreDynamicRequires: true,
			transformMixedEsModules: true,
		}),

		copyPlugin({
			targets: [
				{ src: "src/assets/*", dest: "dist/assets" },
				{ src: "src/templates/*.md", dest: "dist/templates" },
			],
			verbose: isDevelopment, // Only log in development
			hook: "buildStart",
			copyOnce: true,
		}),

		isAnalyze &&
			bundleAnalyzer({
				summaryOnly: true,
				limit: 20, // Top 20 largest modules
				writeTo: analysis => {
					console.log("\n📊 Bundle Analysis:");
					console.log(analysis);
				},
			}),
	].filter(Boolean);

export default [
	// Extension Build
	{
		input: "src/extension.ts",
		output: {
			file: path.join(outDir, "extension.cjs"),
			format: "cjs",
			sourcemap: isDevelopment,
			exports: "auto",
			compact: isProduction,
			validate: isDevelopment,
		},
		external: ["vscode", "canvas", "node:test", "node:worker_threads", "gray-matter", /^node:*/],

		plugins: getPlugins(),

		onwarn(warning, warn) {
			const suppressedCodes = ["CIRCULAR_DEPENDENCY", "THIS_IS_UNDEFINED", "EVAL"];

			if (suppressedCodes.includes(warning.code) && warning.message.includes("node_modules")) {
				return;
			}

			if (isDevelopment) {
				console.warn(`⚠️  ${warning.code}: ${warning.message}`);
			}

			warn(warning);
		},

		watch: {
			include: "src/**",
			exclude: ["node_modules/**", "dist/**"],
			clearScreen: false,
		},
	},

	{
		input: "src/mcp/transport.ts",
		output: {
			file: path.join(outDir, "index.cjs"),
			format: "cjs",
			sourcemap: !isProduction,
			exports: "auto",
		},
		external: ["vscode", "canvas", "node:test", "node:worker_threads", "gray-matter"],
		plugins: getPlugins(),
		onwarn(warning, warn) {
			if (warning.code === "CIRCULAR_DEPENDENCY" && warning.message.includes("node_modules")) {
				return;
			}
			if (warning.code === "THIS_IS_UNDEFINED" && warning.message.includes("node_modules")) {
				return;
			}
			warn(warning);
		},
	},
];
