import { runScrape } from "./jobs/runScrape.js";
import manager from "./core/catalog/manager.js";
import SupabaseDatabaseInstance from "./providers/database/supabase.js";
import redis from "./providers/cache/redis.js";

async function main() {
  const selection = manager.run();
  await runScrape(selection, SupabaseDatabaseInstance, redis);
}

void main();
