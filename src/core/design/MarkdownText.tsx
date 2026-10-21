import React from "react";
import { StyleSheet, Text } from "react-native";
import Markdown from "react-native-markdown-display";
import { Theme } from "./theme";

export function MarkdownText({ markdown, fontSize }: { markdown: string; fontSize: number }) {
  return (
    <Markdown
      style={{
        body: { color: Theme.primaryText, fontSize, lineHeight: fontSize * 1.4 },
        paragraph: { marginTop: 0, marginBottom: 8, color: Theme.primaryText },
        text: { color: Theme.primaryText },
        strong: { color: Theme.primaryText, fontWeight: "700" },
        em: { fontStyle: "italic" },
        code_inline: {
          backgroundColor: Theme.cardElevated,
          color: Theme.primaryText,
          fontSize: fontSize - 1,
        },
        fence: { backgroundColor: Theme.cardElevated, color: Theme.primaryText },
        link: { color: Theme.accent },
        bullet_list: { marginBottom: 8 },
        ordered_list: { marginBottom: 8 },
      }}
    >
      {markdown || " "}
    </Markdown>
  );
}

export function HighlightedSnippet({ raw }: { raw: string }) {
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={styles.snippet}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={i} style={styles.hit}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  snippet: { color: Theme.primaryText, fontSize: 14 },
  hit: { fontWeight: "700", color: Theme.accent },
});
