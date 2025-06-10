/// <reference types="vitest/config" />
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"@/lib": resolve(__dirname, "./src/lib"),
			"@/vscode": resolve(__dirname, "./src/vscode"),
			"@/templates": resolve(__dirname, "./src/templates"),
			"@types": resolve(__dirname, "./src/lib/types"),
			"@core": resolve(__dirname, "./src/core"),
			"@mcp": resolve(__dirname, "./src/mcp"),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		css: true,
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", "dist", "out", "memory-bank", "**/node_modules/**"],
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/", "dist/", "out/", "**/*.d.ts", "**/*.config.*", "**/coverage/**", "memory-bank/"],
		},
	},
});
