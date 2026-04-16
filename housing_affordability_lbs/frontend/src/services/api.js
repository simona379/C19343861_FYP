export async function fetchGeoJson() {
  const response = await fetch("/RoutingKeys_EIRE.geojson");

  if (!response.ok) {
    throw new Error("Failed to load GeoJSON");
  }

  return response.json();
}

export async function fetchRoutingKeyStats(year = 2025) {
  const response = await fetch(`/api/routing-keys/?year=${year}`);

  if (!response.ok) {
    const text = await response.text();
    console.error("API error response:", text);
    throw new Error("API failed");
  }

  return response.json();
}

export async function fetchRoutingKeyTrend(routingKey) {
  const response = await fetch(`/api/routing-keys/${routingKey}/trend/`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to load trend");
  }

  return response.json();
}