import { z } from "zod";
import { Client } from "@notionhq/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRetry } from "../../utils/withRetry.js";
import { extractTitle, notionUrl } from "../../utils/extractors.js";
import { log } from "../../utils/logger.js";
import { SimpleCache } from "../../utils/cache.js";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Register query_database tool
 */
export function registerQueryDatabaseTool(mcpServer: McpServer, cache: SimpleCache) {
    mcpServer.tool(
        "query_database",
        "Query a Notion database to retrieve its entries/rows with their properties",
        {
            database_id: z.string().describe("The Notion database ID (with or without hyphens)"),
        },
        async ({ database_id }) => {
            const cacheKey = `database:${database_id}`;
            const cached = cache.get<string>(cacheKey);

            if (cached) {
                log.info(`[CACHE HIT] Database ${database_id} served from cache`);
                return {
                    content: [
                        {
                            type: "text", 
                            text: cached
                        }
                    ]
                };
            }

            log.info(`[CACHE MISS] Querying database ${database_id} from Notion API`);

            // First get database metadata to understand its structure
            const database = await withRetry(() =>
                notion.databases.retrieve({ database_id })
            ) as any;

            const dbTitle = Array.isArray(database.title) && database.title.length
                ? database.title[0].plain_text
                : "Untitled Database";

            const propertyNames = Object.keys(database.properties || {});

            // Query the database to get all entries
            const response = await withRetry(() =>
                (notion.databases as any).query({ database_id })
            ) as any;

            if (!response.results.length) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Database: ${dbTitle}\n\nThis database is empty (no entries found).`,
                        },
                    ],
                };
            }

            // Format the entries
            const entries = response.results.map((page: any) => {
                const props: Record<string, string> = {};

                for (const propName of propertyNames) {
                    props[propName] = formatProperty(page.properties[propName]);
                }

                return {
                    props,
                    url: notionUrl(page.id),
                };
            });

            // Format output
            const dbUrl = notionUrl(database_id);
            let output = `Database: ${dbTitle}\nURL: ${dbUrl}\nEntries: ${entries.length}\n\n`;
            output += `Properties: ${propertyNames.join(", ")}\n\n--- Entries ---\n\n`;

            entries.forEach((entry: any, i: any) => {
                output += `Entry ${i + 1}:\n`;
                for (const [key, value] of Object.entries(entry.props)) {
                    if (value) output += `  ${key}: ${value}\n`;
                }
                output += `  URL: ${entry.url}\n\n`;
            });

            // Store in cache
            cache.set(cacheKey, output);

            return {
                content: [{ type: "text", text: output }],
            };
        }
    );
    log.info("[query_database] Tool registered.");
}

/**
 * turn property into String
 */
function formatProperty(prop: any): string {
    if (!prop) return "";

    switch (prop.type) {
        case "title":
            return prop.title?.map((t: any) => t.plain_text).join("") || "";
        case "rich_text":
            return prop.rich_text?.map((t: any) => t.plain_text).join("") || "";
        case "number":
            return prop.number?.toString() || "";
        case "select":
            return prop.select?.name || "";
        case "multi_select":
            return prop.multi_select?.map((s: any) => s.name).join(", ") || "";
        case "date":
            return prop.date?.start || "";
        case "checkbox":
            return prop.checkbox ? "✓" : "✗";
        case "url":
            return prop.url || "";
        case "email":
            return prop.email || "";
        case "phone_number":
            return prop.phone_number || "";
        case "status":
            return prop.status?.name || "";
        default:
            return `[${prop.type}]`;
    }
}
