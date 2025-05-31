import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel, Logger } from "../../utils/log.js";

// Mock vscode OutputChannel
const appendLine = vi.fn();
const show = vi.fn();
vi.mock("vscode", () => ({
	window: {
		createOutputChannel: vi.fn(() => ({ appendLine, show })),
	},
}));

describe("Logger", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns a singleton instance", () => {
		const logger1 = Logger.getInstance();
		const logger2 = Logger.getInstance();
		expect(logger1).toBe(logger2);
	});

	it("logs info messages at Info level", () => {
		const logger = Logger.getInstance();
		logger.setLevel(LogLevel.Info);
		logger.info("test info");
		expect(appendLine).toHaveBeenCalled();
	});

	it("does not log debug messages at Info level", () => {
		const logger = Logger.getInstance();
		logger.setLevel(LogLevel.Info);
		logger.debug("test debug");
		expect(appendLine).not.toHaveBeenCalled();
	});

	it("shows the output channel", () => {
		const logger = Logger.getInstance();
		logger.showOutput();
		expect(show).toHaveBeenCalled();
	});
});
