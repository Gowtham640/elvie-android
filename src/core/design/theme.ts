export const Theme = {
  background: "#121212",
  card: "#1E1E1E",
  cardElevated: "#212121",
  primaryText: "#FFFFFF",
  secondaryText: "#8E8E93",
  accent: "#0A84FF",
  success: "#30D158",
  failure: "#FF6B6B",
  spaceXS: 4,
  spaceS: 8,
  spaceM: 12,
  spaceL: 16,
  spaceXL: 20,
  spaceSection: 24,
  spaceBlock: 32,
  chip: 44,
  chromeGap: 8,
  avatarList: 56,
  bubbleMaxWidth: 340,
  chatFont: 14,
} as const;

export const ChatTextSizes = {
  small: 12,
  medium: 14,
  large: 17,
} as const;

export type ChatTextSize = keyof typeof ChatTextSizes;
