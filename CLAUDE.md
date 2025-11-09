# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**custom-notion-mcp-ts** is a production-ready TypeScript MCP server that connects Notion workspaces to Claude Desktop. It features a modular architecture with smart capabilities including caching, filtering, error handling, and comprehensive block type support.

The project uses:
- `@modelcontextprotocol/sdk` for stdio-based MCP communication
- `@notionhq/client` for Notion API integration
- `Vitest` for testing with coverage
- Modular architecture with separated concerns

## Development Commands

```bash
# Install dependencies
npm install

# Build (TypeScript → JavaScript in build/)
npm run build

# Run tests with coverage
npm test

# Run server manually (requires NOTION_TOKEN env var)
node build/index.js
```

## Project Structure

```
src/
├── server/
│   ├── tools/              # MCP tool implementations
│   │   ├── searchNotion.ts      # Search pages tool
│   │   ├── fetchPage.ts         # Fetch page content tool
│   │   ├── queryDatabase.ts     # Query database tool
│   │   ├── listDatabases.ts     # List databases tool
│   │   └── getCacheStats.ts     # Cache statistics tool
│   ├── index.ts            # Server setup & tool registration
│   └── config.ts           # Configuration loader
├── utils/
│   ├── cache.ts            # In-memory cache with TTL
│   ├── withRetry.ts        # Retry logic with exponential backoff
│   ├── filter.ts           # Filtering utilities
│   ├── extractors.ts       # Data extraction helpers
│   └── logger.ts           # Logging utilities
├── domain.ts               # TypeScript interfaces
├── config.json             # Configuration file
└── index.ts                # Entry point
test/
├── cache.test.ts           # Cache unit tests
└── withRetry.test.ts       # Retry logic tests
```

## Architecture Patterns

### Modular Design

Each tool is a separate module that exports a registration function:

```typescript
export function registerSearchTool(mcpServer: McpServer) {
    mcpServer.tool("search_notion", description, schema, handler);
}
```

