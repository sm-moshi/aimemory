/// <reference types="node" />
/// <reference types="vite/client" />

import * as path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [react(), tailwindcss(), tsconfigPaths()],
	build: {
		outDir: "../../dist/webview",
		emptyOutDir: true,
		target: "es2022",
		sourcemap: false,
		rollupOptions: {
			output: {
				entryFileNames: "assets/[name].js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "../../src"),
			"@utils": path.resolve(__dirname, "../../src/utils"),
		},
	},
	base: "./",
});
