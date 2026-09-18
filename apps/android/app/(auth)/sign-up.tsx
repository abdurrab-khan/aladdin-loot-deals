import Auth from "./_components/Auth";
import { clearAuthStorage, supabase } from "@/api/clients/supabase";
import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, ToastAndroid, View } from "react-native";

export default function SignUp() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSignUp = async (authData: {
    email: string;
    password: string;
  }): Promise<void> => {
    // Set processing state to true
    setIsProcessing(true);

    try {
      const { error } = await supabase.auth.signUp(authData);

      if (error) {
        // Handle specific refresh token errors
        if (
          error.message.includes("refresh_token_not_found") ||
          error.message.includes("Invalid Refresh Token")
        ) {
          await clearAuthStorage();
          throw new Error("Session expired. Please try again.");
        }
        throw new Error(error.message);
      }
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "An error occurred during sign-up";
      ToastAndroid.show(errMessage, ToastAndroid.LONG);
    } finally {
      // Reset processing state
      setIsProcessing(false);
    }
  };

  return (
    <View>
      {/* Title */}
      <View>
        <Text style={styles.title}>Sign Up</Text>
      </View>

      {/* Form */}
      <View>
        <Auth
          isProcessing={isProcessing}
          btnTitle="Sign Up"
          handleSubmitForm={handleSignUp}
        />
      </View>

      {/* Navigate to SignUp */}
      <View style={styles.navigateContainer}>
        <Text style={styles.navigateText}>
          Already have an account?{" "}
          <Link
            href={"/(auth)/sign-in"}
            style={styles.signUp}
            disabled={isProcessing}
          >
            Sign In
          </Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    color: "white",
    fontWeight: "600",
  },
  signUp: {
    fontWeight: "600",
  },
  navigateContainer: {
    marginTop: 20,
  },
  navigateText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#66c7e4",
    textAlign: "center",
  },
});
