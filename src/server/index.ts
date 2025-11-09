import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js"
import { log } from "../utils/logger.js";
//cache
import { SimpleCache } from "../utils/cache.js";
//tools
import { registerSearchTool } from "./tools/searchNotion.js";
import { registerFetchPageTool } from "./tools/fetchPage.js";
import { registerQueryDatabaseTool } from "./tools/queryDatabase.js";
import { registerListDatabasesTool } from "./tools/listDatabases.js";
import { registerGetCacheStatsTool } from "./tools/getCacheStats.js";

//load cache
const config = loadConfig();
const globalCache = new SimpleCache(config.caching.ttlMinutes);

const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) process.exit(1); // exit if no token provided

// Create server instance
const mcpServer = new McpServer({
    name: "notion-mcp-ts",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

//Reigster Tools
registerSearchTool(mcpServer);
registerFetchPageTool(mcpServer, globalCache);
registerQueryDatabaseTool(mcpServer, globalCache);
registerListDatabasesTool(mcpServer);
registerGetCacheStatsTool(mcpServer, globalCache);

//Running the server
async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    log.info("Notion MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});