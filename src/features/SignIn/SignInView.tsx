import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "../../core/auth/SessionStore";
import { Theme } from "../../core/design/theme";
import { L10n } from "../../core/l10n";

export function SignInView() {
  const session = useSession();
  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }} />
      <Text style={styles.title}>Elvie</Text>
      <Pressable
        onPress={() => void session.signInWithGoogle()}
        disabled={session.isBusy}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{L10n.continueWithGoogle}</Text>
      </Pressable>
      {session.isBusy ? <ActivityIndicator color={Theme.primaryText} style={{ marginTop: 16 }} /> : null}
      {session.errorMessage ? <Text style={styles.error}>{session.errorMessage}</Text> : null}
      <View style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 34, fontWeight: "600", color: Theme.primaryText, marginBottom: 24 },
  button: {
    backgroundColor: Theme.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: {
    color: Theme.failure,
    fontSize: 12,
    marginTop: 16,
    paddingHorizontal: 32,
    textAlign: "center",
  },
});
