import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const palettes = [
  ["#0A84FF", "#64D2FF", "#5E5CE6"],
  ["#30D158", "#64D2FF", "#FFD60A"],
  ["#FF6B6B", "#FF9F0A", "#BF5AF2"],
  ["#FF375F", "#0A84FF", "#32D74B"],
  ["#64D2FF", "#BF5AF2", "#FFD60A"],
];

export function BlobAvatar({
  name,
  seed,
  size = 56,
}: {
  name: string;
  seed?: string | null;
  size?: number;
}) {
  const blob = useMemo(() => {
    const rnd = mulberry32(hash(`${name}#${seed ?? "default"}`));
    const palette = palettes[Math.floor(rnd() * palettes.length)];
    const blobs = Array.from({ length: 4 }, (_, i) => {
      const cx = 20 + rnd() * 60;
      const cy = 20 + rnd() * 60;
      const r = 18 + rnd() * 28;
      return { cx, cy, r, fill: palette[i % palette.length], opacity: 0.55 + rnd() * 0.4 };
    });
    return blobs;
  }, [name, seed]);

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Avatar for ${name}`}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {blob.map((b, i) => (
          <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} opacity={b.opacity} />
        ))}
        <Path
          d="M18 52 C22 18 78 12 84 48 C88 78 22 86 18 52"
          fill={blob[0]?.fill ?? "#0A84FF"}
          opacity={0.35}
        />
      </Svg>
    </View>
  );
}
