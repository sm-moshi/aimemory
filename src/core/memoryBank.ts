import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import type { Stats } from "node:fs";
import * as path from "node:path";
import type { MemoryBank, MemoryBankFile } from "../types/types.js";
import { MemoryBankFileType } from "../types/types.js";
import { CursorRulesService } from "../lib/cursor-rules-service.js";
import {
  CURSOR_MEMORY_BANK_FILENAME,
  CURSOR_MEMORY_BANK_RULES_FILE,
} from "../lib/cursor-rules.js";
import { Logger, LogLevel } from '../utils/log.js';
import { getTemplateForFileType } from "../lib/memoryBankTemplates.js";

export class MemoryBankService implements MemoryBank {
  private _memoryBankFolder: string;
  files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
  private cursorRulesService: CursorRulesService;
  private ready = false;

  constructor(private context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folder found");
    }
    this._memoryBankFolder = path.join(
      workspaceFolders[0].uri.fsPath,
      "memory-bank"
    );
    this.cursorRulesService = new CursorRulesService(this.context);
  }

  async createMemoryBankRulesIfNotExists(): Promise<void> {
    await this.cursorRulesService.createRulesFile(
      CURSOR_MEMORY_BANK_FILENAME,
      CURSOR_MEMORY_BANK_RULES_FILE
    );
  }

  async getIsMemoryBankInitialized(): Promise<boolean> {
    try {
      Logger.getInstance().info('Checking if memory bank is initialised...');

      // Check if root memory bank folder exists
      const isDirectoryExists = await fs.stat(this._memoryBankFolder).then(stat => stat.isDirectory()).catch(() => false);
      if (!isDirectoryExists) {
        Logger.getInstance().info('Memory bank folder does not exist.');
        return false;
      }

      // Check each required file in its proper location
      for (const fileType of Object.values(MemoryBankFileType)) {
        // Skip legacy flat files during initialization check
        if (fileType.includes('/')) {  // Only check modular files
          const filePath = path.join(this._memoryBankFolder, fileType);
          const exists = await fs.stat(filePath).then(stat => stat.isFile()).catch(() => false);
          Logger.getInstance().info(`Checked file: ${fileType} - Exists: ${exists}`);
          if (!exists) {
            return false;
          }
        }
      }

      Logger.getInstance().info('Memory bank is initialised.');
      return true;
    } catch (err) {
      Logger.getInstance().info(`Error checking memory bank initialisation: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  async initializeFolders(): Promise<void> {
    // Ensure all required subfolders exist
    const subfolders = [
      '', // root for legacy files
      'core',
      'systemPatterns',
      'techContext',
      'progress',
    ];
    for (const subfolder of subfolders) {
      const folderPath = path.join(this._memoryBankFolder, subfolder);
      await fs.mkdir(folderPath, { recursive: true });
    }
  }

  /**
   * Loads all memory bank files asynchronously, creating them from template if missing.
   * Sets the ready state accordingly.
   * Returns an array of created file types if self-healing occurred.
   */
  async loadFiles(): Promise<MemoryBankFileType[]> {
    this.files.clear();
    Logger.getInstance().info('Loading all memory bank files...');
    const createdFiles: MemoryBankFileType[] = [];
    try {
      for (const fileType of Object.values(MemoryBankFileType)) {
        // Only process modular files (skip legacy unless migrating)
        const filePath = path.join(this._memoryBankFolder, fileType);
        // Ensure parent folder exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        let content: string;
        let stats: Stats;
        try {
          content = await fs.readFile(filePath, "utf-8");
          stats = await fs.stat(filePath);
          Logger.getInstance().info(`Loaded file: ${fileType}`);
        } catch {
          // File missing: create from template
          content = getTemplateForFileType(fileType as MemoryBankFileType);
          await fs.writeFile(filePath, content);
          stats = await fs.stat(filePath);
          createdFiles.push(fileType as MemoryBankFileType);
          Logger.getInstance().info(`Created missing file from template: ${fileType}`);
        }
        this.files.set(fileType as MemoryBankFileType, {
          type: fileType as MemoryBankFileType,
          content,
          lastUpdated: stats.mtime,
        });
      }
      this.ready = true;
      if (createdFiles.length > 0) {
        const msg = `Self-healing: Created missing files: ${createdFiles.join(", ")}`;
        Logger.getInstance().info(msg);
        vscode.window.showInformationMessage(`Memory Bank repaired: ${createdFiles.length} file(s) created.`, { modal: false });
      }
      Logger.getInstance().info('Memory bank initialised successfully.');
      return createdFiles;
    } catch (err) {
      this.ready = false;
      Logger.getInstance().info(`Error loading memory bank files: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  /**
   * Returns true if the memory bank is ready (all files loaded and available).
   */
  isReady(): boolean {
    return this.ready;
  }

  getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
    Logger.getInstance().info(`getFile called for: ${type}`);
    return this.files.get(type);
  }

  async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
    const filePath = path.join(this._memoryBankFolder, type);
    try {
      Logger.getInstance().info(`Updating file: ${type}`);
      await fs.writeFile(filePath, content);
      this.files.set(type, {
        type,
        content,
        lastUpdated: new Date(),
      });
      Logger.getInstance().info(`File updated: ${type}`);
    } catch (err) {
      Logger.getInstance().info(`Error updating memory bank file ${type}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  getAllFiles(): MemoryBankFile[] {
    Logger.getInstance().info('getAllFiles called.');
    return Array.from(this.files.values());
  }

  getFilesWithFilenames(): string {
    Logger.getInstance().info('getFilesWithFilenames called.');
    return Array.from(this.files.values())
      .map(
        (file) =>
          `${file.type}:\nlast updated:${file.lastUpdated}\n\n${file.content}`
      )
      .join("\n\n");
  }

  async checkHealth(): Promise<string> {
    const issues: string[] = [];
    // Check root folder
    try {
      await fs.stat(this._memoryBankFolder);
    } catch {
      issues.push(`Missing folder: ${this._memoryBankFolder}`);
    }
    // Check all required files
    for (const fileType of Object.values(MemoryBankFileType)) {
      if (fileType.includes('/')) {
        const filePath = path.join(this._memoryBankFolder, fileType);
        try {
          await fs.access(filePath);
        } catch {
          issues.push(`Missing or unreadable: ${fileType}`);
        }
      }
    }
    if (issues.length === 0) {
      return "Memory Bank Health: ✅ All files and folders are present and readable.";
    }
    return `Memory Bank Health: ❌ Issues found:
${issues.join("\n")}`;
  }
}
