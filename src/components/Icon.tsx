import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  car: "m5 6-2 7v6h3v-2h12v2h3v-6l-2-7H5ZM3 12h18M7 15h1m8 0h1",
  battery: "M3 7h17v12H3V7Zm17 4h2v4h-2M7 10v6m4-6v6m4-6v6",
  washer:
    "M4 3h16v19H4V3Zm0 5h16M7 5h1m3 0h1M12 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  dishwasher: "M4 3h16v19H4V3Zm0 5h16M7 13h10M7 17h10",
  immersion: "M8 2h8l2 3v14l-2 3H8l-2-3V5l2-3Zm1 5h6m-3 3v7",
  dryer: "M4 3h16v19H4V3Zm0 5h16M8 14c0-4 8-4 8 0s-8 4-8 0Z",
  heatpump: "M3 5h18v15H3V5Zm5 4v7m4-7v7m4-7v7",
  wind: "M3 8h12c5 0 5-6 1-6M3 12h16c4 0 4 6 0 6M3 16h8c4 0 4 6 0 6",
  leaf: "M20 3C8 1 2 7 5 15s15 3 15-12ZM4 21 16 8",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12M6 18 18 6",
  chat: "M4 4h16v13H9l-5 4V4ZM8 8h8M8 12h5",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v6m0-10v1",
  check: "m5 12 4 4L19 6",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
};
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name === "ev" ? "car" : name] ?? paths.bolt} />
    </svg>
  );
}
