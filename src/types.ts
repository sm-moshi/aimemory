export interface MCPOptions {
  port: number;
}

export enum MemoryBankFileType {
  ProjectBrief = "projectbrief.md",
  ProductContext = "productContext.md",
  ActiveContext = "activeContext.md",
  SystemPatterns = "systemPatterns.md",
  TechContext = "techContext.md",
  Progress = "progress.md",
}

export interface MemoryBankFile {
  type: MemoryBankFileType;
  content: string;
  lastUpdated?: Date;
}

export interface MemoryBank {
  files: Map<MemoryBankFileType, MemoryBankFile>;
  initializeFolders(): Promise<void>;
  loadFiles(): Promise<void>;
  getFile(type: MemoryBankFileType): MemoryBankFile | undefined;
  updateFile(type: MemoryBankFileType, content: string): Promise<void>;
  getAllFiles(): MemoryBankFile[];
  getFilesWithFilenames(): string;
}

export interface MCPHandler {
  handleCommand(command: string, args: string[]): Promise<string>;
}
