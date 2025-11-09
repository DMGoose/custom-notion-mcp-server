import { z } from "zod";
import { Client } from "@notionhq/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRetry } from "../../utils/withRetry.js";
import { shouldFilterItem } from "../../utils/filter.js";
import { extractTitle, notionUrl } from "../../utils/extractors.js";
import { log } from "../../utils/logger.js";

// Notion client init
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * register search_notion tool
 * @param mcpServer MCP server instance
 */
export function registerSearchTool(mcpServer: McpServer){
    mcpServer.tool(
        "search_notion",
        "Search Notion workspace by keyword and return page titles + URLs",
        {
            query: z.string().describe("The search query to find pages in Notion")
        },
        async ({ query }) => {
            const res = await withRetry(() => notion.search({ query }));
            const results = res.results
                .filter(r => r.object === "page")
                .map(r => {
                    // extract title
                    const title = extractTitle(r);
                    return { title, id: r.id, url: notionUrl(r.id) };
                })
                // Apply configuration-based filtering
                .filter(r => !shouldFilterItem(r.title, r.id, 'page'));
    
            // MCP tool handler must return an object with a `content` array.
            if (results.length === 0) {
                return {
                    content: results.map(r => ({
                        type: "text",
                        text: `No results found for "${query}".`,
                    }))
                };
            }
            
            return {
                content: results.map(r => ({
                    type: "text",
                    text: `${r.title} — ${r.url}`,
                })),
            };
    
        }
    );
    log.info("[search_notion] Tool registered.");
}