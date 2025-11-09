# Custom Notion MCP Server (TypeScript)

A TypeScript implementation of a Model Context Protocol (MCP) server that connects Notion workspaces to Claude Desktop, enabling Claude to search, read, and query your Notion content with advanced features like caching, filtering, and error handling.

## Features

### Core Functionality
- **Search Pages**: Search across all accessible Notion pages by keyword
- **Fetch Page Content**: Retrieve full page content with support for 10+ block types
- **List Databases**: Discover all databases in your workspace
- **Query Databases**: Get complete database entries with all property values
- **Get Cache Stats**: Monitor cache performance and statistics

### Smart Features
- **Auto-filter DEPRECATED Pages**: Automatically exclude pages with configurable keywords
- **Configuration File**: Customize filtering and caching behavior via `config.json`
- **Caching**: In-memory cache with configurable TTL to reduce API calls
- **Error Handling**: Automatic retry with exponential backoff for rate limits and connection issues
- **Block Support**: Extract headings, lists, code blocks, quotes, to-dos, child pages, and more

## Quick Start

### Prerequisites

- Node.js 24.11.0 (managed via Volta)
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

4. Run tests (optional):

```bash
npm test
```

### Setup Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "+ New integration"
3. Give it a name (e.g., "Claude MCP Integration")
4. Set capabilities to "Read content" (minimum required)
5. Copy the "Internal Integration Token" (starts with `secret_`)

### Share Content with Integration

**Important**: The integration won't have access to any content by default. You can share pages/databases in two ways:

#### Configure in Integration Settings
1. Open the new Notion Integrations you just created
2. Click Access on the menu
3. Click Edit access
4. Choose the pages/databases you want to share, then click save

#### or Configure in Notion Workspace
1. Open the page or database in Notion
2. Click the "..." menu in the top right
3. Select "Connections"
4. Find and add your integration
5. Repeat for each page/database you want Claude to access.

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
      "args": ["C:\\your\\path\\to\\your\\serevr\\build\\index.js"],
      "env": {
        "NOTION_TOKEN": "secret_your_token_here"
      }
    }
  }
}
```

Replace the path with your actual absolute path to `build/index.js`.

3. Restart Claude Desktop

## Configuration

Customize server behavior by editing `src/config.json`:

```json
{
  "filtering": {
    "excludeKeywords": ["deprecated", "depricated", "archive"],
    "excludePageIds": [],
    "excludeDatabaseIds": [],
    "includeOnlyPageIds": [],
    "includeOnlyDatabaseIds": []
  },
  "caching": {
    "enabled": true,
    "ttlMinutes": 5
  }
}
```

### Configuration Options

- **excludeKeywords**: Array of keywords to filter out from search/list results (case-insensitive)
- **excludePageIds**: Specific page IDs to exclude
- **excludeDatabaseIds**: Specific database IDs to exclude
- **includeOnlyPageIds**: If specified, only these page IDs will be included (whitelist)
- **includeOnlyDatabaseIds**: If specified, only these database IDs will be included (whitelist)
- **caching.enabled**: Toggle caching on/off
- **caching.ttlMinutes**: Cache time-to-live in minutes (default: 5)

## Usage

Once configured, Claude will have access to five tools:

### 1. Search Notion

Search for pages by keyword:

```
"Search my Notion for pages about project planning"
```

Auto-filters pages based on configuration keywords.

### 2. Fetch Page

Get the full content of a specific page:

```
"Fetch the content of this Notion page: [page-id or URL]"
```

Supports extraction of:
- Headings (H1, H2, H3)
- Paragraphs
- Lists (bulleted, numbered)
- Code blocks
- Quotes
- To-do items
- Toggle blocks
- Child pages and databases

### 3. List Databases

See all available databases:

```
"List all databases in my Notion workspace"
```

Intelligently discovers databases by examining page parent relationships.

### 4. Query Database

Get all entries from a database:

```
"Show me all entries in database [database-id]"
```

### 5. Get Cache Stats

Monitor cache performance:

```
"Get cache stats"
```

Shows cache status, number of cached items, and TTL settings.

## Architecture

### Tech Stack

- **@modelcontextprotocol/sdk**: Official MCP SDK for server implementation
- **@notionhq/client**: Official Notion API client
- **Zod**: Runtime type validation for tool parameters
- **Vitest**: Testing framework with coverage support
- **TypeScript**: Type-safe development

### Project Structure

```
custom-notion-mcp-ts/
├── src/
│   ├── server/
│   │   ├── tools/              # Individual tool implementations
│   │   │   ├── searchNotion.ts
│   │   │   ├── fetchPage.ts
│   │   │   ├── queryDatabase.ts
│   │   │   ├── listDatabases.ts
│   │   │   └── getCacheStats.ts
│   │   ├── index.ts            # Server setup and tool registration
│   │   └── config.ts           # Configuration loader
│   ├── utils/
│   │   ├── cache.ts            # Caching implementation
│   │   ├── withRetry.ts        # Error handling and retry logic
│   │   ├── filter.ts           # Filtering utilities
│   │   ├── extractors.ts       # Data extraction helpers
│   │   └── logger.ts           # Logging utilities
│   ├── domain.ts               # Type definitions
│   ├── config.json             # Configuration file
│   └── index.ts                # Entry point
├── test/
│   ├── cache.test.ts           # Cache unit tests
│   └── withRetry.test.ts       # Retry logic tests
├── build/                      # Compiled JavaScript output
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Supported Block Types

