/**
 * @file src/lib/utils.ts
 * @description Consolidated general-purpose utility helpers.
 *
 * This file combines functions from the following legacy files:
 * - `src/utils/helpers.ts`
 * - `src/utils/system/process-helpers.ts`
 * - `src/utils/vscode/ui-helpers.ts`
 *
 * It provides a single, cohesive module for async operations, error handling,
 * process management, type guards, and VS Code UI interactions.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionContext } from "vscode";
import type { z } from "zod/v4";

import type { FileOperationManager } from "../core/file-operations";
import { formatErrorMessage, getErrorMessage } from "./helpers";
import { type IDisposable, type Logger, MemoryBankFileType } from "./types/core";
import type { ProcessEventHandlers, ProcessSpawnConfig } from "./types/system";

// =================================================================
// Section: Async & Error Handling
// =================================================================

export function formatZodError(issues: z.core.$ZodIssueBase[]): string {
	if (!issues || issues.length === 0) {
		return "No validation errors.";
	}
	const errorMessages = issues.map(issue => {
		const path = issue.path.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	});
	return `Validation Failed: ${errorMessages.join("; ")}`;
}

// =================================================================
// Section: Type Guards
// =================================================================

const VALID_FILE_TYPES = Object.values(MemoryBankFileType);

export function isValidMemoryBankFileType(value: unknown): value is MemoryBankFileType {
	return typeof value === "string" && VALID_FILE_TYPES.includes(value as MemoryBankFileType);
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// =================================================================
// Section: File I/O & Versioning
// =================================================================

export async function ensureDirectory(
	directoryPath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
): Promise<string> {
	const mkdirResult = await fileOperationManager.mkdirWithRetry(directoryPath, {
		recursive: true,
	});
	if (!mkdirResult.success) {
		const { error } = mkdirResult;
		if (error.code === "EEXIST") {
			logger.debug?.(`${directoryPath} directory already exists.`);
			return directoryPath;
		}
		const errorMessage = `Failed to create directory ${directoryPath}: ${error.message}`;
		logger.error(errorMessage);
		throw new Error(errorMessage);
	}
	return directoryPath;
}

export async function readJsonFile<T>(
	filePath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
	defaultConfig: T,
): Promise<T> {
	const readResult = await fileOperationManager.readFileWithRetry(filePath);
	if (!readResult.success) {
		const { error } = readResult;
		if (error.code === "ENOENT") {
			logger.info?.(`Config file ${filePath} doesn't exist, using default.`);
		} else {
			logger.error(`Config file ${filePath} couldn't be read (${error.message}), using default.`);
		}
		return defaultConfig;
	}
	try {
		return JSON.parse(readResult.data) as T;
	} catch (parseError) {
		logger.error(`Config file ${filePath} couldn't be parsed (${getErrorMessage(parseError)}), using default.`);
		return defaultConfig;
	}
}

export async function writeJsonFile(
	filePath: string,
	data: unknown,
	fileOperationManager: FileOperationManager,
): Promise<void> {
	const writeResult = await fileOperationManager.writeFileWithRetry(filePath, JSON.stringify(data, null, 2));
	if (!writeResult.success) {
		throw new Error(`Failed to write config file ${filePath}: ${writeResult.error.message}`);
	}
}

let packageInfo: { version: string; name: string } | null = null;

function getPackageInfo() {
	if (packageInfo !== null) {
		return packageInfo;
	}

	try {
		// Try multiple potential paths for package.json
		const possiblePaths = [
			// 1. Standard project structure (src/lib/utils.ts -> package.json)
			resolve(dirname(fileURLToPath(import.meta.url)), "../../../package.json"),
			// 2. Bundled extension (dist/index.cjs -> package.json in extension root)
			resolve(process.cwd(), "package.json"),
			// 3. Development workspace
			resolve(__dirname, "../../../package.json"),
			// 4. Extension directory (when running from installed extension)
			resolve(__dirname, "../../package.json"),
			// 5. Current directory fallback
			resolve(".", "package.json"),
		];

		for (const packageJsonPath of possiblePaths) {
			try {
				const packageJsonContent = readFileSync(packageJsonPath, "utf8");
				const parsed = JSON.parse(packageJsonContent);
				packageInfo = { version: parsed.version ?? "0.8.0-alpha.0", name: parsed.name ?? "aimemory" };
				return packageInfo;
			} catch {}
		}

		// If no package.json found, use hardcoded fallback values
		console.warn("package.json not found in any expected location, using fallback values");
		packageInfo = { version: "0.8.0-alpha.0", name: "aimemory" };
		return packageInfo;
	} catch (error) {
		console.error("Failed to read or parse package.json", error);
		packageInfo = { version: "0.8.0-alpha.0", name: "aimemory" };
		return packageInfo;
	}
}

export function getExtensionVersion(): string {
	const info = getPackageInfo();
	return info?.version ?? "0.0.0";
}

export function getExtensionName(): string {
	const info = getPackageInfo();
	return info?.name ?? "unknown";
}

// =================================================================
// Section: Resource Management
// =================================================================

export class ResourceManager implements IDisposable {
	private readonly disposables: Set<IDisposable> = new Set();
	private disposed = false;

	constructor(private readonly logger: Logger) {}

	public add(disposable: IDisposable): void {
		if (this.disposed) {
			this.logger.warn("Adding disposable to a disposed ResourceManager. It will be disposed immediately.");
			disposable.dispose();
			return;
		}
		this.disposables.add(disposable);
	}

	public async dispose(): Promise<void> {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.logger.info(`Disposing ${this.disposables.size} resources.`);
		for (const disposable of this.disposables) {
			try {
				await Promise.resolve(disposable.dispose());
			} catch (e) {
				this.logger.error(`Error disposing resource: ${getErrorMessage(e)}`);
			}
		}
		this.disposables.clear();
	}
}

// =================================================================
// Section: Process Management & VS Code UI
// =================================================================

export async function showVSCodeError(message: string, error?: unknown): Promise<void> {
	try {
		const { window } = await import("vscode");
		const fullMessage = error ? formatErrorMessage(message, error) : message;
		window.showErrorMessage(fullMessage);
	} catch (importError) {
		console.error("showVSCodeError failed (are you in a non-VSCode environment?):", message, error, importError);
	}
}

export async function validateWorkspace(logger: Logger): Promise<string> {
	try {
		const { workspace } = await import("vscode");
		const workspaceFolders = workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			const msg = "No workspace folder found.";
			logger.error(msg);
			throw new Error(msg);
		}
		const firstFolder = workspaceFolders[0];
		if (!firstFolder) {
			const msg = "First workspace folder is undefined.";
			logger.error(msg);
			throw new Error(msg);
		}
		return firstFolder.uri.fsPath;
	} catch (importError) {
		const msg = "Failed to validate workspace (are you in a non-VSCode environment?)";
		logger.error(msg, { error: importError });
		throw new Error(msg);
	}
}

export function createProcessConfig(context: ExtensionContext, workspacePath: string): ProcessSpawnConfig {
	const serverPath = join(context.extensionPath, "dist", "index.cjs");
	const nodeExecutable = process.execPath ?? "node";
	return {
		serverPath,
		workspacePath,
		nodeExecutable,
		cwd: context.extensionPath,
		env: {
			...process.env,
			nodeEnv: "production",
		},
	};
}

export function spawnMCPServer(config: ProcessSpawnConfig): ChildProcess {
	return spawn(config.nodeExecutable, [config.serverPath, config.workspacePath], {
		stdio: "pipe",
		cwd: config.cwd,
		env: config.env,
	});
}

export function registerProcessEventHandlers(childProcess: ChildProcess, handlers: ProcessEventHandlers): void {
	childProcess.on("error", handlers.onError);
	childProcess.on("exit", handlers.onExit);
	if (handlers.onStderr && childProcess.stderr) {
		childProcess.stderr.on("data", handlers.onStderr);
	}
}

export async function waitForProcessStartup(childProcess: ChildProcess, timeoutMs = 1000): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, timeoutMs));

	if (!childProcess || childProcess.killed) {
		throw new Error("Failed to start MCP server process");
	}
}

export async function launchMCPServerProcess(
	context: ExtensionContext,
	logger: Logger,
	eventHandlers: Omit<ProcessEventHandlers, "onStderr"> & {
		onStderr?: (data: Buffer) => void;
	},
): Promise<ChildProcess> {
	const workspacePath = await validateWorkspace(logger);
	const config = createProcessConfig(context, workspacePath);
	logger.info(`Starting MCP STDIO server: ${config.serverPath} with workspace: ${workspacePath}`);
	const childProcess = spawnMCPServer(config);
	registerProcessEventHandlers(childProcess, eventHandlers);
	await waitForProcessStartup(childProcess);
	logger.info("MCP STDIO server started successfully");
	return childProcess;
}

/**
 * Formats markdown content to comply with the most critical linting rules
 *
 * This function applies comprehensive formatting rules to prevent markdown linting
 * errors when content is written to memory bank files. Based on research of the
 * most commonly violated markdownlint rules.
 *
 * Critical rules applied:
 * - MD036: Replace emphasis-as-heading with proper blockquotes or headings
 * - MD032: Lists should be surrounded by blank lines
 * - MD031: Fenced code blocks should be surrounded by blank lines
 * - MD022: Headings should be surrounded by blank lines
 * - MD047: Files should end with a single newline character
 * - MD012: Multiple consecutive blank lines
 * - MD009: Trailing spaces
 * - MD018: No space after hash on ATX style heading
 * - MD019: Multiple spaces after hash on ATX style heading
 */
