import { randomUUID } from "node:crypto";
import type { Browser, ElementHandle, Page } from "playwright";
import { randomDelay } from "../utils/utils.js";
import CrawlerUtils from "../utils/crawlerUtils.js";
import BrowserUtils from "../utils/browserUtils.js";
import type { E_COMMERCE, SubCategory } from "../../../types/common.js";
import type { Product } from "../../../types/product.js";
import { ProductMapper } from "../../../providers/database/utils/product-mapper.js";
import { PRODUCT_CARD_SELECTOR } from "../css_selectors.js";
import {
  MAX_EMPTY_PAGES_ALLOWED,
  MAX_PRODUCTS_BY_BRAND,
  MAX_PRODUCTS_BY_BRAND_COUNT,
  MIN_PRODUCTS_PER_PAGE,
} from "../constants.js";
import type { BaseCache } from "../../../providers/cache/interfaces.js";

export class ScraperManager {
  public products: Product[] = [];
  public isDone: boolean = false;
  public productsCount: number = 0;

  private website: E_COMMERCE;
  private browser: Browser;
  private page: Page;
  private cache: BaseCache;
  private subCategory: string;
  private subCategoryDetails: SubCategory;
  private crawlerUtils: CrawlerUtils;
  private maxProductsToFetch: number;

  private emptyPageThreshold: number = 0;
  private productsByBrand = new Map<string, number>();
  private alreadyProcessedProducts = new Set<string>();
  private productPrivateInfo: Record<"userId" | "platformId", string>;
  private getBrandSelector: (page: Page, brand: string) => Promise<ElementHandle<HTMLElement | SVGElement> | null>;

  constructor(
    browser: Browser,
    page: Page,
    website: E_COMMERCE,
    cache: BaseCache,
    subCategory: string,
    subCategoryDetails: SubCategory,
    platformId: string,
    getBrandSelector: (page: Page, brand: string) => Promise<ElementHandle<HTMLElement | SVGElement> | null>
  ) {
    this.browser = browser;
    this.page = page;
    this.website = website;
    this.cache = cache;
    this.subCategory = subCategory;
    this.subCategoryDetails = subCategoryDetails;
    this.getBrandSelector = getBrandSelector;

    // Set fetching limit to double the requested maxProducts (defaulting to 10 if not provided)
    const targetLimit = subCategoryDetails.maxProducts || 10;
    this.maxProductsToFetch = targetLimit * 2;

    this.productPrivateInfo = {
      userId: process.env["USER_ID"] || "",
      platformId: platformId,
    };

    this.crawlerUtils = new CrawlerUtils(
      browser,
      page,
      website,
      subCategory,
      subCategoryDetails,
      this.productPrivateInfo,
    );
  }

  public async navigateToUrl(url: string): Promise<void> {
    try {
      await this.crawlerUtils.navigateToUrl(this.page, url);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error during navigation";
      console.error(`Error navigating to ${this.website}:`, errMsg);
      this.isDone = true;
    }
  }

  public async extractProducts(): Promise<void> {
    if (this.isDone) return;

    const cardSelector = PRODUCT_CARD_SELECTOR[this.website];

    try {
      const products = await this.page.$$(cardSelector);

      if (products.length === 0) {
        console.warn(`No products found on ${this.website}`);
        return this.increaseEmptyPageThreshold(null);
      }

      const productDetails = await Promise.all(
        products.map(async (product) => await this.getProductData(product)),
      ).then((results) =>
        results.reduce((acc, val) => {
          if (val != null) acc.push(val);
          return acc;
        }, [] as Product[]),
      );

      this.insertProduct(productDetails);
    } catch (error) {
      console.error(`Error extracting product details from ${this.website}:`, error);
    }
  }

