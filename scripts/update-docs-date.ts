#!/usr/bin/env tsx

/**
 * Update Documentation Date Script
 *
 * Automatically updates "Last updated" timestamps in markdown files
 * throughout the documentation, excluding memory-bank and src/lib/rules
 * directories to preserve user-managed content.
 *
 * Usage: tsx scripts/update-docs-date.ts
 * Refactored from JavaScript to TypeScript for better type safety
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { cwd } from "node:process";

const projectRoot = resolve(cwd());

interface DatePattern {
	regex: RegExp;
	replacement: (match: string, ...groups: string[]) => string;
}

interface UpdateResult {
	content: string;
	hasChanges: boolean;
}

interface ProcessingStats {
	totalFiles: number;
	updatedFiles: number;
	skippedDirs: string[];
	errorFiles: string[];
}

// Get current date in YYYY-MM-DD format
const getCurrentDate = (): string => {
	const now = new Date();
	return now.toISOString().split("T")[0];
};

// Directories to exclude from date updates
const EXCLUDED_DIRS: readonly string[] = [
	"memory-bank",
	"src/lib/rules",
	"node_modules",
	".git",
	"dist",
	".vscode-test",
	"coverage",
] as const;

// Patterns to match and update
const DATE_PATTERNS: readonly DatePattern[] = [
	// Pattern: _Last updated: YYYY-MM-DD_
	{
		regex: /(_Last updated:\s*)(\d{4}-\d{2}-\d{2})(_)/g,
		replacement: (match: string, prefix: string, date: string, suffix: string): string =>
			`${prefix}${getCurrentDate()}${suffix}`,
	},
	// Pattern: _Last updated: YYYY-MM-DD 🐹_
	{
		regex: /(_Last updated:\s*)(\d{4}-\d{2}-\d{2})(\s*🐹_)/g,
		replacement: (match: string, prefix: string, date: string, suffix: string): string =>
			`${prefix}${getCurrentDate()}${suffix}`,
	},
	// Pattern: Last updated: YYYY-MM-DD
	{
		regex: /(Last updated:\s*)(\d{4}-\d{2}-\d{2})/g,
		replacement: (match: string, prefix: string, date: string): string =>
			`${prefix}${getCurrentDate()}`,
	},
] as const;

/**
 * Check if a directory path should be excluded
 */
const isExcludedDir = (dirPath: string): boolean => {
	const relativePath = dirPath.replace(`${projectRoot}/`, "");
	return EXCLUDED_DIRS.some((excluded) => {
		const excludedPath = `${excluded}/`;
		return relativePath === excluded || relativePath.startsWith(excludedPath);
	});
};

/**
 * Recursively find all markdown files
 */
const findMarkdownFiles = (dir: string, files: string[] = []): string[] => {
	if (isExcludedDir(dir)) {
		const displayDir = dir.replace(`${projectRoot}/`, "");
		console.log(`⏭️  Skipping excluded directory: ${displayDir}`);
		return files;
	}

	try {
		const items = readdirSync(dir);

		for (const item of items) {
			const fullPath = join(dir, item);
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				findMarkdownFiles(fullPath, files);
			} else if (stat.isFile() && extname(item).toLowerCase() === ".md") {
				files.push(fullPath);
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.warn(`⚠️  Warning: Could not read directory ${dir}: ${errorMessage}`);
	}

	return files;
};

/**
 * Update date patterns in file content
 */
const updateDatesInContent = (content: string): UpdateResult => {
	let updatedContent = content;
	let hasChanges = false;

	for (const pattern of DATE_PATTERNS) {
		const originalContent = updatedContent;
		updatedContent = updatedContent.replace(pattern.regex, pattern.replacement);

		if (originalContent !== updatedContent) {
			hasChanges = true;
		}
	}

	return { content: updatedContent, hasChanges };
};

/**
 * Process a single markdown file
 */
const processFile = (filePath: string): boolean => {
	try {
		const content = readFileSync(filePath, "utf8");
		const { content: updatedContent, hasChanges } = updateDatesInContent(content);

		if (hasChanges) {
			writeFileSync(filePath, updatedContent, "utf8");
			const relativePath = filePath.replace(`${projectRoot}/`, "");
			console.log(`✅ Updated: ${relativePath}`);
			return true;
		}

		return false;
	} catch (error) {
		const relativePath = filePath.replace(`${projectRoot}/`, "");
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`❌ Error processing ${relativePath}: ${errorMessage}`);
		return false;
	}
};

/**
 * Main execution function
 */
const main = (): void => {
	console.log("🔄 Updating documentation dates...\n");
	console.log(`📅 Current date: ${getCurrentDate()}\n`);

	const markdownFiles = findMarkdownFiles(projectRoot);
	console.log(`📄 Found ${markdownFiles.length} markdown files\n`);

	let updatedCount = 0;
	const stats: ProcessingStats = {
		totalFiles: markdownFiles.length,
		updatedFiles: 0,
		skippedDirs: [],
		errorFiles: [],
	};

	for (const file of markdownFiles) {
		if (processFile(file)) {
			updatedCount++;
		}
	}

	stats.updatedFiles = updatedCount;

	console.log(
		`\n🎉 Complete! Updated ${updatedCount} files out of ${markdownFiles.length} total.`,
	);

	if (updatedCount === 0) {
		console.log("ℹ️  No files needed date updates.");
	}

	// Summary statistics
	console.log(`\n📊 Summary: ${stats.updatedFiles}/${stats.totalFiles} files updated`);
};

// Execute main function with proper error handling
try {
	main();
} catch (error) {
	const errorMessage = error instanceof Error ? error.message : String(error);
	console.error("❌ Script failed:", errorMessage);
	process.exit(1);
}