Tools are registered in [src/server/index.ts](src/server/index.ts#L33-L37).

### Dependency Injection

Tools receive dependencies (cache, config) as parameters:

```typescript
registerFetchPageTool(mcpServer, globalCache);
registerQueryDatabaseTool(mcpServer, globalCache);
```

### Functional Composition

Utilities like `withRetry` wrap async operations for reusability:

```typescript
const page = await withRetry(() => notion.pages.retrieve({ page_id }));
```

## Configuration System

Located at [src/config.json](src/config.json):

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

Loaded in [src/server/config.ts](src/server/config.ts) with defaults fallback.

## MCP Tools Implemented

### 1. search_notion
**File**: [src/server/tools/searchNotion.ts](src/server/tools/searchNotion.ts)

Searches Notion workspace and returns filtered page results.

**Key features**:
- Uses Notion search API
- Applies configuration-based filtering
- Handles two title extraction patterns (properties vs direct title)
- Generates clean URLs (hyphens removed from IDs)

### 2. fetch_page
**File**: [src/server/tools/fetchPage.ts](src/server/tools/fetchPage.ts)

Fetches page content with comprehensive block type support.

**Supported blocks**:
- Paragraphs, headings (H1-H3)
- Lists (bulleted, numbered, to-do)
- Code blocks (with language syntax)
- Quotes, toggles, dividers
- Child pages and databases (with URLs)

**Key features**:
- Cache-first strategy
- Logs cache hits/misses
- Extracts 10+ block types
- Shows child page hierarchy

### 3. query_database
**File**: [src/server/tools/queryDatabase.ts](src/server/tools/queryDatabase.ts)

Queries database and returns all entries with formatted properties.

**Supported properties**:
- title, rich_text, number
- select, multi_select, status
- date, checkbox
- url, email, phone_number

**Key features**:
- Cache-first strategy
- Fetches database metadata + entries
- Formats output with property schema
- Logs cache hits/misses

### 4. list_databases
**File**: [src/server/tools/listDatabases.ts](src/server/tools/listDatabases.ts)

Discovers databases by examining page parent relationships.

**Discovery strategy**:
1. Search all objects
2. Find direct database objects
3. Extract database IDs from page parents (`parent.database_id`)
4. Fetch metadata for unique database IDs
5. Apply filtering

**Why this works**: Notion search returns database entries (pages) more reliably than database containers. This tool intelligently infers databases from their children.

### 5. get_cache_stats
**File**: [src/server/tools/getCacheStats.ts](src/server/tools/getCacheStats.ts)

Returns cache statistics for monitoring.

**Returns**:
- Cache status (enabled/disabled)
- Number of cached items
- TTL setting in minutes

## Smart Features

### 1. Caching Layer
**File**: [src/utils/cache.ts](src/utils/cache.ts)

**Implementation**: `SimpleCache` class with TTL-based expiration

```typescript
class SimpleCache {
    get<T>(key: string): T | null    // Returns null if expired/missing
    set<T>(key: string, data: T)     // Stores with timestamp
    clear()                          // Clears all entries
    getStats()                       // Returns size and TTL
}
```

**Cache keys**:
- Pages: `page:${page_id}`
- Databases: `database:${database_id}`

**Behavior**:
- Checks config.caching.enabled before operations
- Logs cache hits/misses to stderr
- Automatically expires based on TTL

### 2. Error Handling with Retry
**File**: [src/utils/withRetry.ts](src/utils/withRetry.ts)

**Features**:
- Retries rate limit errors (429) with exponential backoff
- Respects `Retry-After` header
- Retries connection errors (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)
- Max 3 attempts
- Detailed error logging

**Usage**:
```typescript
const result = await withRetry(() => notion.api.call());
```

### 3. Filtering System
**File**: [src/utils/filter.ts](src/utils/filter.ts)

**Helper function**: `shouldFilterItem(title, id, type)`

**Filtering logic**:
1. Check exclude keywords (case-insensitive)
2. Check exclude IDs
3. Check include-only IDs (whitelist)

Returns `true` if item should be filtered out.

### 4. Data Extraction
**File**: [src/utils/extractors.ts](src/utils/extractors.ts)

Reusable functions for extracting data from Notion API responses (if implemented).

## Testing

Tests are written with Vitest and located in `test/`.

### Running Tests

```bash
npm test              # Run all tests with coverage
npm run test          # Same as above
```

### Test Files

**[test/cache.test.ts](test/cache.test.ts)**:
- Set and get values
- TTL expiration
- Clear all entries

**[test/withRetry.test.ts](test/withRetry.test.ts)**:
- Retry logic (if implemented)

### Adding Tests

1. Create `test/<module>.test.ts`
2. Import from `src/` using `.js` extension (ES modules)
3. Use Vitest's `describe`, `it`, `expect`

## Common Development Tasks

### Adding a New Tool

1. Create `src/server/tools/newTool.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerNewTool(mcpServer: McpServer) {
    mcpServer.tool(
        "tool_name",
        "Description",
        { param: z.string().describe("Param description") },
        async ({ param }) => {
            // Implementation
            return {
                content: [{
                    type: "text",
                    text: "Result"
                }]
            };
        }
    );
}
```

2. Register in [src/server/index.ts](src/server/index.ts):
```typescript
import { registerNewTool } from "./tools/newTool.js";
registerNewTool(mcpServer);
```

3. Rebuild and test

### Adding Support for New Block Types

Edit [src/server/tools/fetchPage.ts](src/server/tools/fetchPage.ts), add case to switch statement:

```typescript
case "new_block_type":
    if (b.new_block_type?.rich_text?.length) {
        return formatBlockContent(b.new_block_type.rich_text);
    }
    break;
```

### Modifying Filtering Logic

Edit [src/utils/filter.ts](src/utils/filter.ts) or [src/config.json](src/config.json).

### Adjusting Cache Behavior

Edit [src/utils/cache.ts](src/utils/cache.ts) or [src/config.json](src/config.json).

## Key Technical Details

### Zod Schema Format

Tools MUST use Zod schemas for parameters:

```typescript
// Correct
{ param: z.string().describe("Description") }

// Incorrect (will not work)
{ param: { type: "string", required: true } }
```

### Title Extraction Patterns

Notion API returns titles in different formats:

**Pattern 1** (database pages):
```typescript
if ('properties' in r && r.properties) {
    const titleProp = Object.values(r.properties).find(
        prop => prop.type === "title" && prop.title?.length
    );
    title = titleProp?.title?.[0]?.plain_text;
}
```

**Pattern 2** (databases themselves):
```typescript
if ('title' in r && r.title?.[0]?.plain_text) {
    title = r.title[0].plain_text;
}
```

### URL Generation

Clean Notion URLs by removing hyphens:

```typescript
const cleanId = id.replace(/-/g, "");
const url = `https://www.notion.so/${cleanId}`;
```

### Logging

Use [src/utils/logger.ts](src/utils/logger.ts):

```typescript
import { log } from "../utils/logger.js";

log.info("Server started");
log.error("Error details");
```

Logs go to stderr (visible in Claude Desktop console).

## Debugging

### View Cache Behavior

Check stderr logs for:
- `[CACHE HIT] Page abc123 served from cache`
- `[CACHE MISS] Fetching page abc123 from Notion API`

### Monitor Retry Attempts

Look for:
- `Rate limited. Waiting 2000ms before retry 1/3`
- `Connection error: ECONNREFUSED. Retry 1/3`

### Test Configuration Loading

Check stderr on startup:
- `Loaded configuration from config.json`
- `Failed to load config.json, using defaults: <error>`

## Common Issues and Solutions

### Build Errors

**Issue**: `Cannot find module` errors

**Solution**: Ensure imports use `.js` extension (ES modules):
```typescript
import { helper } from "./utils/helper.js";  // Correct
import { helper } from "./utils/helper";     // Wrong
```

### Tests Not Finding Modules

**Issue**: Test imports fail

**Solution**: Use `.js` extensions in test imports:
```typescript
import { SimpleCache } from "../src/utils/cache.js";
```

### Configuration Not Loading

**Issue**: Config changes not taking effect

**Solution**:
1. Check `src/config.json` exists
2. Rebuild: `npm run build`
3. Verify JSON syntax is valid

### Cache Not Working

**Issue**: All requests hit API

**Solution**:
1. Check `config.caching.enabled: true`
2. Verify cache is injected into tools
3. Check stderr for cache logs

## Extension Points

### Adding Persistent Cache

Replace [src/utils/cache.ts](src/utils/cache.ts) with Redis/file-based implementation:

```typescript
class RedisCache implements CacheInterface {
    async get<T>(key: string): Promise<T | null> { }
    async set<T>(key: string, data: T): Promise<void> { }
}
```

### Adding More Property Types

Edit [src/server/tools/queryDatabase.ts](src/server/tools/queryDatabase.ts), add to switch statement:

```typescript
case "people":
    props[propName] = prop.people?.map(p => p.name).join(", ");
    break;
case "files":
    props[propName] = prop.files?.map(f => f.name).join(", ");
    break;
```

### Implementing Pagination

Wrap Notion API calls in pagination helper:

```typescript
async function fetchAllPages(fn) {
    let results = [];
    let cursor = undefined;

    do {
        const response = await fn({ start_cursor: cursor });
        results.push(...response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return results;
}
```

## Resources

- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [Notion API Reference](https://developers.notion.com/reference)
- [Vitest Documentation](https://vitest.dev)
- [Zod Documentation](https://zod.dev)

## Security Notes

- Never commit `NOTION_TOKEN` to git
- Token stored in Claude Desktop config (outside repo)
- `config.json` may contain sensitive page/database IDs (not ignored by default)
- Consider uncommenting `# config.json` in `.gitignore` if your config contains sensitive data
