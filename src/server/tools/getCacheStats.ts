import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SimpleCache } from "../../utils/cache.js";
import { config } from "../config.js";
import { log } from "../../utils/logger.js";

/**
 * Register get_cache_stats tool
 */
export function registerGetCacheStatsTool(mcpServer: McpServer, cache: SimpleCache) {
  mcpServer.tool(
    "get_cache_stats",
    "Get cache statistics including size, TTL settings, and optional clear action",
    {
      action: z
        .enum(["show", "clear"])
        .optional()
        .describe('Optional action: "show" (default) or "clear" to empty cache.'),
    },
    async ({ action = "show" }) => {
      if (action === "clear") {
        cache.clear();
        log.info("[get_cache_stats] Cache cleared manually.");
        return {
          content: [
            {
              type: "text",
              text: "Cache cleared successfully.",
            },
          ],
        };
      }

      const stats = cache.getStats();
      const cacheStatus = config.caching.enabled ? "Enabled" : "Disabled";

      const message = [
        `Cache Status: ${cacheStatus}`,
        `Cached Items: ${stats.size}`,
        `TTL: ${stats.ttlMinutes} minutes`,
        "",
        "To test cache:",
        "1. Fetch a page (it will cache it).",
        "2. Run get_cache_stats (size should increase).",
        "3. Fetch the same page again (should be instant - from cache).",
        `4. Wait ${stats.ttlMinutes} minutes and fetch again (cache expires).`,
      ].join("\n");

      return {
        content: [
          { type: "text", text: message },
        ],
      };
    }
  );

  log.info("[get_cache_stats] Tool registered.");
}
