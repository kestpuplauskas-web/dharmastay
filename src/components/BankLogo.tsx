import type { CSSProperties } from "react";

type Style = {
  bg: string;
  fg: string;
  text: string;
  font?: string;
  letterSpacing?: string;
  weight?: number;
  italic?: boolean;
  transform?: string;
};

// Brand-inspired text logos. Not the original trademarked artwork —
// they use each bank's brand color so the picker matches Paysera's look.
const STYLES: Record<string, Style> = {
  HABALT22: {
    bg: "#ffffff",
    fg: "#F65005",
    text: "Swedbank",
    font: "'Helvetica Neue', Arial, sans-serif",
    weight: 700,
    italic: true,
  },
  CBVILT2X: {
    bg: "#ffffff",
    fg: "#0d0d0d",
    text: "S|E|B",
    font: "Arial Black, Arial, sans-serif",
    weight: 900,
    letterSpacing: "0.02em",
  },
  AGBLLT2X: {
    bg: "#ffffff",
    fg: "#4B1E4B",
    text: "Luminor",
    font: "Georgia, 'Times New Roman', serif",
    weight: 700,
  },
  RETBLT21: {
    bg: "#ffffff",
    fg: "#0d0d0d",
    text: "Revolut",
    font: "'Helvetica Neue', Arial, sans-serif",
    weight: 800,
    letterSpacing: "-0.02em",
  },
  INDULT2X: {
    bg: "#E4002B",
    fg: "#ffffff",
    text: "Citadele",
    font: "Georgia, serif",
    weight: 700,
    italic: true,
  },
  CBSBLT26: {
    bg: "#ffffff",
    fg: "#1F2E5C",
    text: "Artea",
    font: "'Helvetica Neue', Arial, sans-serif",
    weight: 700,
  },
  MDBALT22: {
    bg: "#ffffff",
    fg: "#007F5F",
    text: "URBO",
    font: "'Helvetica Neue', Arial, sans-serif",
    weight: 800,
    letterSpacing: "0.02em",
  },
  // Latvija / Estija (jei kada įjungtos):
  HABALV22: { bg: "#ffffff", fg: "#F65005", text: "Swedbank", font: "'Helvetica Neue', Arial, sans-serif", weight: 700, italic: true },
  HABAEE2X: { bg: "#ffffff", fg: "#F65005", text: "Swedbank", font: "'Helvetica Neue', Arial, sans-serif", weight: 700, italic: true },
};

export function BankLogo({ bic, className }: { bic: string; className?: string }) {
  const s = STYLES[bic];
  if (!s) return null;
  const style: CSSProperties = {
    background: s.bg,
    color: s.fg,
    fontFamily: s.font,
    fontWeight: s.weight ?? 700,
    fontStyle: s.italic ? "italic" : "normal",
    letterSpacing: s.letterSpacing,
  };
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded px-2 py-1 text-sm leading-none whitespace-nowrap " +
        (s.bg === "#ffffff" ? "ring-1 ring-border/40 " : "") +
        (className ?? "")
      }
      style={style}
      aria-label={s.text}
    >
      {s.text}
    </span>
  );
}
