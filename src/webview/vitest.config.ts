/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler", {}]],
			},
		}),
		tailwindcss(),
		tsconfigPaths(),
	],
	test: {
		environment: "react",
		setupFiles: ["./vitest.config.ts"],
		globals: true,
		css: true,
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", "dist", "out"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/", "dist/", "out/", "**/*.d.ts", "**/*.config.*", "**/coverage/**"],
		},
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
