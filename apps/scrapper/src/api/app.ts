import express, { type Express } from "express";
import redis from "../providers/cache/redis.js";
import { runScrape } from "../jobs/runScrape.js";
import manager from "../core/catalog/manager.js";
import { CATALOG_CONFIG } from "../config/catalog.js";
import SupabaseDatabaseInstance from "../providers/database/supabase.js";
import {
  buildSelectionFromRequest,
  validateScrapeRequest,
} from "./validations/scrapeValidation.js";

const app: Express = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/v1/categories", (_req, res) => {
  const categories = Object.keys(CATALOG_CONFIG).map((key) => {
    const cat = CATALOG_CONFIG[key]!;

    const formatSubCat = (subCats: Record<string, any>) =>
      Object.entries(subCats).map(([name, details]) => ({
        name,
        websites: Object.keys(details.baseConfig || details.urls || {}),
        defaults: {
          minPrice: details.minPrice,
          maxPrice: details.maxPrice,
          maxDiscount: details.maxDiscount,
        },
      }));

    return {
      id: key,
      name: key,
      subCategories: [
        ...formatSubCat(cat.subCategories),
        ...formatSubCat(cat.lowPriorityCategories || {}),
      ],
    };
  });
  res.status(200).json(categories);
});

app.post("/v1/scrape", async (req, res) => {
  const body = req?.body ?? {};
  const validationResult = validateScrapeRequest(body);

  if (typeof validationResult === "string") {
    return res
      .status(400)
      .json({ status: "invalid_request", error: validationResult });
  }

  try {
    const selection = buildSelectionFromRequest(validationResult);
    void runScrape(selection, SupabaseDatabaseInstance, redis);
    return res.status(200).json({ status: "completed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to run scrape";
    return res.status(500).json({ status: "error", error: msg });
  }
});

export default app;
