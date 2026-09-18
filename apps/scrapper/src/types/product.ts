export type SingleProductDetails = {
  brand: string;
  price: number;
  rating?: number;
  reviews?: number;
  discountType?: string;
  discountPrice: number;
  discountPercent: number;
};

export type GroupProductDetails = {
  brand: string;
  startPrice: number;
  discountStartPrice: number;
  productCount: number;
  avgRating?: number;
  totalReviews?: number;
};

export interface Product {
  id?: string;
  name: string;
  category: string;
  url: string;
  isGrouped: boolean;
  details: SingleProductDetails | GroupProductDetails;
  images: {
    image: string | string[];
    card: string;
    fullPage: string | null;
  };
  screenshotInfo?: {
    fullPageRequired: boolean;
    grouped: boolean;
    website: "amazon" | "flipkart";
    priceDetails?: {
      minPrice: number;
      maxPrice: number;
      discount: number;
    };
  };
  userId: string;
  platformId: string;
  cardScreenshotPath?: string | undefined;
}
