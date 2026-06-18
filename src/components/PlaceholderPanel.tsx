type PlaceholderPanelProps = {
  title: string;
  description: string;
};

export function PlaceholderPanel({ title, description }: PlaceholderPanelProps) {
  return (
    <section className="panel placeholder-panel">
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
