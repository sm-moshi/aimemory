/**
 * VS Code Error Display Utilities
 *
 * Infrastructure layer for displaying errors in VS Code UI.
 * Depends on VS Code API and should only be used in extension context.
 */

import { formatErrorMessage } from "../utils/helpers"; // Adjusted import path

/**
 * VS Code-specific error display utility
 * Shows error message to user via VS Code's UI
 *
 * @param message - The error message to display
 * @param error - Optional error object for additional context
 */
export async function showVSCodeError(message: string, error?: unknown): Promise<void> {
	const { window } = await import("vscode");
	const fullMessage = error ? formatErrorMessage(message, error) : message;
	window.showErrorMessage(fullMessage);
}
