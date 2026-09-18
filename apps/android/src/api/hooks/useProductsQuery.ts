import { useInfiniteQuery } from "@tanstack/react-query";
import { getProducts } from "@/api/services/product";
import useAppSession from "@/context/AppContext";

interface UseProductsQueryParams {
  category?: string | null;
  query?: string | null;
}

export const useProductsQuery = ({
  query: query = "",
  category: category = "All",
}: UseProductsQueryParams) => {
  const { user } = useAppSession();

  return useInfiniteQuery({
    queryKey: ["products", category, query],
    queryFn: ({ pageParam = 0, ...props }) => {
      const start = pageParam * 10;
      const end = start + 9;

      return getProducts({
        userId: user?.id!,
        start,
        end,
        categoryValue: category === "All" ? null : category,
        query,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length < 10 ? null : allPages.length; // null indicates that there are no more pages to fetch
    },
    initialPageParam: 0,
    enabled: !!user?.id,
  });
};
