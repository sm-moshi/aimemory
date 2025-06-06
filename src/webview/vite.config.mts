import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
	plugins: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler", {}]],
			},
		}),
		tailwindcss(),
		tsconfigPaths(),
	],
	build: {
		outDir: "../../dist/webview",
		emptyOutDir: true,
		target: "es2022",
		sourcemap: mode !== "production",
		manifest: true,
		rollupOptions: {
			output: {
				// Use deterministic filenames for VSIX compatibility
				entryFileNames: "assets/[name].js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/[name].[ext]",
			},
		},
	},
	base: "./",
}));
