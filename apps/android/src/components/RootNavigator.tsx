import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { supabase } from "@/api/clients/supabase";

import { Colors } from "@/constants/Colors";
import useAppSession from "@/context/AppContext";

export default function RootNavigator() {
  const { user, addSession } = useAppSession();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === "SIGNED_OUT" || _event === "TOKEN_REFRESHED") {
        if (_event === "SIGNED_OUT") {
          addSession(null);
        }
      }

      if (_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") {
        if (session?.user) {
          addSession(session.user);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [addSession]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.dark.background,
        },
      }}
    >
      <Stack.Protected guard={user !== null}>
        <Stack.Screen
          name="(home)"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="(others)"
          options={{
            animation: "fade_from_bottom",
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={user === null}>
        <Stack.Screen
          name="(auth)"
          options={{
            animation: "fade",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
