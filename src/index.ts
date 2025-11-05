import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@notionhq/client";
import { z } from "zod";


const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) process.exit(1); // exit if no token provided

// inint Notion client
const notion = new Client({ auth: NOTION_TOKEN });

// Create server instance
const mcpServer = new McpServer({
    name: "notion-mcp-ts",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// register a tool：search_notion
mcpServer.tool(
    "search_notion",
    "Search Notion workspace by keyword and return page titles + URLs",
    {
        query: z.string().describe("The search query to find pages in Notion")
    },
    async ({ query }) => {
        const res = await notion.search({ query });
        const results = res.results
            .filter(r => r.object === "page")
            .map(r => {
                // extract title
                let title = "Untitled";
                if ('properties' in r && r.properties) {
                    const titleProp = Object.values(r.properties).find(
                        prop => (prop as any).type === "title" && (prop as any).title?.length
                    );
                    if ((titleProp as any)?.title?.[0]?.plain_text)
                        title = (titleProp as any).title[0].plain_text;
                } else if ('title' in r && (r as any).title?.[0]?.plain_text) {
                    title = (r as any).title[0].plain_text;
                }

                // Notion links
                const cleanId = r.id.replace(/-/g, "");
                const url = `https://www.notion.so/${cleanId}`;

                return { title, url, id: r.id };
            });

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

// register a tool：fetch_notion_page
mcpServer.tool(
    "fetch_page",
    "Fetch a Notion page's title and plain text content by ID",
    {
        page_id: z.string().describe("The Notion page ID (with or without hyphens)")
    },
    async ({ page_id }) => {
        const page = await notion.pages.retrieve({ page_id });
        let title = "Untitled";

        if ("properties" in page && page.properties) {
            const titleProp = Object.values(page.properties).find(
                (prop: any) => prop.type === "title" && prop.title?.length
            );
            if ((titleProp as any)?.title?.[0]?.plain_text)
                title = (titleProp as any).title[0].plain_text;
        }

        const blocks = await notion.blocks.children.list({ block_id: page_id });
        const textBlocks = blocks.results
            .filter(
                (b: any) => b.type === "paragraph" && b.paragraph?.rich_text?.length
            )
            .map((b: any) =>
                b.paragraph.rich_text.map((rt: any) => rt.plain_text).join("")
            );

        const content = textBlocks.join("\n\n");
        const cleanId = page_id.replace(/-/g, "");
        const url = `https://www.notion.so/${cleanId}`;

        return {
            content: [
                {
                    type: "text",
                    text: `Title: ${title}\nURL: ${url}\n\n${content || "(empty page)"}`,
                },
            ],
        };
    }
);

// register a tool: query_database
mcpServer.tool(
    "query_database",
    "Query a Notion database to retrieve its entries/rows with their properties",
    {
        database_id: z.string().describe("The Notion database ID (with or without hyphens)")
    },
    async ({ database_id }) => {
        // First get database metadata to understand its structure
        const database = await notion.databases.retrieve({ database_id }) as any;

        let dbTitle = "Untitled Database";
        if ("title" in database && Array.isArray(database.title) && database.title.length > 0) {
            dbTitle = database.title[0].plain_text || "Untitled Database";
        }

        // Get the database properties schema
        const properties = database.properties || {};
        const propertyNames = Object.keys(properties);

        // Query the database to get all entries
        const response = await (notion.databases as any).query({ database_id });

        if (response.results.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: `Database: ${dbTitle}\n\nThis database is empty (no entries found).`
                }]
            };
        }

        // Format the entries
        const entries = response.results.map((page: any) => {
            const props: Record<string, string> = {};

            // Extract property values
            for (const propName of propertyNames) {
                const prop = page.properties[propName];
                if (!prop) continue;

                // Handle different property types
                switch (prop.type) {
                    case "title":
                        props[propName] = prop.title?.map((t: any) => t.plain_text).join("") || "";
                        break;
                    case "rich_text":
                        props[propName] = prop.rich_text?.map((t: any) => t.plain_text).join("") || "";
                        break;
                    case "number":
                        props[propName] = prop.number?.toString() || "";
                        break;
                    case "select":
                        props[propName] = prop.select?.name || "";
                        break;
                    case "multi_select":
                        props[propName] = prop.multi_select?.map((s: any) => s.name).join(", ") || "";
                        break;
                    case "date":
                        props[propName] = prop.date?.start || "";
                        break;
                    case "checkbox":
                        props[propName] = prop.checkbox ? "✓" : "✗";
                        break;
                    case "url":
                        props[propName] = prop.url || "";
                        break;
                    case "email":
                        props[propName] = prop.email || "";
                        break;
                    case "phone_number":
                        props[propName] = prop.phone_number || "";
                        break;
                    case "status":
                        props[propName] = prop.status?.name || "";
                        break;
                    default:
                        props[propName] = `[${prop.type}]`;
                }
            }

            const cleanId = page.id.replace(/-/g, "");
            const url = `https://www.notion.so/${cleanId}`;

            return { props, url };
        });

        // Format output
        const cleanDbId = database_id.replace(/-/g, "");
        const dbUrl = `https://www.notion.so/${cleanDbId}`;

        let output = `Database: ${dbTitle}\nURL: ${dbUrl}\nEntries: ${entries.length}\n\n`;
        output += `Properties: ${propertyNames.join(", ")}\n\n`;
        output += "--- Entries ---\n\n";

        entries.forEach((entry: any, idx: number) => {
            output += `Entry ${idx + 1}:\n`;
            for (const [key, value] of Object.entries(entry.props)) {
                if (value) {
                    output += `  ${key}: ${value}\n`;
                }
            }
            output += `  URL: ${entry.url}\n\n`;
        });

        return {
            content: [{
                type: "text",
                text: output
            }]
        };
    }
);

//register a tool: list_databases
mcpServer.tool(
    "list_databases",
    "List all databases in the connected Notion workspace",
    {},
    async () => {
        // Search without filter to get all objects
        const res = await notion.search({});

        // Collect unique database IDs from pages that are database children
        const databaseIds = new Set<string>();
        const databaseResults: any[] = [];
        const debugInfo: string[] = [];

        // First pass: collect direct databases and database IDs from pages
        for (const item of res.results as any[]) {
            debugInfo.push(`Object type: ${item.object}, ID: ${item.id}, Parent: ${JSON.stringify(item.parent)}`);

            // Direct database objects
            if (item.object === "database") {
                if (!databaseIds.has(item.id)) {
                    databaseIds.add(item.id);
                    databaseResults.push(item);
                }
            }
            // Pages that are children of databases - check parent structure
            else if (item.object === "page" && item.parent) {
                let dbId: string | null = null;

                // Handle different parent type structures
                if (item.parent.type === "database_id") {
                    dbId = item.parent.database_id;
                } else if (item.parent.database_id) {
                    dbId = item.parent.database_id;
                }

                if (dbId && !databaseIds.has(dbId)) {
                    databaseIds.add(dbId);
                    debugInfo.push(`Found database ID: ${dbId}, attempting to fetch...`);
                    // Fetch the database metadata
                    try {
                        const db = await notion.databases.retrieve({ database_id: dbId }) as any;
                        databaseResults.push(db);
                        debugInfo.push(`Successfully fetched database: ${dbId}`);
                    } catch (error: any) {
                        debugInfo.push(`Failed to fetch database ${dbId}: ${error.message}`);
                        console.error(`Failed to fetch database ${dbId}:`, error);
                    }
                }
            }
        }

        if (databaseResults.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No databases found in your Notion workspace. Make sure databases are shared with the integration.\n\nDebug info:\n" + debugInfo.slice(0, 10).join("\n"),
                    },
                ],
            };
        }

        // Format results
        const results = databaseResults.map(r => {
            let title = "Untitled Database";

            // extract database title - databases have title array directly
            if ("title" in r && Array.isArray(r.title) && r.title.length > 0) {
                title = r.title[0].plain_text || "Untitled Database";
            }

            const cleanId = r.id.replace(/-/g, "");
            const url = `https://www.notion.so/${cleanId}`;

            return { title, url, id: r.id };
        });

        return {
            content: results.map(r => ({
                type: "text",
                text: `${r.title} — ${r.url} (ID: ${r.id})`,
            })),
        };
    }
);


//Running the server
async function main() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});