import { z } from "zod";
import type { SelectionResult, E_COMMERCE, ScrapeFilters, SubCategory } from "../../types/common.js";
import { URLBuilder } from "../../core/crawler/utils/URLBuilder.js";
import { CATALOG_CONFIG } from "../../config/catalog.js";

const scrapeFiltersSchema = z.object({
  available: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  maxBrandDiscount: z.number().min(0).optional(),
  maxDiscountForFullPageScreenshot: z.number().min(0).optional(),
});

const scrapeRequestSchema = z.object({
  category: z.string().trim().min(1, "category is required"),
  subCategoryName: z.string().trim().min(1, "subCategoryName is required"),
  websites: z
    .array(z.string().transform((val) => val.toLowerCase() as "amazon" | "flipkart"))
    .min(1, "at least one website is required"),
  maxProducts: z.number().min(1).optional().default(10),
  filters: scrapeFiltersSchema.optional(),
});

export type ScrapeRequestBody = z.infer<typeof scrapeRequestSchema>;

export function buildSelectionFromRequest(
  request: ScrapeRequestBody
): SelectionResult {
  const { category: categoryName, subCategoryName, websites, maxProducts, filters = {} } = request;

  // Case-insensitive category lookup
  const categoryKey = Object.keys(CATALOG_CONFIG).find(
    (k) => k.toLowerCase() === categoryName.toLowerCase()
  );

  const categoryConfig = categoryKey ? CATALOG_CONFIG[categoryKey] : undefined;

  if (!categoryConfig) {
    throw new Error(`Category ${categoryName} not found in config`);
  }

  // Case-insensitive subcategory lookup
  const subCategoryKey = Object.keys(categoryConfig.subCategories).find(
    (k) => k.toLowerCase() === subCategoryName.toLowerCase()
  );

  let subCatDetails = subCategoryKey ? categoryConfig.subCategories[subCategoryKey] : undefined;

  if (!subCatDetails && categoryConfig.lowPriorityCategories) {
    const lowPriorityKey = Object.keys(categoryConfig.lowPriorityCategories).find(
      (k) => k.toLowerCase() === subCategoryName.toLowerCase()
    );
    subCatDetails = lowPriorityKey ? categoryConfig.lowPriorityCategories[lowPriorityKey] : undefined;
  }

  if (!subCatDetails) {
    throw new Error(`Subcategory ${subCategoryName} not found in category ${categoryName}`);
  }

  // Merge filters with subCatDetails defaults
  const mergedFilters: ScrapeFilters = {
    minPrice: filters.minPrice ?? subCatDetails.minPrice,
    maxPrice: filters.maxPrice ?? subCatDetails.maxPrice,
    maxDiscount: filters.maxDiscount ?? subCatDetails.maxDiscount,
    maxBrandDiscount: filters.maxBrandDiscount ?? subCatDetails.maxBrandDiscount,
    maxDiscountForFullPageScreenshot: filters.maxDiscountForFullPageScreenshot ?? subCatDetails.maxDiscountForFullPageScreenshot,
    available: filters.available,
    rating: filters.rating,
  };

  const generatedUrls: Record<string, string> = {};

  websites.forEach(site => {
    const base = subCatDetails.baseConfig?.[site];
    if (base) {
      generatedUrls[site] = URLBuilder.build(site as E_COMMERCE, base, mergedFilters);
    } else {
      // Fallback to static URL if baseConfig is missing
      generatedUrls[site] = subCatDetails.urls[site as E_COMMERCE] || "";
    }
  });

  const finalDetails: SubCategory = {
    ...subCatDetails,
    minPrice: mergedFilters.minPrice!,
    maxPrice: mergedFilters.maxPrice!,
    maxDiscount: mergedFilters.maxDiscount!,
    maxBrandDiscount: mergedFilters.maxBrandDiscount!,
    maxDiscountForFullPageScreenshot: mergedFilters.maxDiscountForFullPageScreenshot!,
    maxProducts: maxProducts,
    urls: generatedUrls as any,
  };

  return {
    category: categoryKey || categoryName,
    tasks: [
      {
        name: subCategoryKey || subCategoryName,
        details: finalDetails,
      },
    ],
    isLowPriority: false,
  };
}

export function validateScrapeRequest(
  request: any
): ScrapeRequestBody | string {
  const result = scrapeRequestSchema.safeParse(request);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    if (firstIssue) {
      return `Invalid input: ${firstIssue.path.join(".")} - ${firstIssue.message}`;
    }
    return "Invalid request";
  }

  return result.data;
}
