import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { MemoryBank, MemoryBankFile, MemoryBankFileType } from "./types";

export class MemoryBankService implements MemoryBank {
  private _memoryBankFolder: string;
  files: Map<MemoryBankFileType, MemoryBankFile> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folder found");
    }

    this._memoryBankFolder = path.join(
      workspaceFolders[0].uri.fsPath,
      "memory-bank"
    );
  }

  async initialize(): Promise<void> {
    await this.ensureMemoryBankFolder();
    await this.loadFiles();
  }

  private async ensureMemoryBankFolder(): Promise<void> {
    if (!fs.existsSync(this._memoryBankFolder)) {
      fs.mkdirSync(this._memoryBankFolder, { recursive: true });
    }
  }

  private async loadFiles(): Promise<void> {
    this.files.clear();

    for (const fileType of Object.values(MemoryBankFileType)) {
      const filePath = path.join(this._memoryBankFolder, fileType);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const stats = fs.statSync(filePath);

        this.files.set(fileType as MemoryBankFileType, {
          type: fileType as MemoryBankFileType,
          content,
          lastUpdated: stats.mtime,
        });
      } else {
        // Create empty file with template
        const template = this.getTemplateForFileType(
          fileType as MemoryBankFileType
        );
        fs.writeFileSync(filePath, template);

        this.files.set(fileType as MemoryBankFileType, {
          type: fileType as MemoryBankFileType,
          content: template,
          lastUpdated: new Date(),
        });
      }
    }
  }

  private getTemplateForFileType(fileType: MemoryBankFileType): string {
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
    fs.writeFileSync(filePath, content);

    this.files.set(type, {
      type,
      content,
      lastUpdated: new Date(),
    });
  }

  getAllFiles(): MemoryBankFile[] {
    return Array.from(this.files.values());
  }
}
