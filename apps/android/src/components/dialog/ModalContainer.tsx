import { Colors } from "@/constants/Colors";
import React from "react";
import {
  Modal,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";

interface DialogContainerProps {
  children: React.ReactNode;
  visible: boolean;
  isLoading?: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  modelStyle?: StyleProp<ViewStyle>;
  animationType?: "none" | "slide" | "fade";
}

export default function ModalContainer({
  children,
  visible,
  isLoading,
  modelStyle = {},
  setVisible,
  animationType = "fade",
}: DialogContainerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const modalWidth = Math.min(screenWidth * 0.85, 400);

  const handleModalClose = () => {
    if (typeof isLoading === "boolean" && isLoading) return;
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      onRequestClose={() => setVisible(false)}
      transparent={true}
    >
      <TouchableWithoutFeedback onPress={handleModalClose}>
        <View style={modalStyles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[modalStyles.modal, { width: modalWidth }, modelStyle]}
            >
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    right: 20,
    top: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  modal: {
    position: "relative",
    borderWidth: 1,
    padding: 18,
    maxWidth: "85%",
    borderColor: Colors.dark.borderColor,
    backgroundColor: Colors.dark.header,
    borderRadius: 18,
  },
});
