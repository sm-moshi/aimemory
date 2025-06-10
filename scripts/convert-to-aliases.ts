#!/usr/bin/env tsx
/**
 * Script to convert relative imports to use path aliases
 * Usage: tsx scripts/convert-to-aliases.ts [pattern]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { glob } from "glob";

interface AliasRule {
	pattern: RegExp;
	replacement: string;
	description: string;
}

const ALIAS_RULES: AliasRule[] = [
	{
		pattern: /from ["']\.\.\/\.\.\/types\/([^"']+)["']/g,
		replacement: 'from "@types/$1"',
		description: "Convert ../../types/ → @types/",
	},
	{
		pattern: /from ["']\.\.\/\.\.\/core\/([^"']+)["']/g,
		replacement: 'from "@core/$1"',
		description: "Convert ../../core/ → @core/",
	},
	{
		pattern: /from ["']\.\.\/\.\.\/utils\/([^"']+)["']/g,
		replacement: 'from "@utils/$1"',
		description: "Convert ../../utils/ → @utils/",
	},
	{
		pattern: /from ["']\.\.\/\.\.\/mcp\/([^"']+)["']/g,
		replacement: 'from "@mcp/$1"',
		description: "Convert ../../mcp/ → @mcp/",
	},
	{
		pattern: /from ["']\.\.\/\.\.\/test\/test-utils\/([^"']+)["']/g,
		replacement: 'from "@test-utils/$1"',
		description: "Convert ../../test/test-utils/ → @test-utils/",
	},
	// Single level up conversions
	{
		pattern: /from ["']\.\.\/types\/([^"']+)["']/g,
		replacement: 'from "@types/$1"',
		description: "Convert ../types/ → @types/",
	},
	{
		pattern: /from ["']\.\.\/core\/([^"']+)["']/g,
		replacement: 'from "@core/$1"',
		description: "Convert ../core/ → @core/",
	},
	{
		pattern: /from ["']\.\.\/utils\/([^"']+)["']/g,
		replacement: 'from "@utils/$1"',
		description: "Convert ../utils/ → @utils/",
	},
];

async function convertFile(filePath: string): Promise<boolean> {
	try {
		const content = readFileSync(filePath, "utf-8");
		let convertedContent = content;
		let hasChanges = false;

		for (const rule of ALIAS_RULES) {
			const newContent = convertedContent.replace(
				rule.pattern,
				rule.replacement,
			);
			if (newContent !== convertedContent) {
				console.log(`  ✅ ${rule.description}`);
				convertedContent = newContent;
				hasChanges = true;
			}
		}

		if (hasChanges) {
			writeFileSync(filePath, convertedContent, "utf-8");
			return true;
		}

		return false;
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error);
		return false;
	}
}

async function main() {
	const pattern = process.argv[2] ?? "src/**/*.ts";
	console.log(`🔍 Converting imports in files matching: ${pattern}`);
	console.log("🎯 Target aliases: @types, @core, @utils, @mcp, @test-utils");
	console.log();

	try {
		const files = await glob(pattern, {
			ignore: ["node_modules/**", "dist/**", "coverage/**", "src/webview/**"],
		});

		let totalFiles = 0;
		let convertedFiles = 0;

		for (const file of files) {
			totalFiles++;
			console.log(`📁 Processing: ${file}`);

			const wasConverted = await convertFile(file);
			if (wasConverted) {
				convertedFiles++;
				console.log(`  ✨ Converted imports in ${file}`);
			} else {
				console.log(`  ⚪ No changes needed in ${file}`);
			}
			console.log();
		}

		console.log("📊 Summary:");
		console.log(`  Total files processed: ${totalFiles}`);
		console.log(`  Files with conversions: ${convertedFiles}`);
		console.log(`  Files unchanged: ${totalFiles - convertedFiles}`);

		if (convertedFiles > 0) {
			console.log("\n🚀 Run 'pnpm check-types' to verify the changes");
		}
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

main().catch(console.error);
