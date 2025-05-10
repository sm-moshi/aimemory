import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import type { Stats } from "node:fs";
import * as path from "node:path";
import type { MemoryBank, MemoryBankFile } from "./types";
import { MemoryBankFileType } from "./types";
import { CursorRulesService } from "./lib/cursor-rules-service";
import {
  CURSOR_MEMORY_BANK_FILENAME,
  CURSOR_MEMORY_BANK_RULES_FILE,
} from "./lib/cursor-rules";
import { getOutputChannel } from './extension';

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
      const isDirectoryExists = await fs.stat(this._memoryBankFolder).then(stat => stat.isDirectory()).catch(() => false);
      if (!isDirectoryExists) {return false;}
      for (const fileType of Object.values(MemoryBankFileType)) {
        const filePath = path.join(this._memoryBankFolder, fileType);
        const exists = await fs.stat(filePath).then(stat => stat.isFile()).catch(() => false);
        if (!exists) {return false;}
      }
      return true;
    } catch (err) {
      console.error("Error checking memory bank initialisation:", err);
      return false;
    }
  }

  async initializeFolders(): Promise<void> {
    await this.ensureMemoryBankFolder();
  }

  private async ensureMemoryBankFolder(): Promise<void> {
    try {
      await fs.mkdir(this._memoryBankFolder, { recursive: true });
    } catch (err) {
      console.error("Error ensuring memory bank folder:", err);
      throw err;
    }
  }

  /**
   * Loads all memory bank files asynchronously, creating them from template if missing.
   * Sets the ready state accordingly.
   */
  async loadFiles(): Promise<void> {
    this.files.clear();
    try {
      for (const fileType of Object.values(MemoryBankFileType)) {
        const filePath = path.join(this._memoryBankFolder, fileType);
        let content: string;
        let stats: Stats;
        try {
          content = await fs.readFile(filePath, "utf-8");
          stats = await fs.stat(filePath);
        } catch {
          // File missing: create from template
          content = MemoryBankService.getTemplateForFileType(fileType as MemoryBankFileType);
          await fs.writeFile(filePath, content);
          stats = await fs.stat(filePath);
        }
        this.files.set(fileType as MemoryBankFileType, {
          type: fileType as MemoryBankFileType,
          content,
          lastUpdated: stats.mtime,
        });
      }
      this.ready = true;
      getOutputChannel().appendLine('Memory bank initialised successfully.');
    } catch (err) {
      this.ready = false;
      console.error("Error loading memory bank files:", err);
      getOutputChannel().appendLine(`Error during memory bank initialisation: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  /**
   * Returns true if the memory bank is ready (all files loaded and available).
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Returns the template for a given file type.
   */
  static getTemplateForFileType(fileType: MemoryBankFileType): string {
    switch (fileType) {
      case MemoryBankFileType.ProjectBrief:
        return "# Project Brief\n\n*Foundation document that shapes all other files*\n\n## Core Requirements\n\n## Project Goals\n\n## Project Scope\n";
      case MemoryBankFileType.ProductContext:
        return "# Product Context\n\n## Why this project exists\n\n## Problems it solves\n\n## How it should work\n\n## User experience goals\n";
      case MemoryBankFileType.ActiveContext:
        return "# Active Context\n\n## Current work focus\n\n## Recent changes\n\n## Next steps\n\n## Active decisions and considerations\n";
      case MemoryBankFileType.SystemPatterns:
        return "# System Patterns\n\n## System architecture\n\n## Key technical decisions\n\n## Design patterns in use\n\n## Component relationships\n";
      case MemoryBankFileType.TechContext:
        return "# Tech Context\n\n## Technologies used\n\n## Development setup\n\n## Technical constraints\n\n## Dependencies\n";
      case MemoryBankFileType.Progress:
        return "# Progress\n\n## What works\n\n## What's left to build\n\n## Current status\n\n## Known issues\n";
      default:
        return "# Memory Bank File\n\n*This is a default template*\n";
    }
  }

  getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
    return this.files.get(type);
  }

  async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
    const filePath = path.join(this._memoryBankFolder, type);
    try {
      await fs.writeFile(filePath, content);
      this.files.set(type, {
        type,
        content,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error(`Error updating memory bank file ${type}:`, err);
      throw err;
    }
  }

  getAllFiles(): MemoryBankFile[] {
    return Array.from(this.files.values());
  }

  getFilesWithFilenames(): string {
    return Array.from(this.files.values())
      .map(
        (file) =>
          `${file.type}:\nlast updated:${file.lastUpdated}\n\n${file.content}`
      )
      .join("\n\n");
  }
}
