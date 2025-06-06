import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		setupFiles: "./vitest.setup.ts",
		environment: "happy-dom", // 2-8x faster than jsdom
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.test.{ts,tsx}",
				"src/**/*.d.ts",
				"src/vite-env.d.ts",
				"dist/**",
				"node_modules/**",
			],
		},
	},
});
