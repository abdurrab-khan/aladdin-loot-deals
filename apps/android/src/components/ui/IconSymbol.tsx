// Fallback for using MaterialIcons on Android and web.
import Icons from "@expo/vector-icons/Ionicons";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

interface IconSymbolProps {
  name: ComponentProps<typeof Icons>["name"];
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  return <Icons color={color} size={size} name={name} style={style} />;
}
