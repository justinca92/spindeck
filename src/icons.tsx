// Line icons for the panel, drawn in currentColor so they follow Steam's text
// colour and focus states. 24×24, 2px strokes, like the plugin's own icon.
// Inline SVG: no icon library to ship.
import { ReactNode } from "react";

const svg = (body: ReactNode) => () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    {body}
  </svg>
);

export const Icons = {
  /** The plugin itself (Decky's sidebar) and "use the wheel as Home". */
  wheel: svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>),
  open: svg(<><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" /></>),
  text: svg(<><path d="M5 6h14M12 6v13" /><path d="M9 19h6" /></>),
  subtitle: svg(<><path d="M4 8h16M4 12h11M4 16h7" /></>),
  hangul: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h4v2.5H7M14 9v6M17 9v6M14 12h3" /></>),
  library: svg(<><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="16" rx="1" /><path d="M17.5 5l3 14.5" /></>),
  sort: svg(<><path d="M7 4v16M4 17l3 3 3-3" /><path d="M13 6h7M13 11h5M13 16h3" /></>),
  bumper: svg(<><path d="M4 14c0-4 3-6 8-6s8 2 8 6" /><path d="M4 14h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /></>),
  animation: svg(<><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /><circle cx="12" cy="12" r="2.5" /></>),
  layout: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>),
  size: svg(<><circle cx="12" cy="12" r="8" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /></>),
  visible: svg(<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>),
  capsule: svg(<><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M7 16h10" /></>),
  textSize: svg(<><path d="M3 18l4.5-11L12 18M4.6 14h5.8" /><path d="M14 18l3-7 3 7M15 16h4" /></>),
  hero: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 8" /></>),
  history: svg(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>),
  trackpad: svg(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 13.5a3 3 0 1 0 3-3" /></>),
  circle: svg(<><path d="M20 12a8 8 0 1 1-3-6.2" /><path d="M20 4v4h-4" /></>),
  aButton: svg(<><circle cx="12" cy="12" r="9" /><path d="M9 16l3-8 3 8M10 13.5h4" /></>),
  haptic: svg(<><rect x="8" y="4" width="8" height="16" rx="2" /><path d="M4 9v6M20 9v6M2 11v2M22 11v2" /></>),
  strength: svg(<><path d="M5 18v-3M10 18v-6M15 18V9M20 18V6" /></>),
  deck: svg(<><rect x="2" y="7" width="20" height="10" rx="4" /><rect x="8" y="9" width="8" height="6" rx="1" /><circle cx="5" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
  sound: svg(<><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /></>),
  language: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" /></>),
  channel: svg(<><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></>),
  update: svg(<><path d="M21 12a9 9 0 1 1-9-9" /><path d="M16 3h5v5M21 3l-7 7" /></>),
  download: svg(<><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>),
  reload: svg(<><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" /></>),
  github: svg(<><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" /></>),
  coffee: svg(<><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12 2.5v3" /></>),
};

/** A button's text with its icon in front (Decky's ButtonItem has no icon slot of its own). */
export const IconLabel = ({ icon: I, children }: { icon: () => ReactNode; children?: ReactNode }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <I />
    <span>{children}</span>
  </span>
);
