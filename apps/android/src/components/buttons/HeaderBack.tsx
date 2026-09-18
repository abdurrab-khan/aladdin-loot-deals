import { Colors } from "../../constants/Colors";
import Icons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";

interface HeaderBackProps {
  iconName?: ComponentProps<typeof Icons>["name"];
}

export default function HeaderBack({
  iconName = "chevron-back",
}: HeaderBackProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? Colors.dark.header : "transparent",
        },
        styles.button,
      ]}
    >
      <IconSymbol name={iconName} color={"white"} size={28} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 22,
    padding: 4,
    borderRadius: 9999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
