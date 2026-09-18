import { useQuery } from "@tanstack/react-query";
import { getProductCategories } from "@/api/services/product";
import useAppSession from "@/context/AppContext";

export const useProductCategoriesQuery = () => {
  const { user } = useAppSession();
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => {
      return getProductCategories(user?.id!);
    },
    enabled: !!user?.id,
  });
};
