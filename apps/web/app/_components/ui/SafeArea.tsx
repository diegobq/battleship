"use client";
import { CSSProperties, ReactNode } from "react";

type Edge = "top" | "bottom" | "all";

interface SafeAreaProps {
  edge?: Edge;
  children: ReactNode;
}

export function SafeArea({ edge = "all", children }: SafeAreaProps) {
  const style: CSSProperties = {};
  if (edge === "top" || edge === "all") style.paddingTop = "var(--safe-top)";
  if (edge === "bottom" || edge === "all")
    style.paddingBottom = "var(--safe-bottom)";
  if (edge === "all") {
    style.paddingLeft = "var(--safe-left)";
    style.paddingRight = "var(--safe-right)";
  }
  return <div style={style}>{children}</div>;
}
