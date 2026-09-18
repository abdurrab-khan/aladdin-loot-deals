import { randomUUID } from "node:crypto";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { cleanData, hasRequiredDetails } from "./helper.js";
import { randomDelay, isValidProductDeal } from "./utils.js";

import { PRODUCT_DETAILS, PRODUCT_CARD_SELECTOR } from "../css_selectors.js";
import type {
  E_COMMERCE,
  SubCategory,
  ProductSelector,
  ProductSelectorValue,
} from "../../../types/common.js";
import type { Browser, ElementHandle, Page } from "playwright";
import type { GroupProductDetails, Product } from "../../../types/product.js";

class CrawlerUtils {
  private website: E_COMMERCE;
  private subCategory: string;
  private subCategoryDetails: SubCategory;
  private ProductPrivateInfo: Record<
    "userId" | "platformId",
    string
  >;

  constructor(
    _browser: Browser,
    _page: Page,
    website: E_COMMERCE,
    subCategory: string,
    subCategoryDetails: SubCategory,
    productPrivateInfo: Record<
      "userId" | "platformId",
      string
    >,
  ) {
    this.website = website;
    this.subCategory = subCategory;
    this.subCategoryDetails = subCategoryDetails;
    this.ProductPrivateInfo = productPrivateInfo;
  }

  public async navigateToUrl(
    page: Page,
    url: string,
    showRandomDelay = true,
    waitSelector: string = PRODUCT_CARD_SELECTOR[this.website],
    timeout = 60000,
  ): Promise<void> {
    try {
      const nRes = await page.goto(url, {
        timeout,
        waitUntil: "domcontentloaded",
      });

      if (nRes === null || !nRes.ok()) {
        throw new Error(
          `Navigation to ${url} failed with status ${nRes?.status()}`,
        );
      }

      await this.waitForPageLoad(page, waitSelector, showRandomDelay);
    } catch (error) {
      const errMsg =
        (error as Error).message ?? "An error occurred during navigation";
      throw new Error("Navigation error: " + errMsg);
    }
  }

