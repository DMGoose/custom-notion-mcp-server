// Helper function to check if an item should be filtered

import { config } from "../server/config.js";
export function shouldFilterItem(title: string, id: string, type: 'page' | 'database'): boolean {
    const titleLower = title.toLowerCase();

    // Check exclude keywords
    for (const keyword of config.filtering.excludeKeywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
            return true; // Filter out
        }
    }

    // Check exclude IDs
    const excludeIds = type === 'page' ? config.filtering.excludePageIds : config.filtering.excludeDatabaseIds;
    if (excludeIds.includes(id)) {
        return true; // Filter out
    }

    // Check include-only lists (if specified)
    const includeOnlyIds = type === 'page' ? config.filtering.includeOnlyPageIds : config.filtering.includeOnlyDatabaseIds;
    if (includeOnlyIds.length > 0 && !includeOnlyIds.includes(id)) {
        return true; // Filter out (not in include list)
    }

    return false; // Don't filter
}