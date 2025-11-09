import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { withRetry } from "../../utils/withRetry.js";
import { notionUrl, extractTitle } from "../../utils/extractors.js";
import { shouldFilterItem } from "../../utils/filter.js";
import { log } from "../../utils/logger.js";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

/**
 * Register list_databases tool
 */
export function registerListDatabasesTool(mcpServer: McpServer) {
  mcpServer.tool(
    "list_databases",
    "List all databases in the connected Notion workspace",
    {},
    async () => {
      log.info("[list_databases] Fetching list of databases...");

      // Search without filter to get all objects
      const res = await withRetry(() => notion.search({}));

       // Collect unique database IDs from pages that are database children
      const databaseIds = new Set<string>();
      const databaseResults: any[] = [];
      const debugInfo: string[] = [];

      // First pass: collect direct databases and database IDs from pages
      for (const item of res.results as any[]) {
        debugInfo.push(`Object type: ${item.object}, ID: ${item.id}`);

        //If it is direct database objects database, add
        if (item.object === "database") {
          if (!databaseIds.has(item.id)) {
            databaseIds.add(item.id);
            databaseResults.push(item);
          }
          continue;
        }

        // Pages that are children of databases - check parent structure
        if (item.object === "page" && item.parent) {
          const dbId =
            item.parent.database_id ||
            (item.parent.type === "database_id" ? item.parent.database_id : null);

          if (dbId && !databaseIds.has(dbId)) {
            databaseIds.add(dbId);
            // Fetch the database metadata
            try {
              const db = await withRetry(() =>
                notion.databases.retrieve({ database_id: dbId })
              );
              databaseResults.push(db);
            } catch (error: any) {
              log.warn(`Failed to fetch database ${dbId}: ${error.message}`);
            }
          }
        }
      }

      // No database
      if (databaseResults.length === 0) {
        return {
          content: [
            {
              type: "text",
              text:
                "No databases found in your Notion workspace. " +
                "Make sure your integration has access to the target pages.\n\n" +
                "Debug info:\n" +
                debugInfo.slice(0, 10).join("\n"),
            },
          ],
        };
      }

      // Format results
      const results = databaseResults
        .map((r: any) => {
          const title = extractTitle(r);
          return { title, id: r.id, url: notionUrl(r.id) };
        })
        .filter((r) => !shouldFilterItem(r.title, r.id, "database"));

      return {
        content: results.map((r) => ({
          type: "text",
          text: `${r.title} — ${r.url} (ID: ${r.id})`,
        })),
      };
    }
  );

  log.info("[list_databases] Tool registered.");
}
