interface Config {
    filtering: {
        excludeKeywords: string[];
        excludePageIds: string[];
        excludeDatabaseIds: string[];
        includeOnlyPageIds: string[];
        includeOnlyDatabaseIds: string[];
    };
    caching: {
        enabled: boolean;
        ttlMinutes: number;
    };
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export {Config, CacheEntry};