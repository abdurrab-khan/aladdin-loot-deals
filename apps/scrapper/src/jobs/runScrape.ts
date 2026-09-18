import { rm } from "fs/promises";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import type { BaseDatabase } from "../providers/database/interfaces.js";
import type { BaseCache } from "../providers/cache/interfaces.js";
import {
  enqueueFullScreenshot,
  enqueueGroupedScreenshot,
  toScreenshotWebsite,
} from "../providers/screenshot/client.js";
import { scrapeProducts } from "../core/crawler/scrapper.js";
import { randomDelay } from "../core/crawler/utils/utils.js";
import type { SelectionResult, ScrapeTask } from "../types/common.js";
import type { Product } from "../types/product.js";

/**
 * Orchestrates the scraping process for a list of selections.
 */
export async function runScrape(
  input: SelectionResult | SelectionResult[],
  db: BaseDatabase,
  cache: BaseCache,
): Promise<void> {
  const selections = Array.isArray(input) ? input : [input];

  try {
    for (let i = 0; i < selections.length; i++) {
      const selection = selections[i]!;
      await processSelection(selection, db, cache);

      if (i < selections.length - 1) {
        await new Promise((res) => setTimeout(res, randomDelay(120, 300)));
      }
    }
  } catch (err) {
    handleError(err);
  } finally {
    await cleanupTempFiles();
  }
}

/**
 * Processes all tasks within a single category selection.
 */
async function processSelection(
  selection: SelectionResult,
  db: BaseDatabase,
  cache: BaseCache,
) {
  const { category, tasks } = selection;

  if (tasks.length === 0) {
    console.warn(`No tasks found for category: ${category}`);
    return;
  }

  for (const task of tasks) {
    await processTask(category, task, db, cache);
  }
}

/**
 * Performs the scrape, database save, and screenshot enqueuing for a single task.
 */
async function processTask(
  category: string,
  task: ScrapeTask,
  db: BaseDatabase,
  cache: BaseCache,
) {
  console.log(`Starting ${category}:${task.name} product scraping...`);

  const scrappedProducts = await scrapeProducts(task.name, task.details, cache);

  if (!scrappedProducts || scrappedProducts.length === 0) {
    console.warn(`No products scraped for ${category}:${task.name}.`);
    return;
  }

  console.log(`Scraped ${scrappedProducts.length} products.`);

  const insertedProducts = await db.saveProducts(scrappedProducts);

  if (insertedProducts.length === 0) {
    console.warn(`No products inserted for ${category}:${task.name}.`);
    return;
  }

  // Ensure image rows exist before enqueuing screenshots
  await db.ensureProductImageRows(insertedProducts);

  // Upload card screenshots immediately
  await uploadCardScreenshots(insertedProducts, db);

  await enqueueScreenshotsForProducts(insertedProducts);

  console.log(`Finished scraping for: ${category}:${task.name}\n`);
}

/**
 * Enqueues screenshots for all eligible products in parallel.
 */
async function enqueueScreenshotsForProducts(products: Product[]) {
  const screenshotTasks = products
    .filter((p) => p.id && p.screenshotInfo)
    .map(async (product) => {
      try {
        const { id, url, screenshotInfo } = product;
        if (!id || !url || !screenshotInfo) return;

        const website = toScreenshotWebsite(screenshotInfo.website);

        if (screenshotInfo.grouped && screenshotInfo.priceDetails) {
          await enqueueGroupedScreenshot({
            id,
            url,
            website,
            priceDetails: screenshotInfo.priceDetails,
          });
        } else if (screenshotInfo.fullPageRequired) {
          await enqueueFullScreenshot({ id, url, website });
        }
      } catch (error) {
        console.warn(
          `Failed to enqueue screenshot for product ${product.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    });

  await Promise.all(screenshotTasks);
}

/**
 * Uploads card screenshots for products that have them.
 */
async function uploadCardScreenshots(products: Product[], db: BaseDatabase) {
  const uploadTasks = products
    .filter((p) => p.cardScreenshotPath)
    .map(async (product) => {
      try {
        await db.uploadCardScreenshot(product);
      } catch (error) {
        console.warn(
          `Failed to upload card screenshot for product ${product.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    });

  await Promise.all(uploadTasks);
}

function handleError(err: unknown) {
  const msg = err instanceof Error ? err.message : "An unknown error occurred during scraping";
  console.error(msg);
}

async function cleanupTempFiles() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = nodePath.dirname(__filename);

    // products directory is in apps/scrapper/products
    const productsDir = nodePath.resolve(__dirname, "../../products");
    // product_images directory is in apps/product_images
    const productImagesDir = nodePath.resolve(__dirname, "../../../product_images");

    await rm(productsDir, { recursive: true, force: true });
    await rm(productImagesDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(
      "Failed to clean temporary directories:",
      error instanceof Error ? error.message : error,
    );
  }
}
