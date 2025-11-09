import { z } from "zod";
import { Client } from "@notionhq/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRetry } from "../../utils/withRetry.js";
import { extractTitle, notionUrl } from "../../utils/extractors.js";
import { log } from "../../utils/logger.js";
import { SimpleCache } from "../../utils/cache.js";

// Notion client init
const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * register fetch_notion_page tool
 * @param mcpServer MCP server instance
 */
export function registerFetchPageTool(mcpServer: McpServer, cache: SimpleCache) {
    mcpServer.tool(
        "fetch_page",
        "Fetch a Notion page's title and plain text content by ID",
        {
            page_id: z.string().describe("The Notion page ID (with or without hyphens)")
        },
        async ({ page_id }) => {
            // Check cache first
            const cacheKey = `page:${page_id}`;
            const cached = cache.get<string>(cacheKey);
            if (cached) {
                console.error(`[CACHE HIT] Page ${page_id} served from cache`);
                return {
                    content: [
                        {
                            type: "text",
                            text: cached,
                        },
                    ],
                };
            }
            log.info(`[CACHE MISS] Fetching page ${page_id} from Notion API`);

            // Get page title
            const page = await withRetry(() => notion.pages.retrieve({ page_id }));
            const title = extractTitle(page);

            // Get block content (Pagnation)
            let allBlocks: any[] = [];
            let cursor: string | null = null;
            do {
                const response = await withRetry(() =>
                    notion.blocks.children.list({ 
                        block_id: page_id, 
                        start_cursor: cursor ?? undefined, 
                    })
                );
                allBlocks.push(...response.results);
                cursor = response.next_cursor;
            } while (cursor);


            // Turn into text
            const textBlocks = allBlocks
                .map(blockToPlainText)
                .filter(Boolean)
                .join("\n\n");

            const blocks = await withRetry(() => notion.blocks.children.list({ block_id: page_id }));
            const url = notionUrl(page_id);
            const content = `Title: ${title}\nURL: ${url}\n\n${textBlocks || "(empty page)"}`;

            // Store in cache
            cache.set(cacheKey, content);

            return {
                content: [
                    {
                        type: "text",
                        text: content,
                    },
                ],
            };
        }
    );
    log.info("[fetch_page] Tool registered.");
}


/**
 * turn block into txt
 */
function blockToPlainText(block: any): string | null {
    const getText = (arr: any[]) => arr.map((t: any) => t.plain_text).join("");

    switch (block.type) {
        case "paragraph":
            return getText(block.paragraph.rich_text || []);
        case "heading_1":
            return `# ${getText(block.heading_1.rich_text || [])}`;
        case "heading_2":
            return `## ${getText(block.heading_2.rich_text || [])}`;
        case "heading_3":
            return `### ${getText(block.heading_3.rich_text || [])}`;
        case "bulleted_list_item":
            return `• ${getText(block.bulleted_list_item.rich_text || [])}`;
        case "numbered_list_item":
            return `- ${getText(block.numbered_list_item.rich_text || [])}`;
        case "quote":
            return `> ${getText(block.quote.rich_text || [])}`;
        case "toggle":
            return `▶ ${getText(block.toggle.rich_text || [])}`;
        case "to_do":
            const checked = block.to_do.checked ? "✓" : "☐";
            return `${checked} ${getText(block.to_do.rich_text || [])}`;
        case "code":
            const code = getText(block.code.rich_text || []);
            return `\`\`\`${block.code.language || ""}\n${code}\n\`\`\``;
        case "child_page":
            return `📄 [Child Page] ${block.child_page.title} — ${notionUrl(block.id)}`;
        case "child_database":
            return `🗄️ [Child Database] ${block.child_database.title} — ${notionUrl(block.id)}`;
        case "divider":
            return "---";
        default:
            return null;
    }
}