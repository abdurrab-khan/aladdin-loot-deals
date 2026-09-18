import React from "react";
import { Image, StyleSheet, View } from "react-native";

export default function ComingSoon() {
  return (
    <View style={styles.main}>
      <View style={styles.imageContainer}>
        <Image
          source={require("@/assets/images/coming-soon.png")}
          style={styles.image}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    height: 260,
    width: 300,
  },
  image: {
    height: "100%",
    width: "100%",
    objectFit: "contain",
  },
});
