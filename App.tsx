import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "./src/core/auth/SessionStore";
import { RootView } from "./src/features/Root/RootView";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <RootView />
          <StatusBar style="light" />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
