import { decode } from "base64-arraybuffer";
import { PostgrestError } from "@supabase/supabase-js";

import type { Product } from "@/types";

import { supabase } from "../clients/supabase";

// interface getProducts
interface getProductsProps {
  userId: string;
  start?: number;
  end?: number;
  query?: string | null;
  categoryValue?: string | null;
}

// cspell: ignore supabase
export const getProducts = async ({
  userId,
  start = 0,
  end = 9,
  categoryValue = null,
  query = null,
}: getProductsProps): Promise<Product[]> => {
  try {
    let queryBuilder = supabase
      .from("products_v2")
      .select("*")
      .eq("user_id", userId);

    // Applying filter on query and category
    if (categoryValue || query) {
      if (query) queryBuilder = queryBuilder.ilike("name", `%${query}%`);
      if (categoryValue)
        queryBuilder = queryBuilder.eq("category", categoryValue);
    }

    const products = await queryBuilder
      .range(start, end)
      .order("category", { ascending: true })
      .order("discount_price", { ascending: true })
      .order("product_id", { ascending: true });

    return (products?.data ?? []) as Product[];
  } catch (err: unknown) {
    const errMessage =
      err instanceof PostgrestError
        ? err.message
        : "An error occurred during fetching products.";

    throw new Error(errMessage);
  }
};

export const deleteProducts = async (ids: string[] | string) => {
  if (!ids || ids.length === 0) {
    throw new Error("Product IDs are required.");
  }

  try {
    // Delete product images
    const { data: images, error: imagesError } = await supabase
      .from("product_images")
      .select("*")
      .in("product_id", Array.isArray(ids) ? ids : [ids]);

    if (imagesError) {
      throw new Error(imagesError.message);
    }

    // Delete products
    const { error } = await supabase
      .from("products")
      .delete()
      .in("product_id", Array.isArray(ids) ? ids : [ids]);

    if (error) {
      throw new Error(error.message);
    }

    // Delete product images
    await deleteProductImage(
      images?.map((img) =>
        img?.image_url?.replace(/^.*\/public\/aladdin-deals\//, ""),
      ),
    );

    return true;
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error ? err.message : "An error occurred during deletion.";
    throw new Error(errMessage);
  }
};

export const updateProduct = async (
  id: string | string[],
  updatedProps: Partial<Product>,
): Promise<boolean> => {
  if (!id || !updatedProps) {
    throw new Error("Product ID and updated properties are required.");
  }

  try {
    const { error } = await supabase
      .from("products")
      .update(updatedProps)
      .in("product_id", Array.isArray(id) ? id : [id]);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error ? err.message : "An error occurred during update.";

    throw new Error(errMessage);
  }
};

export const uploadProductImage = async (
  imageBase64: string,
): Promise<{ imageUrl: string; imagePath: string }> => {
  try {
    const fileName = `send-product/product_${Date.now()}.png`;

    // Removing existing URI Prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imageBuffer = decode(cleanBase64);

    const { data, error } = await supabase.storage
      .from("aladdin-deals")
      .upload(fileName, imageBuffer, {
        upsert: false,
        cacheControl: "3600",
        contentType: "image/png",
      });

    if (error) {
      throw new Error(error.message);
    }

    const fullUrl = supabase.storage
      .from("aladdin-deals")
      .getPublicUrl(data!.path).data.publicUrl;

    return { imageUrl: fullUrl, imagePath: data.path };
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error
        ? err.message
        : "An error occurred during image upload.";
    throw new Error(errMessage);
  }
};

export const deleteProductImage = async (
  imagePath?: string | string[],
): Promise<void> => {
  console.log("Paths for delete images: ", imagePath);

  try {
    if (!imagePath) {
      return;
    }

    const { error } = await supabase.storage
      .from("aladdin-deals")
      .remove(Array.isArray(imagePath) ? imagePath : [imagePath]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error
        ? err.message
        : "An error occurred during image deletion.";
    throw new Error(errMessage);
  }
};

export const getProductCategories = async (
  userId: string,
): Promise<string[]> => {
  try {
    const { data, error } = await supabase.rpc("fetch_category", {
      user_id: userId,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return [];

    return data;
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error
        ? err.message
        : "An error occurred while fetching product categories.";
    throw new Error(errMessage);
  }
};
