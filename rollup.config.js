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

// ENHANCED: Environment detection
const isProduction = process.env.NODE_ENV === "production";
const isAnalyze = process.env.ANALYZE === "true";
const isDevelopment = !isProduction;

// Shared output directory
const outDir = path.resolve(process.cwd(), "dist");

// IMPROVED: Enhanced SWC configuration
const getSWCConfig = () => ({
	include: /\.(ts|tsx)$/,
	exclude: /node_modules/,
	jsc: {
		parser: {
			syntax: "typescript",
			decorators: true,
			dynamicImport: true, // NEW: Support dynamic imports
		},
		target: "es2022",

		// ENHANCED: Better optimization
		transform: {
			useDefineForClassFields: true, // Modern class field behavior
			legacyDecorator: false, // Use modern decorators
			react: {
				runtime: "automatic", // Modern React JSX
			},
		},

		// IMPROVED: Production optimizations
		minify: isProduction
			? {
					compress: {
						dropConsole: true, // Remove console.* in production
						dropDebugger: true, // Remove debugger statements
						pureFuncs: ["console.log", "console.debug"],
					},
					mangle: {
						toplevel: true, // More aggressive name mangling
						keepFnames: false, // Don't preserve function names
					},
				}
			: false,
	},

	// PERFORMANCE: Conditional source maps
	sourceMaps: isDevelopment,
	inlineSourcesContent: isDevelopment,
});

// ENHANCED: Plugin configuration
const getPlugins = () =>
	[
		alias({
			entries: [
				// Match TypeScript paths exactly
				{ find: /^@\/(.+)/, replacement: path.resolve(process.cwd(), "src/$1") },
				{ find: /^@utils\/(.+)/, replacement: path.resolve(process.cwd(), "src/utils/$1") },
				{
					find: /^@test-utils\/(.+)/,
					replacement: path.resolve(process.cwd(), "src/test/test-utils/$1"),
				},
				{ find: /^@types\/(.+)/, replacement: path.resolve(process.cwd(), "src/types/$1") },
				{ find: /^@core\/(.+)/, replacement: path.resolve(process.cwd(), "src/core/$1") },
				{ find: /^@mcp\/(.+)/, replacement: path.resolve(process.cwd(), "src/mcp/$1") },
			],
		}),

		markdownPlugin(),
		jsonPlugin(),

		// IMPROVED: Better module resolution
		nodeResolve({
			extensions: [".ts", ".js", ".json"],
			preferBuiltins: true,
			exportConditions: ["node", "import", "require"],
			// NEW: Better tree-shaking
			modulesOnly: true, // Only resolve ES modules when possible
		}),

		swcPlugin(getSWCConfig()),

		// ENHANCED: Better CommonJS handling
		commonjsPlugin({
			extensions: [".js"],
			ignoreDynamicRequires: true, // Better for VS Code environment
			transformMixedEsModules: true, // Handle mixed module types
		}),

		copyPlugin({
			targets: [
				{ src: "src/assets/*", dest: "dist/assets" },
				{ src: "src/lib/rules/*.md", dest: "dist/rules" },
			],
			verbose: isDevelopment, // Only log in development
			hook: "buildStart",
			copyOnce: true,
		}),

		// NEW: Bundle analysis
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

			// NEW: Better output optimization
			compact: isProduction, // Minimize whitespace in production
			validate: isDevelopment, // Validate output in development
		},

		// ENHANCED: Better externals
		external: [
			"vscode",
			"canvas",
			"node:test",
			"node:worker_threads",
			"gray-matter",
			/^node:*/, // All Node.js built-ins
		],

		plugins: getPlugins(),

		// IMPROVED: Better warning handling
		onwarn(warning, warn) {
			// Suppress known safe warnings
			const suppressedCodes = ["CIRCULAR_DEPENDENCY", "THIS_IS_UNDEFINED", "EVAL"];

			if (
				suppressedCodes.includes(warning.code) &&
				warning.message.includes("node_modules")
			) {
				return;
			}

			// Enhanced warning for development
			if (isDevelopment) {
				console.warn(`⚠️  ${warning.code}: ${warning.message}`);
			}

			warn(warning);
		},

		// NEW: Watch mode optimization
		watch: {
			include: "src/**",
			exclude: ["node_modules/**", "dist/**"],
			clearScreen: false, // Preserve terminal output
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
		external: ["vscode", "canvas", "node:test", "node:worker_threads", "gray-matter"],
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