### Pages (fetch_page)
- Paragraph
- Heading 1, 2, 3
- Bulleted list items
- Numbered list items
- Code blocks (with language syntax)
- Quotes
- Toggle blocks
- To-do items (with checked status)
- Dividers
- Child pages (with URLs)
- Child databases (with URLs)

### Databases (query_database)
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

## Smart Features in Detail

### 1. Auto-filtering

Pages and databases are automatically filtered based on:
- **Keyword exclusion**: Skip items with "deprecated", "archive", etc. in titles
- **ID exclusion**: Exclude specific page/database IDs
- **ID inclusion**: Whitelist only specific IDs

### 2. Caching Layer

- In-memory cache with configurable TTL
- Caches `fetch_page` and `query_database` results
- Logs cache hits/misses to stderr
- Reduces API calls and improves response time
- Can be disabled via configuration

### 3. Error Handling

- Automatic retry for rate limit errors (HTTP 429)
- Respects `Retry-After` header from Notion API
- Exponential backoff for connection errors
- Maximum 3 retry attempts
- Detailed error logging

### 4. Performance Monitoring

Use `get_cache_stats` to monitor:
- Cache hit rate
- Number of cached items
- TTL configuration
- Cache status (enabled/disabled)

## Development

### Build

```bash
npm run build
```

Compiles TypeScript from `src/` to `build/` directory.

### Testing

```bash
npm test           # Run tests
npm run test       # Run tests with coverage
```

Tests are written with Vitest and include:
- Cache functionality tests
- Retry logic tests
- Tool-specific tests (if added)

### Development Workflow

1. Make changes to source files in `src/`
2. Run tests: `npm test`
3. Build: `npm run build`
4. Restart Claude Desktop to reload the server

### Debugging

The server logs to stderr. You'll see:

**Cache hits**:
```
[CACHE HIT] Page abc123 served from cache
```

**Cache misses**:
```
[CACHE MISS] Fetching page abc123 from Notion API
```

**Rate limits**:
```
Rate limited. Waiting 2000ms before retry 1/3
```

To view logs, run Claude Desktop from terminal or check log files.

## Testing Cache

1. Check initial stats: `"Get cache stats"`
2. Fetch a page: `"Fetch page [id]"` (slow - API call)
3. Check stats: `"Get cache stats"` (should show 1 cached item)
4. Fetch same page: `"Fetch page [id]"` (fast - from cache)
5. Wait 5 minutes (or configured TTL)
6. Fetch again: `"Fetch page [id]"` (slow - cache expired)

## Troubleshooting

### "No results found" when searching

**Cause**: Pages not shared with the integration

**Solution**: Open pages in Notion → "..." menu → "Connections" → Add your integration

### "No databases found"

**Cause**: Databases not shared with the integration

**Solution**: Share at least one page that's a child of the database, or share the database directly

### Cache not working

**Cause**: Caching disabled in configuration

**Solution**: Check `src/config.json` and ensure `caching.enabled: true`

### Parameters not being accepted

**Cause**: Old build or incorrect tool registration

**Solution**:
1. Rebuild: `npm run build`
2. Restart Claude Desktop
3. Verify path in Claude config is correct

### Server won't start

**Possible causes**:
- `NOTION_TOKEN` not set in Claude Desktop config
- Invalid token format (must start with `secret_`)
- Wrong Node.js version (requires 24.11.0)
- Build directory missing (`npm run build`)

## Performance Tips

1. **Enable caching**: Dramatically reduces API calls for frequently accessed content
2. **Adjust TTL**: Lower TTL for frequently changing content, higher for static content
3. **Use filtering**: Exclude irrelevant pages to reduce search result sizes
4. **Monitor cache stats**: Regularly check cache performance

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
