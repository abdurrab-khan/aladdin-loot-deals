import React, { useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router/build/hooks";

import Form from "./_components/Form";
import FormSkeleton from "./_components/FormSkeleton";
import { supabase } from "@/api/clients/supabase";
import toast from "@/utils";
import NotFound from "./_components/NotFound";
import useAppSession from "@/context/AppContext";

export interface ProductImage {
  id: string;
  imageUrl: string;
  imageType: "Card" | "Full" | "Group";
  imageStatus: "Completed" | "Pending";
}

export interface AffiliateUrl {
  id: string;
  url: string;
  isDefault: boolean;
}

export interface ProductData {
  productId: string;
  id: string;
  name: string;
  url: string;
  price: number;
  discountPrice: number;
  productBrand: string;
  isPosted: boolean;
  isGrouped: boolean;
  productImages: ProductImage[];
  affiliateUrl?: AffiliateUrl;
}

export default function CaptionEditor() {
  const { user } = useAppSession();

  const { ids: rawIds = "" } = useLocalSearchParams();
  const ids = rawIds.toString().split(",");

  const { data, isPending, isError, error } = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: async (): Promise<ProductData> => {
        const { data, error } = await supabase.rpc("fetch_product", {
          pid: id,
          userid: user?.id,
        });

        if (error !== null) {
          throw new Error(
            error?.message ??
              `An unknown error occurred while fetching product ${id}`,
          );
        }
        return data;
      },
      enable: !!user?.id,
    })),
    combine: (results) => ({
      data: results.map((result) => result.data).filter((p) => p !== undefined),
      isError: results.some((result) => result.isError),
      error: results
        .map((result) => result.error?.message ?? `An unknown error occurred`)
        .join(", "),
      isPending: results.some((result) => result.isPending),
    }),
  });

  useEffect(() => {
    let mount = true;

    if (isError && mount) {
      toast(error);
    }

    return () => {
      mount = false;
    };
  }, [isError, error]);

  return (
    <React.Fragment>
      {!Array.isArray(ids) || ids.length <= 0 ? (
        <NotFound />
      ) : isPending ? (
        <FormSkeleton />
      ) : (
        <Form products={data} />
      )}
    </React.Fragment>
  );
}
