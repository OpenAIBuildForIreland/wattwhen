import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "battery"
  | "bolt"
  | "carbon"
  | "cost"
  | "dishwasher"
  | "document"
  | "dryer"
  | "ev"
  | "heatpump"
  | "immersion"
  | "scale"
  | "send"
  | "solar"
  | "sparkle"
  | "upload"
  | "washer";

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; title?: string };

export default function Icon({ name, title, ...props }: IconProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, ReactNode> = {
    bolt: <path {...common} d="m13 2-7 11h5l-1 9 8-12h-5V2Z" />,
    carbon: <><path {...common} d="M20 4c-8 0-13 3-13 9a6 6 0 0 0 6 6c6 0 9-7 7-15Z" /><path {...common} d="M4 21c2-5 5-8 11-11" /></>,
    cost: <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M14.7 8.6c-.7-.7-1.6-1-2.7-1-1.5 0-2.6.8-2.6 2 0 3 5.3 1.3 5.3 4.6 0 1.3-1.2 2.2-2.8 2.2-1.1 0-2.1-.4-2.8-1.1M12 6.1v11.8" /></>,
    scale: <><path {...common} d="M12 4v16M6 8h12M4.5 8 2 14h5L4.5 8Zm15 0L17 14h5l-2.5-6Z" /><path {...common} d="M8 20h8" /></>,
    solar: <><circle {...common} cx="12" cy="12" r="3.8" /><path {...common} d="M12 2v2.3M12 19.7V22M4.9 4.9l1.6 1.6m11 11 1.6 1.6M2 12h2.3m15.4 0H22M4.9 19.1l1.6-1.6m11-11 1.6-1.6" /></>,
    ev: <><path {...common} d="M5 15.5V10l2-4h10l2 4v5.5" /><path {...common} d="M4 15.5h16v3H4zM7 19v1.5m10-1.5v1.5M7.5 11h.01M16.5 11h.01" /><path {...common} d="M12 4V1.8" /></>,
    battery: <><rect {...common} x="3" y="7" width="17" height="10" rx="2" /><path {...common} d="M21 10v4M7 10v4m3-4v4m3-4v4" /></>,
    heatpump: <><rect {...common} x="4" y="5" width="16" height="14" rx="2" /><circle {...common} cx="12" cy="12" r="3.4" /><path {...common} d="M12 8.6v6.8m-3-3.4h6" /></>,
    washer: <><rect {...common} x="4" y="3" width="16" height="18" rx="2" /><circle {...common} cx="12" cy="14" r="4.2" /><path {...common} d="M7 7h.01M10 7h4" /></>,
    dryer: <><rect {...common} x="4" y="3" width="16" height="18" rx="2" /><circle {...common} cx="12" cy="14" r="4.2" /><path {...common} d="M8.7 14c1-2.1 2.2 2.2 3.3 0 .9-1.9 2.1 2.1 3.3 0M7 7h.01M10 7h4" /></>,
    dishwasher: <><rect {...common} x="4" y="3" width="16" height="18" rx="2" /><path {...common} d="M7 9h10m-9 4h8m-7 4h6M7 6h.01" /></>,
    immersion: <><path {...common} d="M12 3v10" /><path {...common} d="M8.5 7.5a4.9 4.9 0 1 0 7 0" /><path {...common} d="M8 20h8" /></>,
    sparkle: <><path {...common} d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path {...common} d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></>,
    document: <><path {...common} d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path {...common} d="M14 3v5h5M8.5 13h7m-7 3h7" /></>,
    upload: <><path {...common} d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" /><path {...common} d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
    send: <path {...common} d="m21 3-7 18-3.8-7.2L3 10l18-7ZM10.2 13.8 15 9" />,
  };

  return (
    <svg viewBox="0 0 24 24" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} {...props}>
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
