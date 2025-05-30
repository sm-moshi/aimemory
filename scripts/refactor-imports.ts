#!/usr/bin/env tsx

/**
 * Script to help refactor wildcard imports to specific imports
 * Usage: tsx scripts/refactor-imports.ts
 * Refactored from JavaScript to TypeScript for better type safety
 */

import { readFile } from "node:fs/promises";

interface FileAnalysis {
	file: string;
	fs: string[];
	path: string[];
	vscode: string[];
	hasWildcardFs: boolean;
	hasWildcardPath: boolean;
	hasWildcardVscode: boolean;
}

interface ModuleUsage {
	usages: Set<string>;
	hasWildcard: boolean;
}

const filesToProcess: readonly string[] = [
	"src/core/memoryBankServiceCore.ts",
	"src/core/memoryBank.ts",
	"src/lib/cursor-rules-service.ts",
	"src/test/cursor-config.test.ts",
	"src/test/memoryBankServiceCore.test.ts",
	"src/test/webviewManager.test.ts",
	"src/webview/webviewManager.ts",
	"src/mcp/mcpServerCli.ts",
	"src/mcp/mcpAdapter.ts",
] as const;

/**
 * Extract usage patterns for a specific module from file content
 */
function extractModuleUsage(content: string, moduleName: string): ModuleUsage {
	const usages = new Set<string>();
	const pattern = new RegExp(`${moduleName}\\.(\\w+)`, "g");
	let match: RegExpExecArray | null;

	// Using RegExp.exec() in a loop
	for (;;) {
		match = pattern.exec(content);
		if (match === null) {
			break;
		}
		if (match[1]) {
			usages.add(match[1]);
		}
	}

	const hasWildcard = content.includes(`import * as ${moduleName}`);

	return { usages, hasWildcard };
}

/**
 * Analyze a single file for wildcard import usage patterns
 */
async function analyzeFileUsage(filePath: string): Promise<FileAnalysis | null> {
	try {
		const content = await readFile(filePath, "utf-8");

		const fsUsage = extractModuleUsage(content, "fs");
		const pathUsage = extractModuleUsage(content, "path");
		const vscodeUsage = extractModuleUsage(content, "vscode");

		return {
			file: filePath,
			fs: Array.from(fsUsage.usages),
			path: Array.from(pathUsage.usages),
			vscode: Array.from(vscodeUsage.usages),
			hasWildcardFs: fsUsage.hasWildcard,
			hasWildcardPath: pathUsage.hasWildcard,
			hasWildcardVscode: vscodeUsage.hasWildcard,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Error analyzing ${filePath}:`, errorMessage);
		return null;
	}
}

/**
 * Generate import suggestion for a module
 */
function generateImportSuggestion(
	moduleName: string,
	methods: string[],
	importPath: string,
): string {
	return `   suggested: import { ${methods.join(", ")} } from "${importPath}";`;
}

/**
 * Display analysis results for a single file
 */
function displayFileAnalysis(analysis: FileAnalysis): void {
	console.log(`📁 ${analysis.file}`);

	if (analysis.hasWildcardFs && analysis.fs.length > 0) {
		console.log(`   fs: ${analysis.fs.join(", ")}`);
		console.log(generateImportSuggestion("fs", analysis.fs, "node:fs/promises"));
	}

	if (analysis.hasWildcardPath && analysis.path.length > 0) {
		console.log(`   path: ${analysis.path.join(", ")}`);
		console.log(generateImportSuggestion("path", analysis.path, "node:path"));
	}

	if (analysis.hasWildcardVscode && analysis.vscode.length > 0) {
		console.log(`   vscode: ${analysis.vscode.join(", ")}`);
		console.log(generateImportSuggestion("vscode", analysis.vscode, "vscode"));
	}

	console.log("");
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
	console.log("🔍 Analyzing wildcard import usage...\n");

	const analysisPromises = filesToProcess.map(analyzeFileUsage);
	const analyses = await Promise.all(analysisPromises);

	const validAnalyses = analyses.filter(
		(analysis): analysis is FileAnalysis => analysis !== null,
	);

	for (const analysis of validAnalyses) {
		displayFileAnalysis(analysis);
	}

	console.log("✅ Analysis complete! Use the suggested imports to refactor manually.");

	// Summary statistics
	const totalFiles = validAnalyses.length;
	const filesWithWildcards = validAnalyses.filter(
		(a) => a.hasWildcardFs || a.hasWildcardPath || a.hasWildcardVscode,
	).length;

	console.log(`\n📊 Summary: ${filesWithWildcards}/${totalFiles} files have wildcard imports`);
}

// Execute main function with proper error handling
main().catch((error: unknown) => {
	const errorMessage = error instanceof Error ? error.message : String(error);
	console.error("❌ Script failed:", errorMessage);
	process.exit(1);
});
