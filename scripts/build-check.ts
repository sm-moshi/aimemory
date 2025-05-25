import { existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import * as path from "node:path";

function checkPathExists(relativePath: string, name: string) {
	const fullPath = path.resolve(process.cwd(), relativePath);
	if (!existsSync(fullPath)) {
		console.error(`❌ Missing: ${name} → ${relativePath}`);
		process.exit(1);
	}
	console.log(`✅ Found: ${name}`);
}

function checkFileExists(relativePath: string) {
	const fullPath = path.resolve(process.cwd(), relativePath);
	return existsSync(fullPath);
}

function runCommand(command: string) {
	try {
		execSync(command, { stdio: "inherit" });
	} catch (err) {
		console.error(`❌ Command failed: ${command}`);
		console.error(`Error details: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(1);
	}
}

// === Build Check Script for AI Memory ===

console.log("🔍 Checking build environment...");

// 1. Check key build outputs
checkPathExists("dist/extension.cjs", "Extension backend");
checkPathExists("dist/index.js", "MCP stdio server");
checkPathExists("dist/webview/index.html", "Webview build output");

// 2. Check for webview assets
const assetsPath = path.resolve(process.cwd(), "dist/webview/assets");
const hasJS = readdirSync(assetsPath).some((f) => f.endsWith(".js"));
if (!hasJS) {
	console.error("❌ No JavaScript assets found in dist/webview/assets/");
	process.exit(1);
}
console.log("✅ Found: Webview JS assets");

// 3. Check TypeScript configs compile
console.log("🔧 Validating TypeScript configs...");
runCommand("pnpm tsc --noEmit -p tsconfig.json");
runCommand("pnpm tsc --noEmit -p src/webview/tsconfig.json");

console.log("🎉 Build check passed. You're ready to package.");
