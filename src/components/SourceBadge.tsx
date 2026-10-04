export default function SourceBadge({
  children,
  kind = "estimate",
}: {
  children: React.ReactNode;
  kind?: "data" | "estimate" | "ai";
}) {
  return (
    <span className={`source-badge ${kind}`}>
      <span />
      {children}
    </span>
  );
}
