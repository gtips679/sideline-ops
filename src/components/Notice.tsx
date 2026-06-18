import type { ReactNode } from "react";

type NoticeProps = {
  children: ReactNode;
  tone: "success" | "error" | "info";
};

export function Notice({ children, tone }: NoticeProps) {
  return <div className={`notice ${tone}`}>{children}</div>;
}
