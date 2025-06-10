import type { MemoryBankFileType } from "../lib/types/core";
import { coreTemplates } from "./core";
import { progressTemplates } from "./progress";
import { systemTemplates } from "./system";
import { techTemplates } from "./tech";

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

export { coreTemplates, progressTemplates, systemTemplates, techTemplates };
