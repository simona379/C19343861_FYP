export default function ComparisonRow({ label, comparison }) {
  if (!comparison) return null;

  const isAbove = comparison.direction === "above";

  return (
    <div
      style={{
        color: isAbove ? "#16a34a" : "#475569",
        fontWeight: 600,
      }}
    >
      {label}: {isAbove ? "above average" : "below average"}
    </div>
  );
}