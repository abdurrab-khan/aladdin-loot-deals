import { Stack } from "expo-router";
import React from "react";

export default function OthersLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "fade_from_bottom",
        headerShown: false,
      }}
    />
  );
}
