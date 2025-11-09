import { CacheEntry } from "../domain.js";
import { config } from "../server/config.js";
export class SimpleCache {
    private cache = new Map<string, CacheEntry<any>>();
    private ttlMs: number;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(ttlMinutes: number) {
        this.ttlMs = ttlMinutes * 60 * 1000;
        this.startCleanup();
    }

    private startCleanup() {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        this.cleanupInterval = setInterval(() => this.cleanup(), this.ttlMs);
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttlMs) {
                this.cache.delete(key);
            }
        }
    }

    get<T>(key: string): T | null {
        if (!config.caching.enabled) return null;

        const entry = this.cache.get(key);
        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    set<T>(key: string, data: T): void {
        if (!config.caching.enabled) return;

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clear(): void {
        this.cache.clear();
    }

    getStats(): { size: number, ttlMinutes: number } {
        return {
            size: this.cache.size,
            ttlMinutes: this.ttlMs / (60 * 1000)
        };
    }

    stop(): void {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    }
}