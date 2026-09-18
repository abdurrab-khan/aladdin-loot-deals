import { createClient } from "redis";
import { BaseCache } from "./interfaces.js";
import { configDotenv } from "dotenv";

configDotenv({
  path: "../../.env",
});

export class RedisDB extends BaseCache {
  private host: string;
  private port: number;
  private password: string;
  private client: any | null;

  constructor() {
    super();
    this.host = process.env["REDIS_HOST"] || "localhost";
    this.port = parseInt(process.env["REDIS_PORT"] || "6379");
    this.password = process.env["REDIS_PASSWORD"] || "";
    this.client = null;
  }

  async connect(): Promise<boolean> {
    try {
      this.client = createClient({
        socket: {
          host: this.host,
          port: this.port,
          connectTimeout: 2000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              return new Error("Max retries reached");
            }
            return Math.min(retries * 100, 3000);
          },
        },
        password: this.password,
      });

      this.client.on("error", (err: any) => {
        console.error("Redis error:", err);
      });

      await this.client.connect();
      await this.client.ping();
      console.log("Redis connected.");
      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        console.log("Redis disconnected.");
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Error during Redis disconnect:", error.message);
      return false;
    }
  }

  async isUrlCached(
    url: string,
    pattern: string = "url_cache_*",
  ): Promise<boolean> {
    if (!this.client) {
      console.warn("Redis client not connected.");
      return false;
    }

    try {
      let cursor = "0";

      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor.toString();
        const keys = result.keys;

        if (keys.length === 0) {
          if (cursor === "0") {
            break;
          }
          continue;
        }

        for (const key of keys) {
          const exists = await this.client.sIsMember(key, url);
          if (exists) {
            return true;
          }
        }
      } while (cursor !== "0");

      return false;
    } catch (error: any) {
      console.error("Error checking URL cache:", error.message);
      return false;
    }
  }
}

const redis = new RedisDB();

export default redis;
