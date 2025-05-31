# AI Memory Extension Migration Guide

> _Last updated: 2025-05-30_

This guide helps you upgrade to the latest version of AI Memory. The extension has evolved significantly from early experimental versions to the current robust stdio-based MCP implementation.

---

## 🆕 Key Changes in Current Version (v0.8.0-dev.1)

### Architecture Improvements

- **stdio MCP transport**: Direct communication with Cursor (no HTTP endpoints)
- **Modular memory bank**: Files organized by context (`core/`, `systemPatterns/`, `techContext/`, `progress/`)
- **Self-healing system**: Missing or incomplete files auto-created from templates
- **Enhanced stability**: MCP server runs as isolated child process
- **Improved error handling**: Comprehensive logging and graceful error recovery

### User Experience

- **Simplified setup**: Single command to initialize everything
- **Better feedback**: Clear status messages in webview dashboard and output channel
- **Automatic configuration**: Cursor MCP settings updated automatically
- **Persistent context**: Memory bank maintains state across Cursor sessions

---

## 🔄 Migration Scenarios

### From Pre-v0.8.0 Versions

If you're upgrading from any earlier version:

1. **Backup existing data**:

   ```bash
   # Backup your current memory-bank folder
   cp -r memory-bank/ memory-bank-backup/

   # Backup Cursor config if it exists
   cp .cursor/mcp.json .cursor/mcp.json.backup
   ```

2. **Install the latest version**:
   - Update through Cursor Extensions panel, or
   - Download latest VSIX from [GitHub releases](https://github.com/sm-moshi/aimemory/releases)

3. **Initialize new system**:

   ```bash
   # In Cursor Command Palette
   AI Memory: Start MCP Server
   ```

4. **Migrate content**:
   - The system will detect existing files and migrate them automatically
   - Check webview dashboard for migration status
   - Review `AI Memory: Show Output Channel` for detailed migration logs

### From Flat Memory Bank Structure

If you have a flat `memory-bank/` folder with loose files:

1. **Automatic detection**: The extension detects flat structures and offers migration
2. **Content preservation**: Existing files are moved to appropriate modular folders
3. **Template creation**: Missing structure files are created from templates
4. **Manual review**: Check migrated content and update as needed

### From HTTP-based Versions (if any)

If you previously used experimental HTTP-based versions:

1. **Configuration cleanup**: Old HTTP-based configurations are automatically replaced
2. **Port references**: No more port conflicts or firewall issues
3. **Health checks**: Replace HTTP health endpoints with MCP server status checks

---

## 📂 Memory Bank Structure Migration

### Old Structure → New Structure

```bash
# Old flat structure
memory-bank/
├── project-brief.md
├── active-context.md
├── tech-stack.md
└── current-tasks.md

# New modular structure
memory-bank/
├── core/
│   ├── projectBrief.md      # ← project-brief.md
│   ├── activeContext.md     # ← active-context.md
│   └── productContext.md    # (new template)
├── techContext/
│   ├── stack.md            # ← tech-stack.md
│   ├── dependencies.md     # (new template)
│   └── environment.md      # (new template)
└── progress/
    ├── current.md          # ← current-tasks.md
    └── history.md          # (new template)
```

### Migration Process

1. **File detection**: System scans for existing memory bank files
2. **Content mapping**: Maps old files to new modular locations
3. **Template creation**: Creates missing files with helpful templates
4. **Validation**: Verifies all required files exist and are accessible

---

## 🛠️ Configuration Migration

### Cursor MCP Configuration

**Old manual setup** (if you had any):

```json
{
  "servers": {
    "ai-memory": {
      "url": "http://localhost:7331"
    }
  }
}
```

**New automatic setup**:

```json
{
  "servers": {
    "ai-memory": {
      "command": "node",
      "args": ["/path/to/extension/dist/mcp-server.cjs"],
      "cwd": "/workspace/path"
    }
  }
}
```

The extension now automatically manages this configuration.

### Extension Settings

**Previous versions**: Limited or experimental settings
**Current version**: Comprehensive configuration options:

- `aimemory.logLevel`: Control logging verbosity
- Automatic workspace detection
- Self-healing file management

---

## ✅ Post-Migration Checklist

### 1. Verify Installation

- [ ] Extension appears in Cursor Extensions panel
- [ ] Version shows v0.8.0-dev.1 or later
- [ ] No error notifications on startup

### 2. Test MCP Server

- [ ] Run `AI Memory: Start MCP Server` successfully
- [ ] Check `AI Memory: Show Output Channel` for clean startup
- [ ] Webview dashboard shows server as connected

### 3. Validate Memory Bank

- [ ] `memory-bank/` folder exists with modular structure
- [ ] Core files exist: `projectBrief.md`, `activeContext.md`, etc.
- [ ] Files contain your migrated content (not just templates)
- [ ] No permission errors when accessing files

### 4. Test Cursor Integration

- [ ] Cursor AI can access memory bank context (test with a question)
- [ ] MCP tools available to AI agents
- [ ] Context persists across Cursor sessions

---

## 🚨 Troubleshooting Migration Issues

### Migration Incomplete

- **Symptom**: Some files missing or empty
- **Solution**: Use webview dashboard to check status and retry initialization
- **Backup**: Restore from backup and re-run migration

### Configuration Conflicts

- **Symptom**: MCP server won't start
- **Solution**: Run `AI Memory: Update Cursor MCP Config` to refresh configuration
- **Manual**: Delete `.cursor/mcp.json` and let extension recreate it

### Content Not Migrated

- **Symptom**: New files only contain templates
- **Solution**: Manually copy content from backup to appropriate new locations
- **Check**: Verify file permissions and encoding

### Performance Issues

- **Symptom**: Slow startup or operations
- **Solution**: Check for very large files (>50KB) and consider splitting them
- **Clean**: Remove old backup files after successful migration

---

## 📚 Additional Resources

- [QUICKSTART.md](./QUICKSTART.md) — Setup guide for new installations
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Common issues and solutions
- [Architecture Overview](../devs/architecture-overview.md) — Technical details
- [GitHub Repository](https://github.com/sm-moshi/aimemory) — Latest updates and releases

---

## 💬 Getting Help

If you encounter migration issues:

1. **Check logs**: `AI Memory: Show Output Channel` for detailed error information
2. **Use webview**: Dashboard shows current system status and health
3. **Backup safety**: Your original files should be preserved during migration
4. **Report issues**: [GitHub Issues](https://github.com/sm-moshi/aimemory/issues) with migration logs

---
