import { toTitleCase } from "./formatters";

export function getFeatureByKey(geoData, key) {
  if (!geoData || !geoData.features || !key) return null;

  return geoData.features.find(
    (feature) =>
      String(feature.properties.RoutingKey).trim().toUpperCase() ===
      String(key).trim().toUpperCase()
  );
}

export function getAreaDescription(geoData, key) {
  const feature = getFeatureByKey(geoData, key);

  if (!feature || !feature.properties) return key;

  const descriptor = feature.properties.Descriptor;
  return descriptor ? toTitleCase(descriptor) : key;
}

export function buildFilteredGeoData(geoData, stats) {
  if (!geoData || Object.keys(stats).length === 0) return null;

  return {
    type: "FeatureCollection",
    features: geoData.features.filter((feature) => {
      const key = String(feature.properties.RoutingKey).trim().toUpperCase();
      return Object.prototype.hasOwnProperty.call(stats, key);
    }),
  };
}