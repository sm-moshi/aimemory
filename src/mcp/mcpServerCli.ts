// @ts-ignore
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// @ts-ignore
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readMemoryBankFile, updateMemoryBankFile } from "../core/memoryBankCore.js";
import type { MemoryBankFileType } from "../core/memoryBankCore.js";

const server = new McpServer({
  name: "AI Memory MCP Server",
  version: "0.3.0",
});

server.tool(
  "read-memory-bank-file",
  { fileType: z.string() },
  async ({ fileType }) => {
    const content = await readMemoryBankFile(fileType as MemoryBankFileType);
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "update-memory-bank-file",
  { fileType: z.string(), content: z.string() },
  async ({ fileType, content }) => {
    await updateMemoryBankFile(fileType as MemoryBankFileType, content);
    return { content: [{ type: "text", text: "success" }] };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
