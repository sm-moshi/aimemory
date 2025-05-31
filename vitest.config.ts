/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["src/**/*.test.ts"],
		setupFiles: ["src/test/setup/vitest.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.test.ts",
				"src/**/*.d.ts",
				"src/test/extension/**", // Only exclude VS Code extension tests
				"src/webview/**",
				"dist/**",
				"node_modules/**",
			],
		},
	},
});
