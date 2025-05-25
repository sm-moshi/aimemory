import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

function runCommand(command: string, args: string[]) {
	try {
		const result = spawnSync(command, args, {
			stdio: "inherit",
			shell: false, // Explicitly disable shell to prevent injection
		});
		if (result.status !== 0) {
			console.error(`❌ Command failed: ${command} ${args.join(" ")}`);
			process.exit(1);
		}
	} catch (err) {
		console.error(`❌ Command failed: ${command} ${args.join(" ")}`);
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
runCommand("pnpm", ["tsc", "--noEmit", "-p", "tsconfig.json"]);
runCommand("pnpm", ["tsc", "--noEmit", "-p", "src/webview/tsconfig.json"]);

console.log("🎉 Build check passed. You're ready to package.");
