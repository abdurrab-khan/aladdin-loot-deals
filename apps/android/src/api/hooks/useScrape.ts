import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getScrapeCategories,
  triggerScrape,
  triggerRotationScrape,
  ScrapeRequest,
} from "@/api/services/scrape";
import { ToastAndroid } from "react-native";

export const useScrapeCategoriesQuery = () => {
  return useQuery({
    queryKey: ["scrape-categories"],
    queryFn: getScrapeCategories,
  });
};

export const useScrapeMutation = () => {
  return useMutation({
    mutationFn: (data: ScrapeRequest) => triggerScrape(data),
    onSuccess: () => {
      ToastAndroid.show("Scrape started successfully!", ToastAndroid.SHORT);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error ||
        error.message ||
        "Failed to start scrape";
      ToastAndroid.show(msg, ToastAndroid.LONG);
    },
  });
};

export const useRotationScrapeMutation = () => {
  return useMutation({
    mutationFn: triggerRotationScrape,
    onSuccess: () => {
      ToastAndroid.show("Rotation scrape started!", ToastAndroid.SHORT);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error ||
        error.message ||
        "Failed to start rotation";
      ToastAndroid.show(msg, ToastAndroid.LONG);
    },
  });
};
