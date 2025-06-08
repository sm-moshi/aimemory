import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandHandler } from "../../app/extension/commandHandler";
import {
	createMockMCPServer,
	createMockMemoryBankWithDefaults,
	standardAfterEach,
	standardBeforeEach,
} from "../test-utils";

// Use centralized mocks
const mockMemoryBank = createMockMemoryBankWithDefaults();
const mockMCPServer = createMockMCPServer();

// Connect the mocks
mockMCPServer.getMemoryBank.mockReturnValue(mockMemoryBank);

describe("CommandHandler", () => {
	let commandHandler: CommandHandler;

	beforeEach(() => {
		standardBeforeEach();
		commandHandler = new CommandHandler(mockMCPServer as any);
		vi.clearAllMocks();
	});

	afterEach(standardAfterEach);

	describe("processMemoryCommand", () => {
		it("should return undefined for non-memory commands", async () => {
			const result = await commandHandler.processMemoryCommand("some random text");
			expect(result).toBeUndefined();
		});

		it("should return help text for invalid memory commands", async () => {
			const result = await commandHandler.processMemoryCommand("/memory");
			expect(result).toContain("AI Memory Bank Commands:");
		});

		it("should perform health check on '/memory health' command", async () => {
			mockMemoryBank.checkHealth.mockResolvedValue({
				success: true,
				data: "Memory bank is healthy",
			});

			const result = await commandHandler.processMemoryCommand("/memory health");
			expect(result).toBe("Memory bank is healthy");
		});

		it("should handle failed health check", async () => {
			mockMemoryBank.checkHealth.mockResolvedValue({
				success: false,
				error: "Health check failed",
			});

			const result = await commandHandler.processMemoryCommand("/memory health");
			expect(result).toContain("Error checking memory bank health");
		});

		it("should initialize memory bank on '/memory init' command", async () => {
			mockMemoryBank.initializeFolders.mockResolvedValue({ success: true });
			mockMemoryBank.loadFiles.mockResolvedValue({ success: true });

			const result = await commandHandler.processMemoryCommand("/memory init");
			expect(mockMemoryBank.initializeFolders).toHaveBeenCalled();
			expect(mockMemoryBank.loadFiles).toHaveBeenCalled();
			expect(result).toBe("Memory bank initialised successfully.");
		});

		it("should handle status command when not initialized", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: false,
			});

			const result = await commandHandler.processMemoryCommand("/memory status");
			expect(result).toContain("Memory Bank Status: Not initialized");
		});

		it("should handle status command when initialized", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});
			mockMemoryBank.loadFiles.mockResolvedValue({ success: true, data: [] });
			mockMemoryBank.getAllFiles.mockReturnValue([]);

			const result = await commandHandler.processMemoryCommand("/memory status");
			expect(result).toContain("Memory Bank Status: Initialized");
		});

		it("should handle update command with valid arguments", async () => {
			mockMCPServer.updateMemoryBankFile.mockResolvedValue(undefined);

			const result = await commandHandler.processMemoryCommand("/memory update projectbrief.md New content");
			expect(mockMCPServer.updateMemoryBankFile).toHaveBeenCalledWith("projectbrief.md", "New content");
			expect(result).toBe("Successfully updated projectbrief.md");
		});

		it("should handle update command with missing arguments", async () => {
			const result = await commandHandler.processMemoryCommand("/memory update");
			expect(result).toContain("Error: /memory update requires a file type argument");
		});

		it("should handle write command with valid arguments", async () => {
			mockMemoryBank.writeFileByPath.mockResolvedValue({ success: true });

			const result = await commandHandler.processMemoryCommand("/memory write test.md Test content");
			expect(mockMemoryBank.writeFileByPath).toHaveBeenCalledWith("test.md", "Test content");
			expect(result).toBe("Successfully wrote to test.md");
		});

		it("should handle write command with missing arguments", async () => {
			const result = await commandHandler.processMemoryCommand("/memory write test.md");
			expect(result).toContain("Error: /memory write requires a relative path and content");
		});

		it("should handle help command", async () => {
			const result = await commandHandler.processMemoryCommand("/memory help");
			expect(result).toContain("AI Memory Bank Commands:");
		});

		it("should handle unknown commands", async () => {
			const result = await commandHandler.processMemoryCommand("/memory unknown");
			expect(result).toContain('Command "unknown" is not supported');
		});
	});
});
