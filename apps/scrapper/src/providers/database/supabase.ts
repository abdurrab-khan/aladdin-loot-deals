import { readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { BaseDatabase } from "./interfaces.js";
import { SupabaseTransformer } from "./utils/supabase-transformer.js";
import {
  createClient,
  SupabaseClient as SupabaseJSClient,
} from "@supabase/supabase-js";

import type { Product } from "../../types/product.js";

export class SupabaseDatabase extends BaseDatabase {
  public supabaseClient: SupabaseJSClient;

  constructor() {
    super();
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_KEY"]) {
      throw new Error(
        "Supabase URL or Key is not defined in environment variables.",
      );
    }

    this.supabaseClient = createClient(
      process.env["SUPABASE_URL"],
      process.env["SUPABASE_KEY"],
      {
        db: {
          schema: "public",
        },
      },
    );
  }

  public async saveProducts(products: Product[]): Promise<Product[]> {
    if (products.length === 0) {
      console.warn("No products provided for database insertion.");
      return [];
    }

    try {
      const productsForInsert = SupabaseTransformer.toDbProducts(products);
      const {data, error} = await this.supabaseClient.from("products").insert(productsForInsert).select();

      if (error) {
        throw error;
      }

      if (Array.isArray(data)) {
        return SupabaseTransformer.mergeScreenshotInfo(
          data as Product[],
          products,
        );
      }

      console.warn(
        "Stored procedure 'insert_products_v2' did not return data. Screenshot jobs were skipped.",
      );
      return [];
    } catch (error) {
      console.error("Database insertion failed:", error);
      return [];
    }
  }

  public async ensureProductImageRows(products: Product[]): Promise<void> {
    const uniqueRows = SupabaseTransformer.toProductImageRows(products);

    if (uniqueRows.length === 0) return;

    try {
      // We use a simple insert here. If you want to avoid duplicates,
      // ensure you have a unique constraint on (product_id, image_type) in your database.
      const { error } = await this.supabaseClient
        .from("product_images")
        .insert(uniqueRows);

      if (error) {
        // If the error is about a unique constraint violation, we can ignore it
        // but if it's the 42P10 error (missing constraint for upsert),
        // using .insert() avoids it entirely.
        if (error.code === "23505") {
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Failed to ensure product image rows:", error);
    }
  }

  public async uploadCardScreenshot(product: Product): Promise<void> {
    const { id, cardScreenshotPath } = product;
    if (!id || !cardScreenshotPath) return;

    try {
      const imageBuffer = readFileSync(cardScreenshotPath);
      const bucketName = process.env["SUPABASE_BUCKET"] || "aladdin-deals";
      const uniqueImageKey = `product_images/${id}-${Date.now()}.png`;

      const { data: uploadData, error: uploadError } =
        await this.supabaseClient.storage
          .from(bucketName)
          .upload(uniqueImageKey, imageBuffer, {
            upsert: false,
            contentType: "image/png",
          });

      if (uploadError || !uploadData?.fullPath) {
        throw new Error(
          `Failed to upload card screenshot: ${uploadError?.message}`,
        );
      }

      const publicUrl = new URL(
        uploadData.fullPath,
        `${process.env["SUPABASE_URL"]}/storage/v1/object/public/`,
      ).href;

      const { error: updateError } = await this.supabaseClient
        .from("product_images")
        .update({
          image_url: publicUrl,
          image_status: "Completed",
        })
        .eq("product_id", id)
        .eq("image_type", "Card");

      if (updateError) {
        throw new Error(
          `Failed to update product_images with card URL: ${updateError.message}`,
        );
      }

      console.log(
        `[Supabase] Card screenshot uploaded and DB updated for product: ${id}`,
      );

      // Delete local file
      await unlink(cardScreenshotPath).catch((err) =>
        console.warn(
          `[Supabase] Failed to delete local card screenshot: ${err.message}`,
        ),
      );
    } catch (error) {
      console.error(
        `[Supabase] Error processing card screenshot for product ${id}:`,
        error,
      );
    }
  }
}

const SupabaseDatabaseInstance = new SupabaseDatabase();
export default SupabaseDatabaseInstance;
