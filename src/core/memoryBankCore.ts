import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { MemoryBankFileType } from "../types/types.js";
import { MemoryBankServiceCore } from "./memoryBankServiceCore.js";
export { MemoryBankFileType } from "../types/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEMORY_BANK_DIR = path.resolve(__dirname, "../memory-bank");

const memoryBankServiceCore = new MemoryBankServiceCore(MEMORY_BANK_DIR);

export async function readMemoryBankFile(fileType: MemoryBankFileType): Promise<string> {
  await memoryBankServiceCore.loadFiles();
		const file = memoryBankServiceCore.getFile(fileType);
		if (!file) {
			throw new Error(`File ${fileType} not found`);
		}
		return file.content;
}

export async function updateMemoryBankFile(fileType: MemoryBankFileType, content: string): Promise<void> {
  await memoryBankServiceCore.updateFile(fileType, content);
}

export function getMemoryBankTools() {
  return [
    {
      name: "read-memory-bank-file",
      description: "Read a memory bank file",
      paramsSchema: z.object({ fileType: z.string() }),
      handler: async ({ fileType }: { fileType: string }) => {
        const content = await readMemoryBankFile(fileType as MemoryBankFileType);
        return { content };
      },
    },
    {
      name: "update-memory-bank-file",
      description: "Update a memory bank file",
      paramsSchema: z.object({ fileType: z.string(), content: z.string() }),
      handler: async ({ fileType, content }: { fileType: string; content: string }) => {
        await updateMemoryBankFile(fileType as MemoryBankFileType, content);
        return { success: true };
      },
    },
  ];
}
