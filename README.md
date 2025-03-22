# AI Memory Extension for VSCode/Cursor

This extension allows Cursor users to easily manage context on their projects using a technique called memory bank, integrated through the Model Context Protocol (MCP).

## Features

- **Memory Bank Management**: Organize project context in a structured way
- **MCP Integration**: Start a Model Context Protocol (MCP) server to handle AI memory bank operations
- **Cursor Command Support**: Use `/memory` commands directly in Cursor AI chat
- **Automatic File Creation**: Initializes template files for different aspects of your project

## Installation

1. Install the extension from the VSCode/Cursor marketplace
2. Activate it in your project workspace

## Usage

### Starting the MCP Server

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Search for `AI Memory: Start MCP`
3. Click on the command to start the MCP server

This will start an MCP server on port 1337 (or 7331 if the primary port is unavailable).

### Using Memory Bank Commands

You can interact with the AI Memory MCP server in two ways:

1. **Using Cursor's built-in MCP integration**:
   Once the MCP server is running, you can connect to it through Cursor's MCP integration to access all memory bank files and functionality.

2. **Using `/memory` commands**:
   For quick status checks, you can use direct commands in Cursor AI chat:
   - `/memory help` - Show help information
   - `/memory status` - Check if the MCP server is running

### MCP Capabilities

The AI Memory MCP server provides the following capabilities:

#### Resources

- `memory-bank://` - List all memory bank files
- `memory-bank://{fileType}` - Access a specific memory bank file

#### Tools

- `initialize-memory-bank` - Initialize the memory bank with template files
- `list-memory-bank-files` - List all memory bank files
- `get-memory-bank-file` - Get the content of a specific memory bank file
- `update-memory-bank-file` - Update the content of a specific memory bank file

#### Prompts

- `initialize-memory-bank` - Prompt for initializing the memory bank
- `update-memory-bank-file` - Prompt for updating a memory bank file

### Memory Bank File Types

The memory bank consists of these core files:

1. `projectbrief.md` - Foundation document that shapes all other files
2. `productContext.md` - Why this project exists, problems it solves
3. `activeContext.md` - Current work focus, recent changes
4. `systemPatterns.md` - System architecture, key technical decisions
5. `techContext.md` - Technologies used, development setup
6. `progress.md` - What works, what's left to build

## Development

- Extension is built using TypeScript
- Uses the Model Context Protocol (MCP) SDK for structured AI interaction
- Default MCP server port: 1337 (falls back to 7331 if occupied)

## Requirements

- VSCode or Cursor editor
- Node.js environment for running the MCP server

## License

MIT

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