  public async getProductData(
    product: ElementHandle<SVGElement | HTMLElement>,
  ): Promise<Product | null> {
    try {
      const productData = await this.crawlerUtils.extractProductData(product);

      if (
        productData &&
        (await this.checkDeepValidation(productData.brand, productData.url))
      ) {
        const { price, discountPrice } = productData;
        const discountPercent = Math.round(((price - discountPrice) / price) * 100);

        console.log(
          `Extracted - ${this.website.toUpperCase()} : ${
            productData.name
          } | Price: ${price} | Discount Price: ${discountPrice} | ${discountPercent}% off`,
        );

        await this.postProcessProduct(productData.brand, productData.url, discountPercent);

        const productId = randomUUID();
        const cardScreenshotPath = await this.crawlerUtils.takeCardScreenshot(product, productId);

        const mappedProduct = ProductMapper.fromScraped(productData, {
          category: this.subCategory,
          website: this.website,
          userId: this.productPrivateInfo.userId,
          platformId: this.productPrivateInfo.platformId,
          maxDiscountForFullPage: this.subCategoryDetails.maxDiscountForFullPageScreenshot,
        });

        mappedProduct.id = productId;
        mappedProduct.cardScreenshotPath = cardScreenshotPath || undefined;

        return mappedProduct;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  public insertProduct(product: Product[] | null) {
    if (product && product.length > 0) {
      const availableSlots = this.maxProductsToFetch - this.productsCount;

      if (product.length > availableSlots)
        product = product.slice(0, availableSlots);

      this.products.push(...product);
      this.productsCount += product.length;
    } else {
      this.increaseEmptyPageThreshold(product);
    }

    if (this.productsCount >= this.maxProductsToFetch) this.isDone = true;
  }

  private async postProcessProduct(
    brand: string,
    url: string,
    discountPercentage: number,
  ): Promise<void> {
    const brandKey = brand.toLowerCase();
    const conditionToAddBrand =
      brand !== "Unknown" &&
      this.productsByBrand.get(brandKey) !== -1 &&
      discountPercentage >= this.subCategoryDetails.maxBrandDiscount;

    if (conditionToAddBrand) {
      this.productsByBrand.set(
        brandKey,
        (this.productsByBrand.get(brandKey) || 0) + 1,
      );
    }

    if (
      this.productsByBrand.get(brandKey)! >= MAX_PRODUCTS_BY_BRAND &&
      this.productsByBrand.get(brandKey) !== -1
    ) {
      console.log(`\nFetching more products for brand ${brand} from ${this.website}...\n`);
      this.productsByBrand.set(brandKey, -1);
      await this.fetchBrandProducts(brandKey);
    }

    this.alreadyProcessedProducts.add(url);
  }

  private increaseEmptyPageThreshold(products: Product[] | null): void {
    if (products && products.length > MIN_PRODUCTS_PER_PAGE) {
      if (this.emptyPageThreshold > 0) {
        this.emptyPageThreshold -= 1;
      }
    } else {
      this.emptyPageThreshold += 1;

      if (this.emptyPageThreshold > MAX_EMPTY_PAGES_ALLOWED) {
        console.info(
          `\nCrawler terminated for ${this.website}: Maximum empty page threshold exceeded (${this.emptyPageThreshold}). Collected: ${this.productsCount}\n`,
        );
        this.isDone = true;
      }
    }
  }

  private async checkDeepValidation(
    brand: string,
    url: string,
  ): Promise<boolean> {
    const isValid =
      this.alreadyProcessedProducts.has(url) === false &&
      this.productsByBrand.get(brand.toLowerCase()) !== -1 &&
      this.productsCount < this.maxProductsToFetch;

    if (isValid) {
      return !(await this.cache.isUrlCached(url));
    }

    return false;
  }

  private async fetchBrandProducts(brand: string): Promise<void> {
    const { page, context } = await BrowserUtils.getContext(this.browser);

    try {
      await this.crawlerUtils.navigateToUrl(page, this.page.url());
      const brandSelector = await this.getBrandSelector(page, brand);

      if (brandSelector !== null) {
        await brandSelector.click();
        await this.crawlerUtils.waitForPageLoad(
          page,
          PRODUCT_CARD_SELECTOR[this.website],
          false,
          5000,
        );
        await page.waitForTimeout(randomDelay(1.5, 2.5));

        const rawProducts = await page.$$(PRODUCT_CARD_SELECTOR[this.website]);
        const products = await this.crawlerUtils.getBrandProducts(
          page,
          rawProducts.slice(0, MAX_PRODUCTS_BY_BRAND_COUNT),
        );

        if (products) {
          products["url"] = page.url();
          this.insertProduct([products]);
          console.log(`\nFetched products for brand ${brand} from ${this.website}\n`);
        }
      } else {
        console.warn(`No selector found for brand ${brand} on ${this.website}`);
      }
    } catch (error) {
      console.error(
        `Error fetching products for brand ${brand}: `,
        (error as Error).message,
      );
    } finally {
      if (page) page.close();
      if (context) await context.close();
    }
  }
}
