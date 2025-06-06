import { type TestLogger, createTestLogger } from "@/utils/logging.js";
import { standardAfterEach, standardBeforeEach } from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Centralized Logging System", () => {
	let testLogger: TestLogger;

	beforeEach(() => {
		standardBeforeEach();
		testLogger = createTestLogger();
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("should create test logger and capture logs", () => {
		testLogger.info("Test info message");
		testLogger.warn("Test warning message");
		testLogger.error("Test error message");

		expect(testLogger.logs).toHaveLength(3);
		expect(testLogger.logs[0]).toEqual({
			level: "INFO",
			message: "Test info message",
		});
		expect(testLogger.logs[1]).toEqual({
			level: "WARN",
			message: "Test warning message",
		});
		expect(testLogger.logs[2]).toEqual({
			level: "ERROR",
			message: "Test error message",
		});
	});

	it("should handle context in test logs", () => {
		const context = { component: "test", operation: "validate" };
		testLogger.info("Test with context", context);

		expect(testLogger.logs).toHaveLength(1);
		expect(testLogger.logs[0]).toEqual({
			level: "INFO",
			message: "Test with context",
			context,
		});
	});

	it("should clear logs", () => {
		testLogger.info("Test message");
		expect(testLogger.logs).toHaveLength(1);

		testLogger.clear();
		expect(testLogger.logs).toHaveLength(0);
	});

	it("should log debug and trace messages", () => {
		testLogger.debug("Debug message");
		testLogger.trace("Trace message");

		expect(testLogger.logs).toHaveLength(2);
		expect(testLogger.logs[0]?.level).toBe("DEBUG");
		expect(testLogger.logs[1]?.level).toBe("TRACE");
	});
});
