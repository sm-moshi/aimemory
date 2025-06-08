/// <reference types="vitest/config" />
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"@utils": resolve(__dirname, "./src/utils"),
			"@test-utils": resolve(__dirname, "./src/test/test-utils"),
			"@types": resolve(__dirname, "./src/types"),
			"@core": resolve(__dirname, "./src/core"),
			"@mcp": resolve(__dirname, "./src/mcp"),
			vscode: resolve(__dirname, "./src/test/__mocks__/vscode.ts"),
		},
	},
	test: {
		// Root coverage configuration for the whole workspace
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
		},
		projects: [
			{
				// Project 1: Extension Tests (Node environment)
				test: {
					name: "extension",
					include: ["src/**/*.test.ts"],
					exclude: ["src/webview/**/*.test.ts", "node_modules/**"],
					environment: "node",
					setupFiles: ["src/test/setup/extension-setup.ts"],
				},
			},
			{
				// Project 2: Webview Tests (DOM environment)
				test: {
					name: "webview",
					include: ["src/webview/**/*.test.{ts,tsx}"],
					environment: "happy-dom",
					setupFiles: ["src/webview/vitest.setup.ts"],
					globals: true,
				},
			},
		],
	},
});
