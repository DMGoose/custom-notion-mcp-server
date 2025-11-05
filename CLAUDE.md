# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains **custom-notion-mcp-ts**, a TypeScript implementation of an MCP (Model Context Protocol) server that connects Notion documentation to Claude Desktop.

The MCP server uses the official `@modelcontextprotocol/sdk` to communicate with Claude Desktop via stdio, and the `@notionhq/client` to interact with the Notion API.

## Development Commands

```bash
# Navigate to the project
cd custom-notion-mcp-ts

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Test the server manually (requires NOTION_TOKEN env var)
node build/index.js
```

**Build output**: TypeScript compiles from `src/` to `build/` directory. The entry point is [build/index.js](custom-notion-mcp-ts/build/index.js).

## Environment Setup

Create a `.env` file in the `custom-notion-mcp-ts/` directory:

```
NOTION_TOKEN=secret_your_notion_integration_token_here
```

Get your token from: https://www.notion.so/my-integrations

**Important**: After creating a Notion integration, you must explicitly share pages and databases with it:
1. Navigate to the page/database in Notion
2. Click "..." menu → "Connections"
3. Add your integration

The MCP server will only see content that has been explicitly shared with the integration.

## Architecture

### MCP Server Pattern

The server uses the standard MCP stdio transport pattern:

1. **Server Initialization**: Creates `McpServer` instance with name and capabilities
2. **Tool Registration**: Tools registered via `mcpServer.tool(name, description, schema, handler)`
3. **Schema Definition**: Uses Zod schemas for parameter validation (e.g., `z.string().describe(...)`)
4. **Transport**: Uses `StdioServerTransport` for communication with Claude Desktop
5. **Response Format**: All tools return `{ content: Array<{ type: "text", text: string }> }`

### Connection Flow

```
Claude Desktop → stdio → StdioServerTransport → McpServer → Tool Handlers → Notion API
```

### Key Files

- [src/index.ts](custom-notion-mcp-ts/src/index.ts) - Complete MCP server implementation (all 4 tools)
- [package.json](custom-notion-mcp-ts/package.json) - Defines `bin` entry point for CLI execution
- [tsconfig.json](custom-notion-mcp-ts/tsconfig.json) - TypeScript configuration (ES2022, Node16 modules)

## MCP Tools Implemented

### 1. search_notion

Searches the Notion workspace by keyword and returns page titles + URLs.

**Parameters**: `{ query: z.string() }`

**Returns**: Array of results with `title`, `url`, `id`

