import React from "react";
import { View } from "react-native";
import { useSession } from "../../core/auth/SessionStore";
import { Theme } from "../../core/design/theme";
import { SignInView } from "../SignIn/SignInView";
import { SlideStackShell } from "../Shell/SlideStackShell";

export function RootView() {
  const session = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: Theme.background }}>
      {session.isSignedIn ? <SlideStackShell /> : <SignInView />}
    </View>
  );
}
