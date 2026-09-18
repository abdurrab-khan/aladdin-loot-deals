import type { Affiliate } from "@/types";
import { supabase } from "../clients/supabase";

export const addAffiliateLink = async (
  userId: string,
  productId: string,
  platformId: string,
  affiliateUrl: string,
): Promise<Affiliate[]> => {
  if (!affiliateUrl.trim() || !platformId.trim() || !userId.trim()) {
    throw new Error("Product url and affiliate url is required.");
  }

  try {
    const { count } = await supabase
      .from("affiliate_urls")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);

    const isDefault = count === 0;

    const response = await supabase
      .from("affiliate_urls")
      .insert({
        user_id: userId,
        product_id: productId,
        website_id: platformId,
        affiliate_url: affiliateUrl,
        is_default: isDefault,
      })
      .select();

    if (response.status !== 201) {
      throw new Error(
        response?.error?.message ||
          "An error occurred when adding affiliate link.",
      );
    }

    // Transforming the response into the Affiliate Type
    const transformedResponse = response?.data?.map((item: any) => ({
      id: item.affiliate_id as string,
      url: item.affiliate_url as string,
      createdAt: item.created_at as string,
      isDefault: item.is_default as boolean,
    }));

    return transformedResponse ?? [];
  } catch (err) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "An error occurred when adding affiliate link";

    throw new Error(errorMsg);
  }
};
export const deleteAffiliateLink = async (
  affiliateId: string,
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("affiliate_urls")
      .delete()
      .eq("affiliate_id", affiliateId);

    if (error) throw error;
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Failed to delete affiliate link",
    );
  }
};

export const setDefaultAffiliateLink = async (
  affiliateId: string,
  productId: string,
): Promise<void> => {
  try {
    // First, set all links for this product to not default
    const { error: resetError } = await supabase
      .from("affiliate_urls")
      .update({ is_default: false })
      .eq("product_id", productId);

    if (resetError) throw resetError;

    // Then set the chosen one to default
    const { error: setError } = await supabase
      .from("affiliate_urls")
      .update({ is_default: true })
      .eq("affiliate_id", affiliateId);

    if (setError) throw setError;
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Failed to set default affiliate link",
    );
  }
};
