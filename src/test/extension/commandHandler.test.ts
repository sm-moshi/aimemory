import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandHandler } from "../../commandHandler.js";
import { MemoryBankFileType } from "../../types/index.js";

const mockMemoryBank = {
	getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: true }),
	loadFiles: vi.fn().mockResolvedValue({ success: true, data: [] }),
	getAllFiles: vi.fn().mockReturnValue([]),
	initializeFolders: vi.fn().mockResolvedValue({ success: true }),
	checkHealth: vi.fn().mockResolvedValue({
		success: true,
		data: "Memory Bank Health: ✅ All files and folders are present and readable.",
	}),
};
const mockMcpServer = {
	getMemoryBank: () => mockMemoryBank,
	updateMemoryBankFile: vi.fn().mockResolvedValue(undefined),
};

// Minimal type for MemoryBankMCPServer for testing
type MemoryBankMCPServer = {
	getMemoryBank: () => typeof mockMemoryBank;
	updateMemoryBankFile: (fileType: string, content: string) => Promise<void>;
};

describe("CommandHandler", () => {
	let handler: CommandHandler;
	beforeEach(() => {
		vi.clearAllMocks();
		handler = new CommandHandler(mockMcpServer as any);
	});

	describe("processMemoryCommand", () => {
		it("returns undefined for non-memory commands", async () => {
			const result = await handler.processMemoryCommand("/foo bar");
			expect(result).toBeUndefined();
		});

		it("returns undefined for commands that don't start with /memory", async () => {
			const result = await handler.processMemoryCommand("memory help");
			expect(result).toBeUndefined();
		});

		it("returns help text when no command is provided", async () => {
			const result = await handler.processMemoryCommand("/memory");
			expect(result).toContain("AI Memory Bank Commands");
		});

		it("returns help text when empty command is provided", async () => {
			const result = await handler.processMemoryCommand("/memory ");
			expect(result).toContain("AI Memory Bank Commands");
		});

		it("returns help text for /memory help", async () => {
			const result = await handler.processMemoryCommand("/memory help");
			expect(result).toContain("AI Memory Bank Commands");
			expect(result).toContain("/memory status");
			expect(result).toContain("/memory update");
		});

		describe("status command", () => {
			it("returns initialized status when memory bank is ready", async () => {
				mockMemoryBank.getAllFiles.mockReturnValue([
					{
						type: MemoryBankFileType.ProjectBrief,
						content: "test",
						lastUpdated: new Date(),
					},
					{
						type: MemoryBankFileType.SystemPatternsArchitecture,
						content: "test",
						lastUpdated: null,
					},
				]);

				const result = await handler.processMemoryCommand("/memory status");
				expect(result).toContain("Memory Bank Status: Initialized");
				expect(result).toContain("Core Files:");
				expect(result).toContain("System Patterns:");
			});

			it("returns not initialized status when memory bank is not ready", async () => {
				mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
					success: true,
					data: false,
				});

				const result = await handler.processMemoryCommand("/memory status");
				expect(result).toContain("Memory Bank Status: Not initialized");
				expect(result).toContain("Use the initialize-memory-bank tool");
			});

			it("shows self-healing message when files were created", async () => {
				mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
					success: true,
					data: true,
				});
				mockMemoryBank.loadFiles.mockResolvedValue({
					success: true,
					data: ["core/projectbrief.md", "progress/current.md"],
				});

				const result = await handler.processMemoryCommand("/memory status");
				expect(result).toContain("[Self-healing] Created missing files:");
				expect(result).toContain("core/projectbrief.md, progress/current.md");
			});

			it("categorizes files correctly", async () => {
				mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
					success: true,
					data: true,
				});
				mockMemoryBank.loadFiles.mockResolvedValue({ success: true, data: [] });
				mockMemoryBank.getAllFiles.mockReturnValue([
					{
						type: "core/projectbrief.md",
						content: "test",
						lastUpdated: new Date("2024-01-01"),
					},
					{
						type: "systemPatterns/architecture.md",
						content: "test",
						lastUpdated: new Date("2024-01-02"),
					},
					{
						type: "techContext/stack.md",
						content: "test",
						lastUpdated: new Date("2024-01-03"),
					},
					{
						type: "progress/current.md",
						content: "test",
						lastUpdated: new Date("2024-01-04"),
					},
					{ type: "legacy.md", content: "test", lastUpdated: new Date("2024-01-05") },
				]);

				const result = await handler.processMemoryCommand("/memory status");
				expect(result).toContain("Core Files:");
				expect(result).toContain("System Patterns:");
				expect(result).toContain("Tech Context:");
				expect(result).toContain("Progress:");
				expect(result).toContain("Legacy Files:");
			});
		});

		describe("update command", () => {
			it("returns error when no file type is provided", async () => {
				const result = await handler.processMemoryCommand("/memory update");
				expect(result).toContain("Error: /memory update requires a file type argument");
				expect(result).toContain("Usage: /memory update <fileType> <content>");
			});

			it("returns error when no content is provided", async () => {
				const result = await handler.processMemoryCommand(
					"/memory update core/projectbrief.md",
				);
				expect(result).toContain("Error: /memory update requires content");
				expect(result).toContain("Usage: /memory update <fileType> <content>");
			});

			it("successfully updates file with content", async () => {
				const result = await handler.processMemoryCommand(
					"/memory update core/projectbrief.md This is new content",
				);
				expect(result).toBe("Successfully updated core/projectbrief.md");
				expect(mockMcpServer.updateMemoryBankFile).toHaveBeenCalledWith(
					"core/projectbrief.md",
					"This is new content",
				);
			});

			it("handles multi-word content correctly", async () => {
				const result = await handler.processMemoryCommand(
					"/memory update core/projectbrief.md This is a longer content with multiple words",
				);
				expect(result).toBe("Successfully updated core/projectbrief.md");
				expect(mockMcpServer.updateMemoryBankFile).toHaveBeenCalledWith(
					"core/projectbrief.md",
					"This is a longer content with multiple words",
				);
			});

			it("handles update errors", async () => {
				mockMcpServer.updateMemoryBankFile.mockRejectedValue(new Error("Update failed"));

				const result = await handler.processMemoryCommand(
					"/memory update core/projectbrief.md content",
				);
				expect(result).toContain("Error updating core/projectbrief.md: Update failed");
			});

			it("handles non-Error update failures", async () => {
				mockMcpServer.updateMemoryBankFile.mockRejectedValue("String error");

				const result = await handler.processMemoryCommand(
					"/memory update core/projectbrief.md content",
				);
				expect(result).toContain("Error updating core/projectbrief.md: String error");
			});
		});

		describe("initialize command", () => {
			it("successfully initializes memory bank with 'initialize'", async () => {
				const result = await handler.processMemoryCommand("/memory initialize");
				expect(result).toBe("Memory bank initialised successfully.");
				expect(mockMemoryBank.initializeFolders).toHaveBeenCalled();
				expect(mockMemoryBank.loadFiles).toHaveBeenCalled();
			});

			it("successfully initializes memory bank with 'init' alias", async () => {
				const result = await handler.processMemoryCommand("/memory init");
				expect(result).toBe("Memory bank initialised successfully.");
				expect(mockMemoryBank.initializeFolders).toHaveBeenCalled();
				expect(mockMemoryBank.loadFiles).toHaveBeenCalled();
			});

			it("handles initialization errors", async () => {
				mockMemoryBank.initializeFolders.mockRejectedValue(new Error("Init failed"));

				const result = await handler.processMemoryCommand("/memory initialize");
				expect(result).toContain("Error initialising memory bank: Init failed");
			});

			it("handles non-Error initialization failures", async () => {
				mockMemoryBank.initializeFolders.mockResolvedValue({ success: true });
				mockMemoryBank.loadFiles.mockRejectedValue(new Error("Load failed"));

				const result = await handler.processMemoryCommand("/memory init");
				expect(result).toContain("Error initialising memory bank: Load failed");
			});
		});

		describe("health command", () => {
			it("returns health report", async () => {
				const result = await handler.processMemoryCommand("/memory health");
				expect(result).toBe(
					"Memory Bank Health: ✅ All files and folders are present and readable.",
				);
				expect(mockMemoryBank.checkHealth).toHaveBeenCalled();
			});

			it("handles health check errors", async () => {
				mockMemoryBank.checkHealth.mockResolvedValue({
					success: false,
					error: new Error("Health check failed"),
				});

				const result = await handler.processMemoryCommand("/memory health");
				expect(result).toContain("Error checking memory bank health: Health check failed");
			});
		});

		it("returns error for unsupported command", async () => {
			const result = await handler.processMemoryCommand("/memory foo");
			expect(result).toContain('Command "foo" is not supported.');
			expect(result).toContain("AI Memory Bank Commands");
		});

		it("handles general processing errors", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: false,
				error: new Error("General error"),
			});

			const result = await handler.processMemoryCommand("/memory status");
			expect(result).toContain(
				"Error checking memory bank initialization status: General error",
			);
		});
	});

	describe("processModesCommand", () => {
		it("returns undefined for non-plan commands", async () => {
			const result = await handler.processModesCommand("/memory help");
			expect(result).toBeUndefined();
		});

		it("returns empty string for /plan command (placeholder)", async () => {
			const result = await handler.processModesCommand("/plan");
			expect(result).toBe("");
		});
	});
});
