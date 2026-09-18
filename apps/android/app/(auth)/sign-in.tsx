import Auth from "./_components/Auth";
import { clearAuthStorage, supabase } from "@/api/clients/supabase";
import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, ToastAndroid, View } from "react-native";

export default function SignIn() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSignIn = async (authData: {
    email: string;
    password: string;
  }): Promise<void> => {
    // Set processing state to true
    setIsProcessing(true);

    try {
      const { error } = await supabase.auth.signInWithPassword(authData);

      if (error) {
        // Handle specific refresh token errors
        if (
          error.message.includes("refresh_token_not_found") ||
          error.message.includes("Invalid Refresh Token")
        ) {
          await clearAuthStorage();
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(error.message);
      }
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "An error occurred during sign-in";
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
        <Text style={styles.title}>Sign In</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <Auth
          isProcessing={isProcessing}
          btnTitle="Sign In"
          handleSubmitForm={handleSignIn}
        />
      </View>

      {/* Navigate to SignUp */}
      <View style={styles.navigateContainer}>
        <Text style={styles.navigateText}>
          Don&apos;t have an account?{" "}
          <Link
            href={"/(auth)/sign-up"}
            style={styles.signIn}
            disabled={isProcessing}
          >
            Sign Up
          </Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigateText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#66c7e4",
    textAlign: "center",
  },
  navigateContainer: {
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    color: "white",
    fontWeight: "600",
  },
  formContainer: {},
  signIn: {
    fontWeight: "600",
  },
});
