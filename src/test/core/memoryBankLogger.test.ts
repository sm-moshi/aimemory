import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel } from "../../types/index";
import { createConsoleLogger, createLogger, createTestLogger } from "../../utils/logging";

describe("Centralized Logging System", () => {
	let stderrSpy: any;

	beforeEach(() => {
		// Use centralized stderr spying pattern
		stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		stderrSpy?.mockRestore();
	});

	describe("createLogger (automatic environment detection)", () => {
		it("should create a logger with the basic interface", () => {
			const logger = createLogger();

			expect(logger).toHaveProperty("info");
			expect(logger).toHaveProperty("error");
			expect(logger).toHaveProperty("warn");
			expect(logger).toHaveProperty("debug");
			expect(logger).toHaveProperty("trace");
		});

		it("should log messages with correct format", () => {
			const logger = createConsoleLogger();

			logger.info("test info message");
			logger.error("test error message");

			expect(stderrSpy).toHaveBeenCalledTimes(2);
			// Check that messages are logged (exact format may vary)
			expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("INFO"));
			expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test info message"));
		});
	});

	describe("createConsoleLogger", () => {
		it("should create a console logger with all methods", () => {
			const logger = createConsoleLogger();

			expect(logger).toHaveProperty("info");
			expect(logger).toHaveProperty("error");
			expect(logger).toHaveProperty("warn");
			expect(logger).toHaveProperty("debug");
			expect(logger).toHaveProperty("trace");
			expect(logger).toHaveProperty("setLevel");
		});

		it("should log messages to stderr with correct format", () => {
			const logger = createConsoleLogger();

			logger.info("test message");
			logger.error("error message");

			expect(stderrSpy).toHaveBeenCalledTimes(2);
			expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("INFO"));
			expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test message"));
		});

		it("should respect log levels", () => {
			const logger = createConsoleLogger({ level: LogLevel.Error });

			logger.debug("debug message");
			logger.info("info message");
			logger.error("error message");

			// Only error should be logged due to level setting
			expect(stderrSpy).toHaveBeenCalledTimes(1);
			expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("ERROR"));
		});

		it("should include component context when provided", () => {
			const logger = createConsoleLogger({ component: "TestComponent" });

			logger.info("test message");

			expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("TestComponent"));
		});
	});

	describe("createTestLogger", () => {
		it("should capture logs for testing", () => {
			const logger = createTestLogger();

			logger.info("test message");
			logger.error("error message");

			expect(logger.logs).toHaveLength(2);
			expect(logger.logs[0]).toEqual({
				level: "INFO",
				message: "test message",
			});
			expect(logger.logs[1]).toEqual({
				level: "ERROR",
				message: "error message",
			});
		});

		it("should support context in logs", () => {
			const logger = createTestLogger();

			logger.info("test message", { component: "TestComponent", operation: "test" });

			expect(logger.logs).toHaveLength(1);
			expect(logger.logs[0]).toEqual({
				level: "INFO",
				message: "test message",
				context: { component: "TestComponent", operation: "test" },
			});
		});

		it("should support clearing logs", () => {
			const logger = createTestLogger();

			logger.info("test message");
			expect(logger.logs).toHaveLength(1);

			logger.clear();
			expect(logger.logs).toHaveLength(0);
		});
	});
});
