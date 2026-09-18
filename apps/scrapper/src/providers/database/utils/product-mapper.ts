import { randomUUID } from "node:crypto";
import type {
  Product,
  SingleProductDetails,
} from "../../../types/product.js";
import type {
  ProductSelectorValue,
  E_COMMERCE,
} from "../../../types/common.js";

export type ProductImageType = "Full" | "Card" | "Group";

export interface DbProductInsert {
  product_id: string;
  product_name: string;
  product_url: string;
  product_price: number;
  product_discount_price: number;
  product_brand: string;
  product_category: string | null;
  is_grouped: boolean;
  user_id: string;
  website_id: string;
}

export interface DbProductImageRow {
  product_id: string;
  image_type: ProductImageType;
  image_url: string | null;
  image_status: "Pending";
}

export class ProductMapper {
  /**
   * Maps a domain Product to a Database insert row.
   */
  public static toDatabase(product: Product): DbProductInsert {
    const details = product.details;
    const price = "price" in details ? details.price : details.startPrice;
    const discountPrice = "discountPrice" in details ? details.discountPrice : details.discountStartPrice;

    return {
      product_id: product.id || randomUUID(),
      product_name: product.name,
      product_url: product.url,
      product_price: price,
      product_discount_price: discountPrice,
      product_brand: details.brand,
      product_category: product.category || null,
      is_grouped: product.isGrouped,
      user_id: product.userId,
      website_id: product.platformId,
    };
  }

  /**
   * Maps raw scraped data to a domain Product object.
   */
  public static fromScraped(
    scraped: ProductSelectorValue,
    metadata: {
      category: string;
      website: E_COMMERCE;
      userId: string;
      platformId: string;
      maxDiscountForFullPage: number;
    }
  ): Product {
    const discountPercent = Math.round(((scraped.price - scraped.discountPrice) / scraped.price) * 100);

    return {
      id: randomUUID(),
      name: scraped.name,
      url: scraped.url,
      category: metadata.category,
      isGrouped: false,
      details: {
        brand: scraped.brand,
        price: scraped.price,
        discountPrice: scraped.discountPrice,
        discountPercent: discountPercent,
        rating: scraped.rating || undefined,
        reviews: scraped.reviews || undefined,
        discountType: scraped.discountType || undefined,
      } as SingleProductDetails,
      images: {
        card: scraped.images,
        image: scraped.images,
        fullPage: null,
      },
      screenshotInfo: {
        fullPageRequired: discountPercent >= metadata.maxDiscountForFullPage,
        grouped: false,
        website: metadata.website,
      },
      userId: metadata.userId,
      platformId: metadata.platformId,
    };
  }

  /**
   * Maps a database row (returned with snake_case) back to a domain Product.
   */
  public static normalize(dbRow: Record<string, any>, originalProduct?: Product): Product {
    const normalized: Product = {
      name: dbRow["product_name"] || originalProduct?.name || "",
      url: dbRow["product_url"] || originalProduct?.url || "",
      category: dbRow["product_category"] || originalProduct?.category || "",
      platformId: dbRow["website_id"] || originalProduct?.platformId || "",
      userId: dbRow["user_id"] || originalProduct?.userId || "",
      isGrouped: dbRow["is_grouped"] ?? originalProduct?.isGrouped ?? false,
      details: originalProduct?.details || ({} as any),
      images: originalProduct?.images || ({} as any),
    };

    if (dbRow["product_id"] || dbRow["id"] || originalProduct?.id) {
      normalized.id = dbRow["product_id"] || dbRow["id"] || originalProduct?.id;
    }

    if (originalProduct?.screenshotInfo) {
      normalized.screenshotInfo = originalProduct.screenshotInfo;
    }

    if (originalProduct?.cardScreenshotPath) {
      normalized.cardScreenshotPath = originalProduct.cardScreenshotPath;
    }

    return normalized;
  }

  /**
   * Generates database rows for the product_images table based on product screenshot requirements.
   */
  public static toImageRows(product: Product): DbProductImageRow[] {
    const rows: DbProductImageRow[] = [];
    const productId = product.id;
    if (!productId) return rows;

    // Always include a Card image row
    rows.push({
      product_id: productId,
      image_type: "Card",
      image_url: null,
      image_status: "Pending",
    });

    if (product.screenshotInfo) {
      if (product.screenshotInfo.grouped) {
        rows.push({
          product_id: productId,
          image_type: "Group",
          image_url: null,
          image_status: "Pending",
        });
      }

      if (product.screenshotInfo.fullPageRequired) {
        rows.push({
          product_id: productId,
          image_type: "Full",
          image_url: null,
          image_status: "Pending",
        });
      }
    }

    return rows;
  }
}