  public async extractProductData(
    product: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<ProductSelectorValue | null> {
    if (!product) return null;

    const productCSSSelector = PRODUCT_DETAILS[this.website];

    try {
      const productDetails = Object.fromEntries(
        await Promise.all(
          Object.entries(productCSSSelector).map(async ([key, selector]) => {
            const typedKey = key as ProductSelector;
            if (!selector.trim()) throw new Error("Invalid selector");

            const element = await product.$(selector);
            const value = await cleanData(typedKey, element, this.website);

            if (!value && !hasRequiredDetails(typedKey, value)) {
              // For Amazon, if price is missing but discountPrice is present,
              // we can treat it as no discount (price = discountPrice)
              if (this.website === "amazon" && typedKey === "price") {
                return [typedKey, null];
              }
              throw new Error(`Missing required detail for key: ${typedKey}`);
            }

            return [typedKey, value];
          }),
        ),
      ) as ProductSelectorValue;

      // Handle missing original price
      if (
        productDetails.price === null &&
        productDetails.discountPrice !== null
      ) {
        productDetails.price = productDetails.discountPrice;
      }

      if (!productDetails.brand)
        productDetails.brand = productDetails.name.split(" ")[0] ?? "Unknown";

      const hasValidDetails = isValidProductDeal(
        productDetails.price,
        productDetails.discountPrice,
        this.subCategoryDetails.minPrice,
        this.subCategoryDetails.maxPrice,
        this.subCategoryDetails.maxDiscount,
      );

      if (!hasValidDetails) {
        // Log why it's invalid for debugging
        // const price = productDetails.price;
        // const discountPrice = productDetails.discountPrice;
        // const discountPercent = price && discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;
        // console.log(`Invalid deal: ${productDetails.name} | P: ${price} | DP: ${discountPrice} | %: ${discountPercent} | Target %: ${this.subCategoryDetails.maxDiscount}`);
      }

      return hasValidDetails ? productDetails : null;
    } catch (error) {
      console.log(
        `Error extracting product data:`,
        (error as Error).message ?? " error",
      );
      return null;
    }
  }

  public async waitForPageLoad(
    page: Page,
    selector?: string,
    showAdditionalDelay = true,
    timeout = 60000,
  ): Promise<void> {
    try {
      await page
        .waitForLoadState("networkidle", { timeout: 30000 })
        .catch(() => {});
      await page.waitForLoadState("load", { timeout });

      if (selector) {
        // Wait for at least one product card to be visible
        await page.waitForSelector(selector, {
          state: "visible",
          timeout,
        });
      }

      // If there's a spinner, wait for it to disappear
      const spinnerSelector = "div.s-spinner, .s-loading-spinner";
      if (await page.$(spinnerSelector)) {
        await page
          .waitForSelector(spinnerSelector, { state: "hidden", timeout: 10000 })
          .catch(() => {});
      }

      if (showAdditionalDelay) {
        await page.waitForTimeout(randomDelay(2, 5));
      }
    } catch (error) {
      throw error;
    }
  }

  public async getBrandProducts(
    _page: Page,
    products: ElementHandle<SVGElement | HTMLElement>[],
  ): Promise<Product | null> {
    if (!products || products.length === 0) return null;

    const productId = randomUUID();

    const productDetails = await Promise.all(
      products.map(async (product, i) => {
        const details = await this.extractProductData(product);
        if (details) return details;
        if (i < 3) throw new Error(`No valid products found for this brand`);
        return null;
      }),
    )
      .then((results) =>
        results.filter((val): val is ProductSelectorValue => val !== null),
      )
      .catch((error) => {
        console.error(
          "Error extracting product details for brand:",
          (error as Error).message ?? " error",
        );
        return [];
      });

    if (productDetails.length >= 3) {
      productDetails.sort(
        (a, b) =>
          (a.discountPrice || a.price || Infinity) -
          (b.discountPrice || b.price || Infinity),
      );

      // Take screenshot of the first product card as the "group" representation
      const cardScreenshotPath = await this.takeCardScreenshot(
        products[0]!,
        productId,
      );

      return {
        id: productId,
        name: "Grouped " + productDetails[0]?.brand + " Products",
        category: this.subCategory,
        url: "",
        details: {
          brand: productDetails[0]?.brand || "Various",
          startPrice: productDetails[0]?.price || 0,
          discountStartPrice: productDetails[0]?.discountPrice || 0,
          productCount: productDetails.length,
          avgRating:
            parseFloat(
              (
                productDetails.reduce((sum, p) => sum + (p.rating || 0), 0) /
                productDetails.filter((p) => p.rating).length
              ).toFixed(2),
            ) || undefined,
          totalReviews:
            productDetails.reduce((sum, p) => sum + (p.reviews || 0), 0) ||
            undefined,
        } as GroupProductDetails,
        images: {
          card: productDetails[0]?.images || "",
          image: productDetails.map((p) => p.images as string),
          fullPage: null,
        },
        screenshotInfo: {
          fullPageRequired: false,
          grouped: true,
          website: this.website,
          priceDetails: {
            minPrice: this.subCategoryDetails.minPrice,
            maxPrice: this.subCategoryDetails.maxPrice,
            discount: this.subCategoryDetails.maxBrandDiscount,
          },
        },
        isGrouped: true,
        userId: this.ProductPrivateInfo.userId,
        platformId: this.ProductPrivateInfo.platformId,
        cardScreenshotPath: cardScreenshotPath || undefined,
      };
    }
    return null;
  }

  public async takeCardScreenshot(
    element: ElementHandle<SVGElement | HTMLElement>,
    productId: string,
  ): Promise<string | null> {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = nodePath.dirname(__filename);
      const productImagesDir = nodePath.resolve(
        __dirname,
        "../../../../../product_images",
      );

      await mkdir(productImagesDir, { recursive: true });

      const path = nodePath.join(
        productImagesDir,
        `card_${productId}_image.png`,
      );

      await element.screenshot({ path, type: "png" });
      return path;
    } catch (error) {
      console.warn(
        `Failed to take card screenshot for product ${productId}:`,
        error,
      );
      return null;
    }
  }

  static generateRandomUserAgent = (): string => {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${100 + Math.floor(Math.random() * 15)}.0.${4000 + Math.floor(Math.random() * 1793)}.${10 + Math.floor(Math.random() * 130)} Safari/537.36`;
  };
}

export default CrawlerUtils;