**Implementation**: [src/index.ts:25-70](custom-notion-mcp-ts/src/index.ts#L25-L70)
- Filters to only return pages (not databases)
- Handles two title extraction patterns: from `properties` object or direct `title` property
- Generates clean Notion URLs by removing hyphens from IDs

### 2. fetch_page

Fetches a Notion page's title and plain text content by ID.

**Parameters**: `{ page_id: z.string() }`

**Returns**: Page title, URL, and text content

**Implementation**: [src/index.ts:73-111](custom-notion-mcp-ts/src/index.ts#L73-L111)
- Retrieves page metadata first to extract title
- Fetches child blocks using `notion.blocks.children.list()`
- Only extracts paragraph blocks with `rich_text` content
- Other block types (headings, lists, code, databases, etc.) are ignored

### 3. query_database

Queries a Notion database to retrieve its entries/rows with their properties.

**Parameters**: `{ database_id: z.string() }`

**Returns**: Database title, URL, property schema, and all entries with formatted values

**Implementation**: [src/index.ts:114-225](custom-notion-mcp-ts/src/index.ts#L114-L225)
- Fetches database metadata to get title and property schema
- Queries all entries using `notion.databases.query()`
- Handles multiple property types: title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, status
- Formats output with database info, properties list, and all entries

### 4. list_databases

Lists all databases in the connected Notion workspace.

**Parameters**: None

**Returns**: Array of databases with `title`, `url`, and `id`

**Implementation**: [src/index.ts:228-312](custom-notion-mcp-ts/src/index.ts#L228-L312)
- Searches all objects in workspace
- Discovers databases in two ways:
  1. Direct database objects returned by search
  2. Database IDs extracted from pages that are database children (via `parent.database_id`)
- Fetches database metadata for each unique database ID found
- Includes debug information when no databases are found

**Key Insight**: The Notion search API primarily returns database entries (pages) rather than database containers. This tool intelligently discovers databases by examining the parent relationships of pages.

## Notion API Integration

### Authentication

Uses Notion Internal Integration tokens:
- Format: `secret_...`
- Created at: https://www.notion.so/my-integrations
- Permissions needed: "Read content" minimum

### Page Access Model

**Critical**: Notion integrations do not have workspace-wide access by default.

To grant access to pages/databases:
1. Navigate to the page/database in Notion
2. Click "..." menu → "Connections"
3. Add your integration

The MCP server will only see content explicitly shared with the integration.

### API Version

Uses Notion API version `2022-06-28` (set by `@notionhq/client`).

### Parameter Schema Format

All tools use Zod schemas for parameter validation:

```typescript
// Correct format:
{
  parameter_name: z.string().describe("Description of parameter")
}

// Incorrect format (will not work):
{
  parameter_name: { type: "string", required: true }
}
```

The MCP SDK requires Zod schemas. Using object notation will result in empty parameter schemas being registered, preventing Claude from passing parameters to tools.

## Claude Desktop Configuration

After building, configure in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "custom-notion-mcp": {
      "command": "node",
      "args": ["F:\\FrontCode\\mcpServer\\custom-notion-mcp-ts\\build\\index.js"],
      "env": {
        "NOTION_TOKEN": "secret_your_token_here"
      }
    }
  }
}
```

**Note**: Use absolute paths in the configuration. Restart Claude Desktop after any configuration changes or rebuilds.

## Current Limitations

### Block Type Coverage in fetch_page

**Currently supported**: Paragraph blocks only

**Not extracted**:
- Heading blocks (heading_1, heading_2, heading_3)
- List blocks (bulleted_list_item, numbered_list_item)
- Code blocks
- Quote blocks
- Toggle blocks
- Child pages/databases
- Embedded content

**To extend**: Modify the `fetch_page` tool handler at [src/index.ts:89-96](custom-notion-mcp-ts/src/index.ts#L89-L96) to process additional block types.

Example to add heading support:
```typescript
const textBlocks = blocks.results.map((b: any) => {
    if (b.type === 'paragraph' && b.paragraph?.rich_text?.length) {
        return b.paragraph.rich_text.map((rt: any) => rt.plain_text).join("");
    }
    if (b.type === 'heading_1' && b.heading_1?.rich_text?.length) {
        return `# ${b.heading_1.rich_text.map((rt: any) => rt.plain_text).join("")}`;
    }
    // Add more block types...
    return null;
}).filter(Boolean);
```

### Pagination

The current implementation does not handle pagination for:
- Search results (Notion API returns max 100 results per request)
- Database queries (max 100 entries per request)
- Block children (when fetching deeply nested content)

To add pagination, implement cursor-based iteration using the `has_more` and `next_cursor` fields in API responses.

### Missing Features from Original Requirements

These features were mentioned in project requirements but not yet implemented:

1. **DEPRECATED page filtering** - No automatic filtering of pages with "DEPRECATED" in titles
2. **Configuration file** - No include/exclude list support
3. **Caching layer** - No caching of API responses
4. **Rate limit handling** - No retry logic or backoff

## Extension Points

### Adding DEPRECATED Filtering

In `search_notion` tool handler at [src/index.ts:33](custom-notion-mcp-ts/src/index.ts#L33), add filtering:

```typescript
.filter(r => r.object === "page")
.filter(r => {
    const title = extractTitle(r).toLowerCase();
    return !title.includes('deprecated') && !title.includes('depricated');
})
```

### Adding Caching

Implement simple in-memory caching before Notion API calls:

```typescript
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check cache before API call
const cacheKey = `page:${page_id}`;
const cached = cache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
}

// Make API call and cache result
const result = await notion.pages.retrieve({ page_id });
cache.set(cacheKey, { data: result, timestamp: Date.now() });
```

### Supporting More Property Types in query_database

The current implementation handles common property types. To add more, extend the switch statement at [src/index.ts:155-191](custom-notion-mcp-ts/src/index.ts#L155-L191):

```typescript
case "people":
    props[propName] = prop.people?.map((p: any) => p.name).join(", ") || "";
    break;
case "files":
    props[propName] = prop.files?.map((f: any) => f.name).join(", ") || "";
    break;
case "relation":
    props[propName] = `[${prop.relation?.length || 0} relations]`;
    break;
```

## Common Issues

**"No results found" when searching**: Verify pages are shared with the integration in Notion's UI. Check page connections.

**"No databases found" when listing**: Ensure databases (not just their parent pages) are shared with the integration. The integration needs access to either:
- The database object directly, OR
- At least one page that is a child of the database

**Empty page content**: Currently only paragraph blocks are extracted. Pages with only headings/lists will appear empty. Extend block type support as shown above.

**Parameters not accepted by tools**: Ensure tool schemas use Zod format (`z.string()`) not object notation. This was fixed in the current implementation.

**Server won't start**:
- Check `NOTION_TOKEN` environment variable is set
- Verify token is valid (starts with `secret_`)
- Ensure Node.js version 24.11.0 is installed

**Build errors**: Run `npm install` to ensure all dependencies are installed, especially `@types/node`, `typescript`, and the MCP SDK.

## Node Version

Project uses Node.js 24.11.0 (pinned via Volta in package.json). Volta will automatically use the correct version if installed.

## Testing Strategy

1. **Test with empty search**: `search_notion` with empty query should return all accessible pages
2. **Test database discovery**: `list_databases` should find databases by examining database entries
3. **Test database querying**: `query_database` with a database ID should return all entries and properties
4. **Test page fetching**: `fetch_page` with a page ID should return title and paragraph content
5. **Test error cases**: Invalid IDs, unshared content, rate limits (if implemented)
