# Custom Notion MCP Server (TypeScript)

A TypeScript implementation of a Model Context Protocol (MCP) server that connects Notion workspaces to Claude Desktop, enabling Claude to search, read, and query your Notion content.

## Features

- **Search Pages**: Search across all accessible Notion pages by keyword
- **Fetch Page Content**: Retrieve full page content including title and text
- **List Databases**: Discover all databases in your workspace
- **Query Databases**: Get complete database entries with all property values

## Quick Start

### Prerequisites

- Node.js 24.11.0 (or compatible version)
- A Notion account with admin access
- Claude Desktop application

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

### Setup Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "+ New integration"
3. Give it a name (e.g., "Claude MCP Integration")
4. Set capabilities to "Read content" (minimum required)
5. Copy the "Internal Integration Token" (starts with `secret_`)

### Share Content with Integration

**Important**: The integration won't have access to any content by default. You must explicitly share pages/databases:

1. Open the page or database in Notion
2. Click the "..." menu in the top right
3. Select "Connections"
4. Find and add your integration

Repeat for each page/database you want Claude to access.

### Configure Claude Desktop

1. Locate your Claude Desktop config file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "custom-notion-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\custom-notion-mcp-ts\\build\\index.js"],
      "env": {
        "NOTION_TOKEN": "secret_your_token_here"
      }
    }
  }
}
```

Replace the path with your actual absolute path to `build/index.js`.

3. Restart Claude Desktop

## Usage

Once configured, Claude will have access to four tools:

### 1. Search Notion

Search for pages by keyword:

```
"Search my Notion for pages about project planning"
```

### 2. Fetch Page

Get the full content of a specific page:

```
"Fetch the content of this Notion page: [page-id or URL]"
```

### 3. List Databases

See all available databases:

```
"List all databases in my Notion workspace"
```

### 4. Query Database

Get all entries from a database:

```
"Show me all entries in database [database-id]"
```

Claude will automatically use these tools when you ask questions about your Notion content.

## Architecture

This MCP server uses:

- **@modelcontextprotocol/sdk**: Official MCP SDK for server implementation
- **@notionhq/client**: Official Notion API client
- **stdio transport**: Communication with Claude Desktop via stdin/stdout
- **Zod schemas**: Parameter validation for tool inputs

### Project Structure

```
custom-notion-mcp-ts/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Supported Property Types

The `query_database` tool handles these Notion property types:

- Title
- Rich Text
- Number
- Select / Multi-select
- Date
- Checkbox
- URL
- Email
- Phone Number
- Status

Other property types will show as `[type]` in the output.

## Current Limitations

### Content Extraction

- **fetch_page** only extracts paragraph blocks
- Headings, lists, code blocks, and other block types are not included
- Nested/child blocks are not retrieved

### Pagination

- Search results limited to first 100 items
- Database queries limited to first 100 entries
- No automatic pagination handling

### Performance

- No caching of API responses
- Each request makes fresh API calls
- No rate limit handling or retry logic

## Development

### Build

```bash
npm run build
```

Compiles TypeScript from `src/` to `build/` directory.

### Development Workflow

1. Make changes to `src/index.ts`
2. Run `npm run build`
3. Restart Claude Desktop to reload the server

### Debugging

The server logs to stderr. View logs by checking Claude Desktop's MCP server output or running the server directly:

```bash
node build/index.js
```

The server will wait for MCP messages on stdin.

## Troubleshooting

### "No results found" when searching

**Cause**: Pages not shared with the integration

**Solution**: Open pages in Notion → "..." menu → "Connections" → Add your integration

### "No databases found"

**Cause**: Databases not shared with the integration

**Solution**: Share at least one page that's a child of the database, or share the database directly

### Parameters not being accepted

**Cause**: MCP server not properly registered or old build being used

**Solution**:
1. Rebuild the project: `npm run build`
2. Restart Claude Desktop
3. Verify the path in Claude Desktop config is correct

### Server won't start

**Possible causes**:
- `NOTION_TOKEN` environment variable not set in Claude Desktop config
- Invalid token format (should start with `secret_`)
- Wrong Node.js version (requires 24.11.0)
- Build directory missing (run `npm run build`)

## Contributing

This is a learning project for understanding MCP server implementation. Feel free to:

- Add support for more block types in `fetch_page`
- Implement pagination for large result sets
- Add caching layer for frequently accessed content
- Implement DEPRECATED page filtering
- Add configuration file support

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Notion API Documentation](https://developers.notion.com)
- [Notion MCP Server (Official)](https://github.com/makenotion/notion-mcp-server)
- [Create Notion Integrations](https://www.notion.so/my-integrations)

## License

ISC

## Security Note

**Never commit your Notion integration token to version control.**

Always use environment variables or configuration files (excluded via `.gitignore`) to store sensitive credentials.
