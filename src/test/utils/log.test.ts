import { standardAfterEach, standardBeforeEach } from "@test-utils/index.js"; // Import helpers
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel, Logger } from "../../utils/vscode/vscode-logger.js";

// This file requires a specific, local mock for the output channel
// to spy on its methods. The global mock is not sufficient here.
const mockOutputChannel = {
	appendLine: vi.fn(),
	show: vi.fn(),
	dispose: vi.fn(),
};

// We only mock the method we need to control for this test.
// The rest of the vscode mock comes from the global setup.
vi.mock("vscode", async () => {
	const { window: originalWindow } = await import("../../../src/test/__mocks__/vscode.js");
	return {
		...(await import("../../../src/test/__mocks__/vscode.js")),
		window: {
			...originalWindow,
			createOutputChannel: vi.fn(() => mockOutputChannel),
		},
	};
});

describe("Logger", () => {
	let logger: Logger;

	beforeEach(() => {
		standardBeforeEach();
		vi.clearAllMocks(); // Clear mocks before each test
		// Get singleton instance for tests
		logger = Logger.getInstance();
	});

	afterEach(() => {
		standardAfterEach();
		vi.restoreAllMocks();
	});

	it("should set log level correctly", () => {
		logger.setLevel(LogLevel.Debug);
		expect((logger as any).level).toBe(LogLevel.Debug);
	});

	it("should log info messages", () => {
		// Test that calling info doesn't throw and properly invokes the output channel
		expect(() => logger.info("Test info message")).not.toThrow();
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
			expect.stringContaining("INFO Test info message"),
		);
	});

	it("should log warning messages", () => {
		expect(() => logger.warn("Test warning message")).not.toThrow();
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
			expect.stringContaining("WARNING Test warning message"),
		);
	});

	it("should log error messages", () => {
		expect(() => logger.error("Test error message")).not.toThrow();
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
			expect.stringContaining("ERROR Test error message"),
		);
	});

	it("should log debug messages only when log level is Debug", () => {
		logger.setLevel(LogLevel.Info);
		logger.debug("Should not be logged");
		expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
			expect.stringContaining("DEBUG Should not be logged"),
		);

		// Clear previous calls
		vi.clearAllMocks();

		logger.setLevel(LogLevel.Debug);
		logger.debug("Should be logged");
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
			expect.stringContaining("DEBUG Should be logged"),
		);
	});

	it("should handle metadata in logs", () => {
		const meta = { key: "value" };
		logger.info("Test with meta", meta);
		expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
			expect.stringContaining('Test with meta {"key":"value"}'),
		);
	});

	it("should show output channel", () => {
		logger.showOutput();
		expect(mockOutputChannel.show).toHaveBeenCalled();
	});
});