export function formatMarkdownContent(content: string): string {
	if (!content || typeof content !== "string") {
		return "";
	}

	let formatted = content;

	// MD010: Replace hard tabs with spaces (2 spaces is standard)
	formatted = formatted.replace(/\t/g, "  ");

	// MD036: Fix emphasis used as headings
	// Convert standalone emphasized text to blockquotes
	formatted = formatted.replace(/^[\s]*\*([^*\n]+)\*[\s]*$/gm, "> $1");
	formatted = formatted.replace(/^[\s]*_([^_\n]+)_[\s]*$/gm, "> $1");

	// Convert emphasized labels with colons to bold (specific pattern matching)
	formatted = formatted.replace(/\*([^*]+)\*:\s/g, "**$1**: ");
	formatted = formatted.replace(/_([^_]+)_:\s/g, "**$1**: ");

	// Convert common status indicators to bold (with space after)
	formatted = formatted.replace(/\*(Status|Priority|Timeline|Progress|Phase|Sprint|Goal|Target)\*\s/gi, "**$1** ");

	// Convert timestamp patterns to blockquotes
	formatted = formatted.replace(/\*(Last updated|Updated|Created|Modified):\s*([^*\n]*)\*/gi, "> $1: $2");

	// Process lines individually for special formatting that requires line context
	formatted = formatted
		.split("\n")
		.map((line, index, lines) => {
			// If this line was converted to bold status and next line exists, ensure spacing
			if (RegExp(/^\*\*(Status|Priority|Timeline|Progress|Phase|Sprint|Goal|Target)\*\* /i).exec(line)) {
				const nextLine = lines[index + 1];
				if (
					nextLine &&
					nextLine.trim() !== "" &&
					!nextLine.match(/^\*\*(Status|Priority|Timeline|Progress|Phase|Sprint|Goal|Target)\*\* /i)
				) {
					// Mark for extra spacing - will be handled in the line-by-line processor
					return `${line}|||NEEDS_SPACING|||`;
				}
			}
			return line;
		})
		.join("\n");

	// MD018: Ensure space after hash on ATX headings
	formatted = formatted.replace(/^(#{1,6})([^\s#])/gm, "$1 $2");

	// MD019: Remove multiple spaces after hash on ATX headings
	formatted = formatted.replace(/^(#{1,6})\s{2,}/gm, "$1 ");

	// MD037: Remove spaces inside emphasis markers
	formatted = formatted.replace(/\*\s+([^*]+)\s+\*/g, "*$1*");
	formatted = formatted.replace(/_\s+([^_]+)\s+_/g, "_$1_");
	formatted = formatted.replace(/\*\*\s+([^*]+)\s+\*\*/g, "**$1**");
	formatted = formatted.replace(/__\s+([^_]+)\s+__/g, "__$1__");

	// MD038: Remove spaces inside code span elements
	formatted = formatted.replace(/`\s+([^`]+)\s+`/g, "`$1`");

	// MD039: Remove spaces inside link text
	formatted = formatted.replace(/\[\s+([^\]]+)\s+\]/g, "[$1]");

	// Process line by line for better control of list and heading spacing
	const lines = formatted.split("\n");
	const processedLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const currentLine = lines[i];
		const prevLine = i > 0 ? lines[i - 1] : null;
		const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

		// Skip if currentLine is undefined
		if (!currentLine) continue;

		// MD022: Headings should be surrounded by blank lines
		if (currentLine.match(/^#{1,6}\s/)) {
			// Add blank line before heading (except at start of document)
			if (i > 0 && prevLine && prevLine.trim() !== "" && processedLines[processedLines.length - 1] !== "") {
				processedLines.push("");
			}
			processedLines.push(currentLine);
			// Add blank line after heading (except if next line is heading or empty)
			if (nextLine && nextLine.trim() !== "" && !nextLine.match(/^#{1,6}\s/)) {
				processedLines.push("");
			}
		}
		// MD032: Lists should be surrounded by blank lines
		else if (currentLine.match(/^[\s]*[-*+]\s/) || currentLine.match(/^[\s]*\d+\.\s/)) {
			const isFirstListItem = !prevLine?.match(/^[\s]*[-*+]\s/) && !prevLine?.match(/^[\s]*\d+\.\s/);
			const isLastListItem = !nextLine?.match(/^[\s]*[-*+]\s/) && !nextLine?.match(/^[\s]*\d+\.\s/);

			// Add blank line before first list item
			if (
				isFirstListItem &&
				prevLine &&
				prevLine.trim() !== "" &&
				processedLines[processedLines.length - 1] !== ""
			) {
				processedLines.push("");
			}
			processedLines.push(currentLine);
			// Add blank line after last list item
			if (
				isLastListItem &&
				nextLine &&
				nextLine.trim() !== "" &&
				processedLines[processedLines.length - 1] !== ""
			) {
				// Will be added after the loop completes for this item
			}
		}
		// MD031: Fenced code blocks should be surrounded by blank lines
		else if (currentLine.match(/^```/)) {
			const isOpeningFence = !currentLine.match(/^```.*```$/); // Not a single-line code block

			if (isOpeningFence) {
				// Add blank line before opening fence
				if (prevLine && prevLine.trim() !== "" && processedLines[processedLines.length - 1] !== "") {
					processedLines.push("");
				}
			}
			processedLines.push(currentLine);
		} else {
			processedLines.push(currentLine);
		}

		// Check if we need to add blank line after list
		if (
			(currentLine.match(/^[\s]*[-*+]\s/) || currentLine.match(/^[\s]*\d+\.\s/)) &&
			nextLine &&
			nextLine.trim() !== "" &&
			!nextLine.match(/^[\s]*[-*+]\s/) &&
			!nextLine.match(/^[\s]*\d+\.\s/)
		) {
			processedLines.push("");
		}

		// Check if we need blank line after closing code fence
		if (currentLine.match(/^```$/) && nextLine && nextLine.trim() !== "") {
			processedLines.push("");
		}
	}

	formatted = processedLines.join("\n");

	// MD009: Remove trailing spaces
	formatted = formatted.replace(/[ \t]+$/gm, "");

	// MD012: Remove multiple consecutive blank lines
	formatted = formatted.replace(/\n{3,}/g, "\n\n");

	// MD047: Ensure file ends with a single newline
	formatted = formatted.replace(/\n*$/, "\n");

	return formatted;
}
