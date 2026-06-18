import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, eyebrow, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}
