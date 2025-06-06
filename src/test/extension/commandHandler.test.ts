import { CommandHandler } from "@/app/extension/commandHandler.js";
import { MemoryBankFileType } from "@/types/index.js";
import {
	createMockMCPServer,
	createMockMemoryBankWithDefaults,
	createMockWebviewManager,
	mockWindow,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Use centralized mocks
const mockMemoryBank = createMockMemoryBankWithDefaults();
const mockMCPServer = createMockMCPServer();
const mockWebviewManager = createMockWebviewManager();

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
		it("should initialize memory bank if not initialized", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: false,
			});
			mockMemoryBank.initialize.mockResolvedValue({ success: true });
			await commandHandler.processMemoryCommand("show");
			expect(mockMemoryBank.initialize).toHaveBeenCalled();
		});

		it("should show webview on 'show' command", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});
			await commandHandler.processMemoryCommand("show");
			expect(mockWebviewManager.openWebview).toHaveBeenCalled();
		});

		it("should perform health check on 'healthCheck' command", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});
			mockMemoryBank.healthCheck.mockResolvedValue({ success: true });
			await commandHandler.processMemoryCommand("healthCheck");
			expect(mockMemoryBank.healthCheck).toHaveBeenCalled();
			expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
				"AI Memory Bank health check passed.",
			);
		});

		it("should handle failed health check", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});
			mockMemoryBank.healthCheck.mockResolvedValue({
				success: false,
				error: "Health check failed",
			});
			await commandHandler.processMemoryCommand("healthCheck");
			expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
				"AI Memory Bank health check failed: Health check failed",
			);
		});

		it("should create a new file on 'new' command", async () => {
			mockMemoryBank.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});
			mockMemoryBank.createFile.mockResolvedValue({ success: true });
			await commandHandler.processMemoryCommand("new");
			expect(mockMemoryBank.createFile).toHaveBeenCalledWith(
				MemoryBankFileType.ProgressCurrent,
				"",
			);
		});
	});
});
