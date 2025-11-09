import fs from "fs";
import path from "path";
import { Config } from "../domain.js"

// Load configuration
export let config: Config = {
    filtering: {
        excludeKeywords: ["deprecated", "depricated"],
        excludePageIds: [],
        excludeDatabaseIds: [],
        includeOnlyPageIds: [],
        includeOnlyDatabaseIds: []
    },
    caching: {
        enabled: true,
        ttlMinutes: 5
    }
};

export function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), "config.json");
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      config = JSON.parse(data);
      console.log("[CONFIG] Loaded configuration from config.json");
    }
  } catch (err) {
    console.error("[CONFIG] Failed to load config.json:", err);
  }
  return config;
}