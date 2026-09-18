import { Colors } from "../../constants/Colors";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface NotProductFoundProps {
  message?: string;
}

export default function NotProductFound({ message }: NotProductFoundProps) {
  return (
    <View style={styles.main}>
      {/* Icon */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../../../assets/images/not-found.png")}
          style={styles.image}
        />
      </View>

      {/* Not Found Text */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>No results found</Text>
      </View>

      {/* Message */}
      {message && (
        <View>
          <Text style={styles.message}>
            {/* Try adjusting your search or filter to find what you're looking for. */}
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    height: 200,
    width: 340,
  },
  image: {
    height: "100%",
    width: "100%",
    objectFit: "contain",
  },
  titleContainer: {},
  title: {
    fontSize: 26,
    color: Colors.dark.text,
    fontWeight: 500,
  },
  message: {
    fontSize: 18,
    textAlign: "center",
    color: "#5a8092",
  },
});
