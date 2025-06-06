import type { MemoryBankFileType } from "@/types/core.js";
import { coreTemplates } from "./core-templates.js";
import { progressTemplates } from "./progress-templates.js";
import { systemTemplates } from "./system-templates.js";
import { techTemplates } from "./tech-templates.js";

const defaultTemplate =
	"# Memory Bank File\n\nThis file should contain project memory or context as appropriate.\n\n*This is a default template*\n";

// Combine all template maps into a single registry
const templateRegistry = new Map<MemoryBankFileType, string>([
	...coreTemplates,
	...systemTemplates,
	...techTemplates,
	...progressTemplates,
]);

export function getTemplateForFileType(fileType: MemoryBankFileType): string {
	return templateRegistry.get(fileType) ?? defaultTemplate;
}
