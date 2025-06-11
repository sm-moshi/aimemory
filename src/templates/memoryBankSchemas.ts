/**
 * Zod Schemas for Memory Bank File Frontmatter Validation Phase 2: Metadata System
 */

import { z } from "zod/v4";

// Base schema that all memory bank files should have
export const BaseFileSchema = z.object({
	id: z.uuid().optional(),
	type: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	created: z.iso.datetime().optional(),
	updated: z.iso.datetime().optional(),
	version: z.string().optional(),
});

// Project Brief specific schema
export const ProjectBriefSchema = BaseFileSchema.extend({
	type: z.literal("projectBrief"),
	title: z.string().min(1, { error: "Title is required" }),
	description: z.string().min(10, { error: "Description must be at least 10 characters" }),
	status: z.enum(["draft", "active", "completed", "archived"]).optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

// Research Note schema
export const ResearchNoteSchema = BaseFileSchema.extend({
	type: z.literal("researchNote"),
	topic: z.string().min(1, { error: "Topic is required" }),
	sources: z.array(z.string()).optional(),
	confidence: z.enum(["low", "medium", "high"]).optional(),
});

// Progress tracking schema
export const ProgressSchema = BaseFileSchema.extend({
	type: z.literal("progress"),
	phase: z.string().optional(),
	status: z.enum(["not-started", "in-progress", "completed", "blocked"]).optional(),
	blockers: z.array(z.string()).optional(),
});

// System Pattern schema
export const SystemPatternSchema = BaseFileSchema.extend({
	type: z.literal("systemPattern"),
	pattern: z.string().min(1, { error: "Pattern is required" }),
	category: z.enum(["architecture", "design", "performance", "security"]).optional(),
});

// Default schema for unknown types
export const DefaultFileSchema = BaseFileSchema;

// Schema registry for lookup
export const SCHEMA_REGISTRY: Record<string, z.ZodType> = {
	projectBrief: ProjectBriefSchema,
	researchNote: ResearchNoteSchema,
	progress: ProgressSchema,
	systemPattern: SystemPatternSchema,
	default: DefaultFileSchema,
};

/**
 * Get the appropriate schema for a given file type
 */
export function getSchemaForType(type?: string): z.ZodType {
	return SCHEMA_REGISTRY[type ?? "default"] || DefaultFileSchema;
}

/**
 * Validate frontmatter against the appropriate schema
 */
export function validateFrontmatter(
	metadata: unknown,
	type?: string,
): { success: true; data: unknown } | { success: false; error: z.core.$ZodError } {
	const schema = getSchemaForType(type);
	return schema.safeParse(metadata);
}
