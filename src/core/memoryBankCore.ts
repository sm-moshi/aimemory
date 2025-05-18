import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { MemoryBankFileType } from "../types/types.js";
export { MemoryBankFileType } from "../types/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEMORY_BANK_DIR = path.resolve(__dirname, "../memory-bank");

export async function readMemoryBankFile(fileType: MemoryBankFileType): Promise<string> {
  const filePath = path.join(MEMORY_BANK_DIR, `${fileType}.md`);
  return fs.readFile(filePath, "utf-8");
}

export async function updateMemoryBankFile(fileType: MemoryBankFileType, content: string): Promise<void> {
  const filePath = path.join(MEMORY_BANK_DIR, `${fileType}.md`);
  await fs.writeFile(filePath, content, "utf-8");
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
