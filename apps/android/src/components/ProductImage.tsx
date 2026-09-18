import {
  Canvas,
  Image,
  RoundedRect,
  Text,
  useFont,
  useImage,
} from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

interface CustomImageWithCaptionProps {
  product_image: string;
  product_price: string;
}

const CustomImageWithCaption = ({
  product_image,
  product_price,
}: CustomImageWithCaptionProps) => {
  const [canvasSize, setCanvasSize] = useState({ width: 350, height: 500 });

  // Load your custom image
  const image = useImage(product_image);

  // Load fonts
  const font = useFont(require("@/assets/fonts/SpaceMono-Regular.ttf"), 18);
  // Calculate price tag dimensions based on canvas size
  const priceTagWidth = Math.max(70, canvasSize.width * 0.2); // 20% of width, minimum 60px
  const priceTagHeight = Math.max(33, canvasSize.height * 0.08); // 8% of height, minimum 30px
  const priceTagX = canvasSize.width * 0.04; // 4% from left edge
  const priceTagY = canvasSize.height * 0.1; // 10% from top edge

  // Calculate font size based on price tag size
  const fontSize = Math.min(18, priceTagHeight * 0.6);
  const dynamicFont = useFont(
    require("@/assets/fonts/SpaceMono-Regular.ttf"),
    fontSize,
  );

  useEffect(() => {
    if (image) {
      // Get actual image dimensions
      const imgWidth = image.width();
      const imgHeight = image.height();

      // Calculate aspect ratio
      const aspectRatio = imgWidth / imgHeight;

      // Set canvas size based on a max width/height while maintaining aspect ratio
      const maxWidth = 350;
      const maxHeight = 500;

      let finalWidth, finalHeight;

      if (aspectRatio > 1) {
        // Landscape image
        finalWidth = Math.min(maxWidth, imgWidth);
        finalHeight = finalWidth / aspectRatio;
      } else {
        // Portrait image
        finalHeight = Math.min(maxHeight, imgHeight);
        finalWidth = finalHeight * aspectRatio;
      }

      setCanvasSize({ width: finalWidth, height: finalHeight });
    }
  }, [image]);

  if (!image || !font) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <Canvas style={{ width: canvasSize.width, height: canvasSize.height }}>
        {/* Main product image - fills entire canvas */}
        <Image
          image={image}
          fit="cover"
          x={0}
          y={0}
          width={canvasSize.width}
          height={canvasSize.height}
        />

        {/* Price tag background - positioned relative to image size */}
        <RoundedRect
          x={priceTagX}
          y={priceTagY}
          width={priceTagWidth}
          height={priceTagHeight}
          r={Math.min(8, priceTagHeight * 0.2)} // Border radius relative to tag height
          color="#898178"
        />

        <RoundedRect
          x={0}
          y={image.height() - priceTagHeight - 10}
          height={priceTagHeight}
          width={image.width()}
          r={Math.min(8, priceTagHeight * 0.2)}
          color="#898178"
        />

        {/* Price text - centered in the price tag */}
        <Text
          x={
            0 +
            priceTagWidth / 2 -
            String(`₹${product_price || "260"}`).length * fontSize * 0.3
          } // Approximate text centering
          y={
            image.height() -
            priceTagHeight -
            10 +
            priceTagHeight / 2 +
            fontSize * 0.3
          } // Vertical center
          text={"Grab it yours"}
          font={dynamicFont || font}
          color="white"
        />

        {/* Price text - centered in the price tag */}
        <Text
          x={
            priceTagX +
            priceTagWidth / 2 -
            String(`₹${product_price || "260"}`).length * fontSize * 0.3
          } // Approximate text centering
          y={priceTagY + priceTagHeight / 2 + fontSize * 0.3} // Vertical center
          text={`₹${product_price}`}
          font={dynamicFont || font}
          color="white"
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    width: 350,
    height: 500,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
  },
});

export default CustomImageWithCaption;
