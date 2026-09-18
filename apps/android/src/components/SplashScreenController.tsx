import * as SplashScreen from "expo-splash-screen";

import RootNavigator from "./RootNavigator";
import useAppSession from "@/context/AppContext";

SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function SplashScreenController() {
  const { isLoading } = useAppSession();

  if (!isLoading) {
    SplashScreen.hideAsync();
    return <RootNavigator />;
  }

  return null;
}
