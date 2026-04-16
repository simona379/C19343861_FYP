export function toTitleCase(text) {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getStatusLabel(status) {
  if (status === "best-match") return "Best match";
  if (status === "close-match") return "Close match";
  if (status === "outside-range") return "Not suitable";
  if (status === "neutral") return "No filters selected";
  return "No data";
}