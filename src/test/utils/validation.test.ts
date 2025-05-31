import { describe, expect, it } from "vitest";
import { z } from "zod"; // TODO: Why is this unused?
import type { MemoryBankFileType } from "../../types/core.js";
import { ValidationError } from "../../types/errorHandling.js"; // TODO: Why is this unused?
import {
	MemoryBankFileTypeSchema,
	UpdateMemoryBankFileSchema,
	isSafePath,
	isValidFileType,
	validateMCPToolParams,
	validateWebviewMessage,
} from "../../types/validation.js";
import {
	auditInput,
	sanitizeFileContent,
	sanitizePath,
	sanitizeUserInput,
	validateCommand,
	validateCommandArgs,
	validateMemoryBankPath,
	validatePort,
	validateProcessConfig,
} from "../../utils/securityValidation.js";

describe("Validation Schemas", () => {
	describe("MemoryBankFileTypeSchema", () => {
		it("should validate correct file types", () => {
			expect(() => MemoryBankFileTypeSchema.parse("core/projectBrief.md")).not.toThrow();
			expect(() => MemoryBankFileTypeSchema.parse("core/productContext.md")).not.toThrow();
			expect(() => MemoryBankFileTypeSchema.parse("core/activeContext.md")).not.toThrow();
		});

		it("should reject invalid file types", () => {
			expect(() => MemoryBankFileTypeSchema.parse("invalidType")).toThrow();
			expect(() => MemoryBankFileTypeSchema.parse("")).toThrow();
			expect(() => MemoryBankFileTypeSchema.parse(null)).toThrow();
		});
	});

	describe("UpdateMemoryBankFileSchema", () => {
		it("should validate correct update parameters", () => {
			const validParams = {
				fileType: "core/projectBrief.md" as MemoryBankFileType,
				content: "Test content",
			};
			expect(() => UpdateMemoryBankFileSchema.parse(validParams)).not.toThrow();
		});

		it("should reject invalid parameters", () => {
			expect(() =>
				UpdateMemoryBankFileSchema.parse({
					fileType: "invalid",
					content: "Test",
				}),
			).toThrow();
		});

		it("should reject content exceeding size limit", () => {
			const largeContent = "x".repeat(1024 * 1024 + 1);
			expect(() =>
				UpdateMemoryBankFileSchema.parse({
					fileType: "projectBrief",
					content: largeContent,
				}),
			).toThrow();
		});
	});

	describe("validateMCPToolParams", () => {
		it("should validate correct parameters", () => {
			const params = {
				fileType: "core/projectBrief.md" as MemoryBankFileType,
				content: "Test content",
			};
			const result = validateMCPToolParams(
				"update-memory-bank-file",
				params,
				UpdateMemoryBankFileSchema,
			);
			expect(result).toEqual(params);
		});

		it("should throw detailed error for invalid parameters", () => {
			const params = { invalid: "param" };
			expect(() =>
				validateMCPToolParams(
					"update-memory-bank-file",
					params,
					UpdateMemoryBankFileSchema,
				),
			).toThrow();
		});
	});

	describe("Type Guards", () => {
		it("isValidFileType should work correctly", () => {
			expect(isValidFileType("core/projectBrief.md")).toBe(true);
			expect(isValidFileType("invalidType")).toBe(false);
			expect(isValidFileType(null)).toBe(false);
		});

		it("isSafePath should work correctly", () => {
			expect(isSafePath("safe/path")).toBe(true);
			expect(isSafePath("../dangerous")).toBe(false);
			expect(isSafePath("/absolute")).toBe(false);
		});
	});
});

