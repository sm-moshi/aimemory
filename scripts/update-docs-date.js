#!/usr/bin/env node

/**
 * Update Documentation Date Script
 *
 * Automatically updates "Last updated" timestamps in markdown files
 * throughout the documentation, excluding memory-bank and src/lib/rules
 * directories to preserve user-managed content.
 *
 * Usage: node scripts/update-docs-date.js
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
	const now = new Date();
	return now.toISOString().split("T")[0];
};

// Directories to exclude from date updates
const EXCLUDED_DIRS = [
	"memory-bank",
	"src/lib/rules",
	"node_modules",
	".git",
	"dist",
	".vscode-test",
	"coverage",
];

// Patterns to match and update
const DATE_PATTERNS = [
	// Pattern: _Last updated: YYYY-MM-DD_
	{
		regex: /(_Last updated:\s*)(\d{4}-\d{2}-\d{2})(_)/g,
		replacement: (match, prefix, date, suffix) => `${prefix}${getCurrentDate()}${suffix}`,
	},
	// Pattern: _Last updated: YYYY-MM-DD 🐹_
	{
		regex: /(_Last updated:\s*)(\d{4}-\d{2}-\d{2})(\s*🐹_)/g,
		replacement: (match, prefix, date, suffix) => `${prefix}${getCurrentDate()}${suffix}`,
	},
	// Pattern: Last updated: YYYY-MM-DD
	{
		regex: /(Last updated:\s*)(\d{4}-\d{2}-\d{2})/g,
		replacement: (match, prefix, date) => `${prefix}${getCurrentDate()}`,
	},
];

/**
 * Check if a directory path should be excluded
 */
const isExcludedDir = (dirPath) => {
	const relativePath = dirPath.replace(`${projectRoot}/`, "");
	return EXCLUDED_DIRS.some(
		(excluded) => relativePath === excluded || relativePath.startsWith(`${excluded}/`),
	);
};

/**
 * Recursively find all markdown files
 */
const findMarkdownFiles = (dir, files = []) => {
	if (isExcludedDir(dir)) {
		console.log(`⏭️  Skipping excluded directory: ${dir.replace(`${projectRoot}/`, "")}`);
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
		console.warn(`⚠️  Warning: Could not read directory ${dir}: ${error.message}`);
	}

	return files;
};

/**
 * Update date patterns in file content
 */
const updateDatesInContent = (content) => {
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
const processFile = (filePath) => {
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
		console.error(`❌ Error processing ${relativePath}: ${error.message}`);
		return false;
	}
};

/**
 * Main execution function
 */
const main = () => {
	console.log("🔄 Updating documentation dates...\n");
	console.log(`📅 Current date: ${getCurrentDate()}\n`);

	const markdownFiles = findMarkdownFiles(projectRoot);
	console.log(`📄 Found ${markdownFiles.length} markdown files\n`);

	let updatedCount = 0;

	for (const file of markdownFiles) {
		if (processFile(file)) {
			updatedCount++;
		}
	}

	console.log(
		`\n🎉 Complete! Updated ${updatedCount} files out of ${markdownFiles.length} total.`,
	);

	if (updatedCount === 0) {
		console.log("ℹ️  No files needed date updates.");
	}
};

// Run the script
main();
