const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function SpeakerIcon({ size = 34 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="M11 5 6.7 8.5H3.5v7h3.2L11 19V5Z"/><path d="M15 8.2a5 5 0 0 1 0 7.6"/><path d="M17.8 5.7a8.5 8.5 0 0 1 0 12.6"/></svg>;
}

export function BookIcon({ size = 20 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="M4 5.2c3-.9 5.7-.4 8 1.4v13c-2.3-1.8-5-2.3-8-1.4v-13Z"/><path d="M20 5.2c-3-.9-5.7-.4-8 1.4v13c2.3-1.8 5-2.3 8-1.4v-13Z"/></svg>;
}

export function ListIcon({ size = 20 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>;
}

export function ChartIcon({ size = 20 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>;
}

export function ChevronIcon({ direction = "right", size = 20 }) {
  const rotate = direction === "left" ? "rotate(180 12 12)" : direction === "down" ? "rotate(90 12 12)" : "";
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path transform={rotate} d="m9 5 7 7-7 7"/></svg>;
}

export function MenuIcon({ size = 26 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
}

export function CheckIcon({ size = 20 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>;
}

export function RepeatIcon({ size = 20 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="M20 7h-9a6 6 0 1 0 5.5 8.4"/><path d="m16 3 4 4-4 4"/></svg>;
}

export function CloseIcon({ size = 20 }) {
  return <svg {...base} width={size} height={size} viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>;
}