describe("Security Validation", () => {
	describe("sanitizePath", () => {
		it("should accept valid relative paths", () => {
			expect(sanitizePath("valid/path")).toBe("valid/path");
			expect(sanitizePath("file.txt")).toBe("file.txt");
		});

		it("should reject path traversal attempts", () => {
			expect(() => sanitizePath("../dangerous")).toThrow("Path traversal detected");
			expect(() => sanitizePath("valid/../dangerous")).toThrow("Path traversal detected");
		});

		it("should reject null bytes", () => {
			expect(() => sanitizePath("path\0injection")).toThrow("Path contains null bytes");
		});

		it("should reject absolute paths by default", () => {
			expect(() => sanitizePath("/absolute/path")).toThrow("Absolute paths not allowed");
		});

		it("should allow absolute paths with allowedRoot", () => {
			const result = sanitizePath("/test/path", "/test");
			expect(result).toBe("/test/path");
		});

		it("should prevent escaping allowedRoot", () => {
			expect(() => sanitizePath("../escape", "/test")).toThrow("Path traversal detected");
		});
	});

	describe("validateMemoryBankPath", () => {
		it("should validate correct memory bank paths", () => {
			const result = validateMemoryBankPath("core/projectBrief.md", "/memory-bank");
			expect(result).toContain("core/projectBrief.md");
		});

		it("should reject dangerous paths", () => {
			expect(() => validateMemoryBankPath("../escape", "/memory-bank")).toThrow(
				"Invalid memory bank path",
			);
		});
	});

	describe("validateCommand", () => {
		it("should accept safe commands", () => {
			expect(validateCommand("node")).toBe("node");
			expect(validateCommand("npm install")).toBe("npm install");
		});

		it("should reject dangerous commands", () => {
			expect(() => validateCommand("rm -rf /")).toThrow();
			expect(() => validateCommand("node; rm -rf /")).toThrow();
			expect(() => validateCommand("node | cat")).toThrow();
		});

		it("should reject empty commands", () => {
			expect(() => validateCommand("")).toThrow("Command cannot be empty");
		});
	});

	describe("validateCommandArgs", () => {
		it("should accept safe argument arrays", () => {
			const args = ["--flag", "value"];
			expect(validateCommandArgs(args)).toEqual(args);
		});

		it("should reject non-array input", () => {
			expect(() => validateCommandArgs("not-array" as any)).toThrow(
				"Command arguments must be an array",
			);
		});

		it("should reject non-string arguments", () => {
			expect(() => validateCommandArgs([123] as any)).toThrow(
				"Command argument at index 0 must be a string",
			);
		});

		it("should reject dangerous arguments", () => {
			expect(() => validateCommandArgs(["--flag; rm -rf /"])).toThrow(
				"contains dangerous characters",
			);
			expect(() => validateCommandArgs(["--flag | cat"])).toThrow(
				"contains dangerous characters",
			);
		});
	});

	describe("validateProcessConfig", () => {
		it("should validate safe process configuration", () => {
			const config = {
				command: "node",
				args: ["--version"],
			};
			const result = validateProcessConfig(config);
			expect(result.command).toBe("node");
			expect(result.args).toEqual(["--version"]);
		});

		it("should reject invalid timeout", () => {
			const config = {
				command: "node",
				args: ["--version"],
				timeout: -1,
			};
			expect(() => validateProcessConfig(config)).toThrow(
				"Timeout must be a positive number",
			);
		});
	});

	describe("validatePort", () => {
		it("should accept valid port numbers", () => {
			expect(validatePort(8080)).toBe(8080);
			expect(validatePort(3000)).toBe(3000);
			expect(validatePort(65535)).toBe(65535);
		});

		it("should reject invalid port numbers", () => {
			expect(() => validatePort(0)).toThrow("Invalid port number");
			expect(() => validatePort(65536)).toThrow("Invalid port number");
			expect(() => validatePort(-1)).toThrow("Invalid port number");
		});
	});

	describe("sanitizeUserInput", () => {
		it("should sanitize user input correctly", () => {
			const input = "  Hello World  ";
			expect(sanitizeUserInput(input)).toBe("Hello World");
		});

		it("should remove control characters", () => {
			const input = "Hello\x00\x01World";
			const result = sanitizeUserInput(input);
			expect(result).toBe("HelloWorld");
		});

		it("should enforce length limits", () => {
			const longInput = "x".repeat(2000);
			const result = sanitizeUserInput(longInput, 100);
			expect(result.length).toBe(100);
		});

		it("should preserve valid whitespace", () => {
			const input = "Hello\tWorld\nNext Line";
			const result = sanitizeUserInput(input);
			expect(result).toBe("Hello\tWorld\nNext Line");
		});
	});

	describe("sanitizeFileContent", () => {
		it("should accept valid file content", () => {
			const content = "Valid file content";
			expect(sanitizeFileContent(content)).toBe(content);
		});

		it("should reject oversized content", () => {
			const largeContent = "x".repeat(1024 * 1024 + 1);
			expect(() => sanitizeFileContent(largeContent)).toThrow(
				"File content exceeds maximum size",
			);
		});

		it("should remove null bytes", () => {
			const content = "Content\x00with\x00nulls";
			expect(() => sanitizeFileContent(content)).toThrow("File content contains null bytes");
		});
	});

	describe("auditInput", () => {
		it("should pass clean input", () => {
			const result = auditInput("clean input", "test");
			expect(result.isSecure).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect script injection attempts", () => {
			const result = auditInput("<script>alert('xss')</script>", "test");
			expect(result.isSecure).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should detect path traversal", () => {
			const result = auditInput("../../../etc/passwd", "test");
			expect(result.isSecure).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should detect shell metacharacters", () => {
			const result = auditInput("command; rm -rf /", "test");
			expect(result.isSecure).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should detect javascript protocol", () => {
			// Split to avoid SonarQube security warning about literal javascript: URLs
			const maliciousInput = "javascript" + ":alert('xss')";
			const result = auditInput(maliciousInput, "test");
			expect(result.isSecure).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});
});

describe("Webview Message Validation", () => {
	it("should validate correct webview messages", () => {
		const message = {
			type: "getFiles",
			id: "test-id",
		};
		expect(() => validateWebviewMessage(message)).not.toThrow();
	});

	it("should reject invalid message types", () => {
		const message = {
			type: "invalidType",
			id: "test-id",
		};
		expect(() => validateWebviewMessage(message)).toThrow();
	});

	it("should handle messages without payload", () => {
		const message = {
			type: "getServerStatus",
		};
		expect(() => validateWebviewMessage(message)).not.toThrow();
	});
});
