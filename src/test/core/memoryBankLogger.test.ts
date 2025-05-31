import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MemoryBankLoggerFactory,
	createStderrLogger,
} from "../../infrastructure/logging/memory-bank-logger.js";

describe("MemoryBankLogger", () => {
	let stderrSpy: any;

	beforeEach(() => {
		stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		stderrSpy.mockRestore();
	});

	describe("MemoryBankLoggerFactory", () => {
		describe("createSimpleLogger", () => {
			it("should create a simple logger that implements MemoryBankLogger interface", () => {
				const logger = MemoryBankLoggerFactory.createSimpleLogger();

				expect(logger).toHaveProperty("info");
				expect(logger).toHaveProperty("error");
				expect(logger).toHaveProperty("warn");
				expect(logger).toHaveProperty("debug");
			});

			it("should log messages to stderr with correct format", () => {
				const logger = MemoryBankLoggerFactory.createSimpleLogger();

				logger.info("test info message");
				logger.error("test error message");
				logger.warn("test warning message");
				logger.debug("test debug message");

				expect(stderrSpy).toHaveBeenCalledTimes(4);
				expect(stderrSpy).toHaveBeenNthCalledWith(1, "[INFO] test info message\n");
				expect(stderrSpy).toHaveBeenNthCalledWith(2, "[ERROR] test error message\n");
				expect(stderrSpy).toHaveBeenNthCalledWith(3, "[WARN] test warning message\n");
				expect(stderrSpy).toHaveBeenNthCalledWith(4, "[DEBUG] test debug message\n");
			});
		});

		describe("createConsoleLogger", () => {
			it("should create a console-compatible logger", () => {
				const logger = MemoryBankLoggerFactory.createConsoleLogger();

				// Should have all Console interface methods
				expect(logger).toHaveProperty("log");
				expect(logger).toHaveProperty("info");
				expect(logger).toHaveProperty("error");
				expect(logger).toHaveProperty("warn");
				expect(logger).toHaveProperty("debug");
				expect(logger).toHaveProperty("table");
				expect(logger).toHaveProperty("time");
				expect(logger).toHaveProperty("timeEnd");
				expect(logger).toHaveProperty("assert");
			});

			it("should log messages to stderr with correct format", () => {
				const logger = MemoryBankLoggerFactory.createConsoleLogger();

				logger.info("test message");
				logger.error("error message");

				expect(stderrSpy).toHaveBeenCalledTimes(2);
				expect(stderrSpy).toHaveBeenNthCalledWith(1, "[INFO] test message\n");
				expect(stderrSpy).toHaveBeenNthCalledWith(2, "[ERROR] error message\n");
			});

			it("should handle multiple arguments", () => {
				const logger = MemoryBankLoggerFactory.createConsoleLogger();

				logger.info("test", "multiple", "arguments", 123);

				expect(stderrSpy).toHaveBeenCalledWith("[INFO] test multiple arguments 123\n");
			});

			it("should handle table method", () => {
				const logger = MemoryBankLoggerFactory.createConsoleLogger();

				const testData = { key: "value", number: 42 };
				logger.table(testData);

				expect(stderrSpy).toHaveBeenCalledWith(
					`${JSON.stringify(testData, undefined, 2)}\n`,
				);
			});

			it("should handle assert method", () => {
				const logger = MemoryBankLoggerFactory.createConsoleLogger();

				// True assertion should not log
				logger.assert(true, "should not appear");
				expect(stderrSpy).not.toHaveBeenCalled();

				// False assertion should log
				logger.assert(false, "assertion failed");
				expect(stderrSpy).toHaveBeenCalledWith("[ASSERT] assertion failed\n");
			});
		});

		describe("createLogger", () => {
			it("should create simple logger by default", () => {
				const logger = MemoryBankLoggerFactory.createLogger();
				expect(logger).toHaveProperty("info");
				expect(logger).not.toHaveProperty("table"); // Simple logger doesn't have table
			});

			it("should create simple logger when type is 'simple'", () => {
				const logger = MemoryBankLoggerFactory.createLogger("simple");
				expect(logger).toHaveProperty("info");
				expect(logger).not.toHaveProperty("table");
			});

			it("should create console logger when type is 'console'", () => {
				const logger = MemoryBankLoggerFactory.createLogger("console");
				expect(logger).toHaveProperty("info");
				expect(logger).toHaveProperty("table"); // Console logger has table
			});
		});
	});

	describe("createStderrLogger (legacy function)", () => {
		it("should create a console-compatible logger for backward compatibility", () => {
			const logger = createStderrLogger();

			expect(logger).toHaveProperty("log");
			expect(logger).toHaveProperty("info");
			expect(logger).toHaveProperty("error");
			expect(logger).toHaveProperty("warn");
			expect(logger).toHaveProperty("debug");
			expect(logger).toHaveProperty("table");
		});

		it("should maintain the same behavior as the original function", () => {
			const logger = createStderrLogger();

			logger.info("legacy test");
			logger.error("legacy error");

			expect(stderrSpy).toHaveBeenCalledTimes(2);
			expect(stderrSpy).toHaveBeenNthCalledWith(1, "[INFO] legacy test\n");
			expect(stderrSpy).toHaveBeenNthCalledWith(2, "[ERROR] legacy error\n");
		});
	});
});
