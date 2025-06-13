import * as path from "node:path";
import * as vscode from "vscode";
import { FileOperationManager } from "../core/file-operations";
// Dependencies - correct imports for current structure
import { CursorRulesService, getCursorMemoryBankRulesFile } from "../cursor-integration";
// Core types - updated for consolidated structure
import type { Logger } from "../lib/types/core";
import { LogLevel } from "../lib/types/core";

// === Constants ===

export const DEFAULT_LOG_LEVEL = "info";

// === Workspace Detection & Path Management ===

/**
 * Helper function to get and validate workspace folder
 */
export function getMemoryBankPath(): string {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		throw new Error("No workspace folder found");
	}
	const firstFolder = workspaceFolders[0];
	if (!firstFolder) {
		throw new Error("No workspace folder found");
	}
	return path.join(firstFolder.uri.fsPath, "memory-bank");
}

/**
 * Get the workspace root path if available
 */
export function getWorkspaceRoot(): string | null {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return null;
	}
	const firstFolder = workspaceFolders[0];
	return firstFolder?.uri.fsPath ?? null;
}

/**
 * Check if a workspace is currently open
 */
export function hasWorkspace(): boolean {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	return !!(workspaceFolders && workspaceFolders.length > 0);
}

// === Configuration Management ===

/**
 * Parse string log level to LogLevel enum
 */
export function parseLogLevel(levelStr: string): LogLevel {
	switch (levelStr.toLowerCase()) {
		case "trace":
			return LogLevel.Trace;
		case "debug":
			return LogLevel.Debug;
		case "info":
			return LogLevel.Info;
		case "warn":
		case "warning":
			return LogLevel.Warn;
		case "error":
			return LogLevel.Error;
		case "off":
			return LogLevel.Off;
		default:
			return LogLevel.Info;
	}
}

/**
 * Get configuration value with fallback
 */
export function getConfiguration(): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration("aimemory");
}

/**
 * Get log level from configuration
 */
export function getConfiguredLogLevel(): LogLevel {
	const config = getConfiguration();
	const levelStr = config.get<string>("logLevel") ?? DEFAULT_LOG_LEVEL;
	return parseLogLevel(levelStr);
}

/**
 * Update log level in configuration
 */
export async function updateLogLevel(
	level: string,
	target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
	const config = getConfiguration();
	await config.update("logLevel", level, target);
}

// === Memory Bank Rules Management ===

/**
 * VS Code specific logic for creating memory bank rules if not exists
 * Only techContext/index.md is created on initialization. Other techContext files are created on demand.
 */
export async function createMemoryBankRulesIfNotExists(
	cursorRulesService: CursorRulesService,
	logger: Logger,
	fileOperationManager?: FileOperationManager,
): Promise<void> {
	const workspaceRoot = getWorkspaceRoot();
	if (!workspaceRoot) {
		logger.warn("No workspace folder found - cannot create memory bank rules");
		return;
	}

	const cursorRulesPath = path.join(workspaceRoot, ".cursor", "rules");
	const memoryBankRulesPath = path.join(cursorRulesPath, "memory-bank.mdc");

	try {
		// Check if rules file already exists using available API
		const existsResult = await cursorRulesService.readRulesFile("memory-bank.mdc");
		if (existsResult.success) {
			logger.info("Memory bank rules file already exists");
			return;
		}

		// Try to load from template if fileOperationManager is available
		let templateContent: string;
		if (fileOperationManager) {
			try {
				templateContent = await getCursorMemoryBankRulesFile(fileOperationManager);
				logger.debug("Loaded memory bank rules from template");
			} catch (error) {
				logger.warn("Failed to load template, using fallback content", {
					error,
				});
				templateContent = getFallbackMemoryBankRulesContent();
			}
		} else {
			logger.debug("No file operation manager provided, using fallback content");
			templateContent = getFallbackMemoryBankRulesContent();
		}

		await cursorRulesService.createRulesFile("memory-bank.mdc", templateContent);
		vscode.window.showInformationMessage("Created memory bank rules file for Cursor AI integration");
		logger.info(`Created memory bank rules at: ${memoryBankRulesPath}`);
	} catch (error) {
		logger.error(`Error creating memory bank rules: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Fallback content when template cannot be loaded
 */
function getFallbackMemoryBankRulesContent(): string {
	return `# Cursor Memory Bank Rules (AI Memory v0.8.0+)

Welcome to the AI Memory system. This file acts as the blueprint for how Cursor understands and works with your Memory Bank.

## 🧠 Reset & Load

- On every session reset, run \`read-memory-bank-files()\`
- Always load core files and current progress

## 📂 Memory Bank Structure

Your memory bank is organized for efficient AI context management.

This file was auto-generated by the AI Memory extension.`;
}

// === Configuration Change Listeners ===

/**
 * Setup configuration change listeners
 */
export function setupConfigurationListeners(context: vscode.ExtensionContext, logger: Logger): void {
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration("aimemory.logLevel")) {
				const newLevel =
					vscode.workspace.getConfiguration("aimemory").get<string>("logLevel") ?? DEFAULT_LOG_LEVEL;
				logger.setLevel(parseLogLevel(newLevel));
				logger.info(`Log level changed to: ${newLevel}`);
			}
		}),
	);
}

// === Extension Lifecycle Utilities ===

/**
 * Initialize extension with workspace validation
 */
export function validateWorkspaceForExtension(): void {
	if (!hasWorkspace()) {
		throw new Error("AI Memory extension requires an open workspace to function properly");
	}
}

/**
 * Get extension configuration on activation
 */
export function getInitialConfiguration(): {
	logLevel: LogLevel;
	config: vscode.WorkspaceConfiguration;
} {
	const config = getConfiguration();
	const logLevel = getConfiguredLogLevel();
	return { logLevel, config };
}

// === Workspace Information ===

/**
 * Get workspace information for debugging/logging
 */
export function getWorkspaceInfo(): {
	hasWorkspace: boolean;
	workspaceRoot: string | null;
	memoryBankPath: string | null;
	folderCount: number;
} {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const hasWs = hasWorkspace();
	const workspaceRoot = getWorkspaceRoot();

	let memoryBankPath: string | null = null;
	if (hasWs) {
		try {
			memoryBankPath = getMemoryBankPath();
		} catch {
			// Ignore error, memoryBankPath stays null
		}
	}

	return {
		hasWorkspace: hasWs,
		workspaceRoot,
		memoryBankPath,
		folderCount: workspaceFolders?.length ?? 0,
	};
}

// === Factory Functions ===

/**
 * Create workspace manager with all necessary setup
 */
export function createWorkspaceManager(context: vscode.ExtensionContext, logger: Logger) {
	const cursorRulesService = new CursorRulesService(context);
	const fileOperationManager = new FileOperationManager(logger, getMemoryBankPath());

	// Setup configuration listeners
	setupConfigurationListeners(context, logger);

	// Return workspace utilities
	return {
		cursorRulesService,
		fileOperationManager,
		getMemoryBankPath,
		getWorkspaceRoot,
		hasWorkspace,
		createMemoryBankRulesIfNotExists: () =>
			createMemoryBankRulesIfNotExists(cursorRulesService, logger, fileOperationManager),
	};
}
