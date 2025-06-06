import { resolve } from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@utils": resolve(__dirname, "./src/utils"),
            "@test-utils": resolve(__dirname, "./src/test/test-utils"),
        },
    },
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/*.test.ts"],
        setupFiles: ["src/test/setup/vitest.setup.ts"],
        // Configure mocks properly using Vitest's preferred pattern
        alias: {
            // Mock VS Code package completely
            vscode: resolve(__dirname, "./src/test/__mocks__/vscode.ts"),
            // Mock Node.js built-in modules
            "node:fs": resolve(__dirname, "./src/test/__mocks__/node:fs.ts"),
            "node:fs/promises": resolve(__dirname, "./src/test/__mocks__/node:fs/promises.ts"),
            "node:os": resolve(__dirname, "./src/test/__mocks__/node:os.ts"),
            "node:path": resolve(__dirname, "./src/test/__mocks__/node:path.ts"),
        },
        // Configure deps for better mock resolution
        deps: {
            // Tell Vitest where to find __mocks__ folders for dependencies and local modules
            moduleDirectories: ["node_modules", "src/test"],
        },
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
