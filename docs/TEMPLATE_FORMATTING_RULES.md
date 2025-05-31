# Template Formatting Rules

## Purpose

These rules ensure consistent, linter-compliant markdown formatting across all memory bank templates and generated content. They specifically address the MD036 rule (no-emphasis-as-heading) and establish standards for professional documentation.

## Core Formatting Rules

### 1. Document Descriptions and Subtitles

**Do this:**

```markdown
# Document Title

> Brief description or purpose statement

## Section Heading
```

**Don't do this:**

```markdown
# Document Title

*Brief description or purpose statement*

## Section Heading
```

**Rationale:** Using emphasis (*text*) for document descriptions triggers MD036. Blockquotes provide semantic meaning and visual distinction without violating linting rules.

### 2. Timestamps and Metadata

**Do this:**

```markdown
---
> Last updated: 2025-05-31
```

**Don't do this:**

```markdown
---
*Last updated: 2025-05-31*
```

**Rationale:** Consistent with document description formatting and avoids emphasis-as-heading violations.

### 3. Section Comments and Notes

**Do this:**

```markdown
## Section Title
<!-- Internal notes for template usage -->

Content here...
```

**Don't do this:**

```markdown
## Section Title
*Internal notes for template usage*

Content here...
```

**Rationale:** HTML comments are invisible to readers but provide guidance for template maintainers without triggering linting rules.

### 4. Status Indicators and Labels

**Do this:**

```markdown
- **Status**: ✅ COMPLETE - Implementation finished
- **Priority**: 🔄 HIGH - Critical for Phase 2
- [x] ✅ Requirement completed successfully
- [ ] 📅 Planned feature for next phase
```

**Don't do this:**

```markdown
- *Status*: Complete
- *Priority*: High
- [x] *Requirement completed*
```

**Rationale:** Bold text (**text**) for labels with descriptive content is semantically correct. Emoji provide visual status indication.

## Template Structure Standards

### Required Elements

1. **Document Title** (H1)
2. **Description Blockquote** (if needed)
3. **Structured Content** with proper heading hierarchy
4. **Footer with Timestamp** (blockquote format)

### Example Template Structure

```markdown
# Template Name

> Purpose or description of this document

## Primary Section
<!-- Guidelines for this section -->

### Subsection
- **Item**: Description
- **Item**: Description

## Secondary Section

### Implementation Details
<!-- Technical notes -->

---
> Last updated: [date]
```

## Content Guidelines

### Placeholder Formatting

**Do this:**

```markdown
- **[Placeholder Name]**: [Description of what goes here]
- **Timeline**: [Start date] - [End date]
```

**Don't do this:**

```markdown
- *Placeholder Name*: Description
- Timeline: *[dates]*
```

### Status and Progress Indicators

**Standard Symbols:**

- ✅ **Complete/Done**
- 🔄 **In Progress/Active**
- 📅 **Planned/Future**
- 🚫 **Blocked/Issues**
- ⏳ **Waiting/Dependencies**
- 🔧 **Technical Debt**

### Priority Levels

**Standard Format:**

- **HIGH PRIORITY**: Critical items
- **MEDIUM PRIORITY**: Important items
- **LOW PRIORITY**: Nice-to-have items

## Markdown Compliance

### Linting Rules Addressed

- **MD036**: No emphasis used as headings
- **MD033**: Controlled HTML usage (only comments)
- **MD041**: First line should be top-level heading
- **MD022**: Proper spacing around headings

### Code Block Formatting

**Template strings in TypeScript:**

```typescript
const template = `# Title

> Description

## Content
\`\`\`bash
# Commands use escaped backticks
command here
\`\`\`

---
> Last updated: [date]
`;
```

## Implementation Checklist

When creating or updating templates:

- [ ] Document title is H1
- [ ] Description uses blockquote (`>`) not emphasis (`*`)
- [ ] All placeholders use `[descriptive name]` format
- [ ] Status indicators use emoji + bold labels
- [ ] Timestamps use blockquote format
- [ ] HTML comments for internal notes only
- [ ] Code blocks properly escaped in template strings
- [ ] No emphasis used where headings are appropriate

## Validation

Run markdown linting on generated content:

```bash
markdownlint memory-bank/**/*.md
```

Expected result: Zero MD036 violations and clean linting output.

---

These rules ensure professional, consistent documentation that passes automated quality checks while remaining highly readable and maintainable.

---
> Last updated: 2025-05-31
