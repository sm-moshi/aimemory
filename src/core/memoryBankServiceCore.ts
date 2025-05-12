import * as fs from "node:fs/promises";
import type { Stats } from "node:fs";
import * as path from "node:path";
import type { MemoryBank, MemoryBankFile } from "../types.js";
import { MemoryBankFileType } from "../types.js";

export class MemoryBankServiceCore implements MemoryBank {
  private _memoryBankFolder: string;
  files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
  private ready = false;
  private logger: Console;

  constructor(memoryBankPath: string, logger?: Console) {
    this._memoryBankFolder = memoryBankPath;
    this.logger = logger || console;
  }

  async getIsMemoryBankInitialized(): Promise<boolean> {
    try {
      this.logger.info('Checking if memory bank is initialised...');
      const isDirectoryExists = await fs.stat(this._memoryBankFolder).then(stat => stat.isDirectory()).catch(() => false);
      if (!isDirectoryExists) {
        this.logger.info('Memory bank folder does not exist.');
        return false;
      }
      for (const fileType of Object.values(MemoryBankFileType)) {
        if (fileType.includes('/')) {
          const filePath = path.join(this._memoryBankFolder, fileType);
          const exists = await fs.stat(filePath).then(stat => stat.isFile()).catch(() => false);
          this.logger.info(`Checked file: ${fileType} - Exists: ${exists}`);
          if (!exists) {
            return false;
          }
        }
      }
      this.logger.info('Memory bank is initialised.');
      return true;
    } catch (err) {
      this.logger.info(`Error checking memory bank initialisation: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  async initializeFolders(): Promise<void> {
    const subfolders = [
      '',
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

  async loadFiles(): Promise<MemoryBankFileType[]> {
    this.files.clear();
    this.logger.info('Loading all memory bank files...');
    const createdFiles: MemoryBankFileType[] = [];
    try {
      for (const fileType of Object.values(MemoryBankFileType)) {
        const filePath = path.join(this._memoryBankFolder, fileType);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        let content: string;
        let stats: Stats;
        try {
          content = await fs.readFile(filePath, "utf-8");
          stats = await fs.stat(filePath);
          this.logger.info(`Loaded file: ${fileType}`);
        } catch {
          content = MemoryBankServiceCore.getTemplateForFileType(fileType as MemoryBankFileType);
          await fs.writeFile(filePath, content);
          stats = await fs.stat(filePath);
          createdFiles.push(fileType as MemoryBankFileType);
          this.logger.info(`Created missing file from template: ${fileType}`);
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
        this.logger.info(msg);
      }
      this.logger.info('Memory bank initialised successfully.');
      return createdFiles;
    } catch (err) {
      this.ready = false;
      this.logger.info(`Error loading memory bank files: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  static getTemplateForFileType(fileType: MemoryBankFileType): string {
    // (Copy the template logic from MemoryBankService)
    switch (fileType) {
      case MemoryBankFileType.ProjectBrief:
        return "# Project Brief\n\n*Foundation document that shapes all other files*\n\n## Core Requirements\n\n## Project Goals\n\n## Project Scope\n";
      case MemoryBankFileType.ProductContext:
        return "# Product Context\n\n## Why this project exists\n\n## Problems it solves\n\n## How it should work\n\n## User experience goals\n";
      case MemoryBankFileType.ActiveContext:
        return "# Active Context\n\n## Current work focus\n\n## Recent changes\n\n## Next steps\n\n## Active decisions and considerations\n";
      case MemoryBankFileType.SystemPatternsIndex:
        return "# System Patterns Index\n\n*Summary of system patterns and architecture*\n";
      case MemoryBankFileType.SystemPatternsArchitecture:
        return "# System Architecture\n\n*Describe the overall system architecture here*\n";
      case MemoryBankFileType.SystemPatternsPatterns:
        return "# Patterns\n\n*List and describe design patterns in use*\n";
      case MemoryBankFileType.SystemPatternsScanning:
        return "# Scanning\n\n*Describe scanning or analysis patterns here*\n";
      case MemoryBankFileType.TechContextIndex:
        return "# Tech Context Index\n\n*Summary of technology stack and constraints*\n";
      case MemoryBankFileType.TechContextStack:
        return "# Technology Stack\n\n*List all major technologies used*\n";
      case MemoryBankFileType.TechContextDependencies:
        return "# Dependencies\n\n*List and describe project dependencies*\n";
      case MemoryBankFileType.TechContextEnvironment:
        return "# Environment\n\n*Describe the development and production environments*\n";
      case MemoryBankFileType.ProgressIndex:
        return "# Progress Index\n\n*Summary of project progress*\n";
      case MemoryBankFileType.ProgressCurrent:
        return "# Current Progress\n\n*Describe current work, blockers, and next steps*\n";
      case MemoryBankFileType.ProgressHistory:
        return "# Progress History\n\n*Log of past progress and milestones*\n";
      case MemoryBankFileType.ProjectBriefFlat:
        return "# Project Brief\n\n*Foundation document that shapes all other files*\n\n## Core Requirements\n\n## Project Goals\n\n## Project Scope\n";
      case MemoryBankFileType.ProductContextFlat:
        return "# Product Context\n\n## Why this project exists\n\n## Problems it solves\n\n## How it should work\n\n## User experience goals\n";
      case MemoryBankFileType.ActiveContextFlat:
        return "# Active Context\n\n## Current work focus\n\n## Recent changes\n\n## Next steps\n\n## Active decisions and considerations\n";
      case MemoryBankFileType.SystemPatternsFlat:
        return "# System Patterns\n\n## System architecture\n\n## Key technical decisions\n\n## Design patterns in use\n\n## Component relationships\n";
      case MemoryBankFileType.TechContextFlat:
        return "# Tech Context\n\n## Technologies used\n\n## Development setup\n\n## Technical constraints\n\n## Dependencies\n";
      case MemoryBankFileType.ProgressFlat:
        return "# Progress\n\n## What works\n\n## What's left to build\n\n## Current status\n\n## Known issues\n";
      default:
        return "# Memory Bank File\n\n*This is a default template*\n";
    }
  }

  getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
    this.logger.info(`getFile called for: ${type}`);
    return this.files.get(type);
  }

  async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
    const filePath = path.join(this._memoryBankFolder, type);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);
    this.files.set(type as MemoryBankFileType, {
      type: type as MemoryBankFileType,
      content,
      lastUpdated: stats.mtime,
    });
    this.logger.info(`Updated file: ${type}`);
  }

  getAllFiles(): MemoryBankFile[] {
    return Array.from(this.files.values());
  }

  getFilesWithFilenames(): string {
    return Array.from(this.files.entries())
      .map(([type, file]) => `${type}: ${file.content.substring(0, 40)}...`)
      .join("\n");
  }
}
