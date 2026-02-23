// map.js

// Frontend logic for Housing Affordability & insights Map

// Map initialisation and global layers

// Create a Leaflet map attached to the div with id="map"
const map = L.map("map");

// Initial view: cover Dublin from Bray to Howth
map.fitBounds([
    [53.10, -6.60],  // SW (Bray)
    [53.55, -5.95]   // NE (Howth)
]);

// Add OpenStreetMap tiles for map background
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Marker Cluster Layer for all property markers
//  - Clusters group multiple nearby points into a single circle
//  - iconCreateFunction lets us style cluster colour by average price
let markersLayer = L.markerClusterGroup({
    iconCreateFunction: function (cluster) {
        const markers = cluster.getAllChildMarkers();
        let sum = 0;
        let count = 0;

        // Compute average price for all properties in the cluster
        markers.forEach(m => {
            const price = Number(m.options.price);
            if (!Number.isNaN(price)) {
                sum += price;
                count += 1;
            }
        });

        const avg = count ? sum / count : 0;

        // Use the same helper as single markers to determine price band
        const band = getPriceBand(avg);   // "low" / "mid" / "high"

        // Map band to CSS class for the cluster 
        let bandClass = "marker-cluster-low";
        if (band === "mid") bandClass = "marker-cluster-mid";
        if (band === "high") bandClass = "marker-cluster-high";

        // DivIcon with the total count drawn in the middle 
        return new L.DivIcon({
            html: `<div><span>${count}</span></div>`,
            className: "marker-cluster " + bandClass,
            iconSize: L.point(40, 40)
        });
    }
});

// Add the property cluster layer to the map
map.addLayer(markersLayer);

// Optional marker for user's location : You are here
let userMarker = null;

// Layer that holds any drawn polygons (Leaflet.draw)
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems); 

// State variables to remember last search:
// save last polygon shape drawn
let lastPolygonGeoJSON = null;  
// "polygon" or "nearby"
let lastSearchMode = null;       
let lastNearbyLat = null;
let lastNearbyLon = null;
let lastNearbyRadius = null;

// Add draw Leaflet.draw controls (polygon only)
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
    }
});
map.addControl(drawControl);

// Amenity Icon helpers and layer
// helper to generate SVG-based icons (not used for amenities now but kept for possible future custom icons
function makeIcon(color) {
    return L.divIcon({
        className: "custom-amenity-icon",
        html: `
            <svg width="26" height="26" viewBox="0 0 26 26">
                <circle cx="13" cy="13" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            </svg>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    });
}

// Layer for drawing all amenities (schools, parks, transport)
const amenitiesLayer = L.layerGroup().addTo(map);

// alternative amenity icon definitions (not used now, but kept for future styling changes
// Coloured dot icons for amenity categories
const amenityIcons = {
    education: L.divIcon({
        className: "amenity-icon amenity-education"
    }),
    parks: L.divIcon({
        className: "amenity-icon amenity-parks"
    }),
    transport: L.divIcon({
        className: "amenity-icon amenity-transport"
    })
};

// Helpers to build API URLs
// Read price filters from the sidebar inputs
function getPriceFilters() {
    // Get values from inputs 
    const minPriceInput = document.getElementById("min-price");
    const maxPriceInput = document.getElementById("max-price");

    return {
        minPrice: minPriceInput ? minPriceInput.value : "",
        maxPrice: maxPriceInput ? maxPriceInput.value : ""
    };
}

// Build URL for the nearby (radius based search) endpoint
function buildNearbyUrl(lat, lon, radiusKm) {
    const params = new URLSearchParams({
        lat: lat,
        lon: lon,
        radius_km: radiusKm
    });

    // Attach optional filters min, max price and property type
    const minPrice = document.getElementById("min-price")?.value;
    const maxPrice = document.getElementById("max-price")?.value;
    const typeSelect = document.getElementById("property-type");
    const propertyType = typeSelect ? typeSelect.value : "all";

    if (minPrice) params.append("min_price", minPrice);

    if (maxPrice) params.append("max_price", maxPrice);

    if (propertyType && propertyType !== "all") {
        params.append("property_type", propertyType);
    }

    return `/api/properties/nearby/?${params.toString()}`;
}

// Build URL for the polygon search endpoint (no lat/lon but same filters)
function buildPolygonUrl() {
    const params = new URLSearchParams();

    // Attach optional filters min, max price and property type
    const minPrice = document.getElementById("min-price")?.value;
    const maxPrice = document.getElementById("max-price")?.value;
    const typeSelect = document.getElementById("property-type");
    const propertyType = typeSelect ? typeSelect.value : "all";

    if (minPrice) params.append("min_price", minPrice);

    if (maxPrice) params.append("max_price", maxPrice);

    if (propertyType && propertyType !== "all") {
        params.append("property_type", propertyType);
    }

    const qs = params.toString();
    return qs ? `/api/properties/within_polygon/?${qs}` 
              : `/api/properties/within_polygon/`;
}

// Price bands & icons (for markers & clusters)
// Decide which price band a property belongs to
// Both cluster colour and individual marker colour depend on this 
function getPriceBand(price) {
    const p = Number(price);
    // default
    if (Number.isNaN(p)) return "low";      

    // expensive
    if (p >= 700000) return "high";  
    // mid-range       
    if (p >= 400000) return "mid";
    // cheaper          
    return "low";                           
}

// if DivIcons used for standalone property markers (colour-coded)
const priceIcons = {
    low: L.divIcon({
        className: "price-marker price-marker-low",
        iconSize: [18, 18]
    }),
    mid: L.divIcon({
        className: "price-marker price-marker-mid",
        iconSize: [18, 18]
    }),
    high: L.divIcon({
        className: "price-marker price-marker-high",
        iconSize: [18, 18]
    })
};

// Render properties on the map

function renderPropertiesOnMap(data) {
    // update summary panel (count + average price)
    updateSummary(data);
    // clear existing markers before drawing new results
    markersLayer.clearLayers();

    if (!Array.isArray(data) || data.length === 0) {
        alert("No properties found for this search.");
        return;
    }

    data.forEach(p => {
        if (p.latitude && p.longitude) {
            const priceText = p.price != null
                ? "€" + Number(p.price).toLocaleString()
                : "Price not available";

            const typeText = p.property_type || "Property type unknown";
            const distanceText = p.distance_km != null
                ? `<br>${p.distance_km} km away`
                : "";

            // Choose the affordability band "low" / "mid" / "high" 
            const band = getPriceBand(p.price); 
            // marker creation , storing price in options so cluster can access it
            const marker = L.marker(
                [p.latitude, p.longitude],
                {
                    icon: priceIcons[band],
                    //  store price so clusters can average
                    price: p.price     
                }
            ).bindPopup(`
                <strong>${p.address || "Unknown address"}</strong><br>
                ${priceText}<br>
                ${typeText}
                ${distanceText}
            `);
            
            // Add marker to cluster layer
            markersLayer.addLayer(marker);
        }
    });

    // Auto fit map view to the bounds of all property markers
    const bounds = markersLayer.getBounds();
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
    }
}

// Radius search (Use my location / fixed center point)
// Helper to call the /properties/nearby/ endpoint
function loadProperties(lat, lon, radiusKm) {
    const url = buildNearbyUrl(lat, lon, radiusKm);

    fetch(url)
        .then(r => {
            if (!r.ok) throw new Error(`Server error ${r.status}`);
            return r.json();
        })
        .then(renderPropertiesOnMap)
        .catch(err => {
            console.error("Error loading properties:", err);
            alert("Error loading properties.");
        });
}

// "Use my location" button wiring
const locateBtn = document.getElementById("locate-btn");
if (locateBtn) {
    locateBtn.addEventListener("click", () => {
        const radiusInput = document.getElementById("radius-input");
        const radiusKm = radiusInput
            ? parseFloat(radiusInput.value) || 10
            : 10;

        // Basic geolocation support check
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            pos => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                // Create / update "You are here" marker as a circle marker
                if (userMarker) {
                    map.removeLayer(userMarker);
                }

                userMarker = L.circleMarker([lat, lon], {
                    radius: 9,
                    color: "#0055ff",
                    weight: 3,
                    fillColor: "#ffffff",
                    fillOpacity: 1.0
                }).addTo(map);

                userMarker.bindPopup("You are here").openPopup();

                // recentre map on users location
                map.setView([lat, lon], 13);

                // save last nearby search info (for Refresh and amenities)
                lastSearchMode = "nearby";
                lastNearbyLat = lat;
                lastNearbyLon = lon;
                lastNearbyRadius = radiusKm;

                // Load nearby properties from backend
                loadProperties(lastNearbyLat, lastNearbyLon, lastNearbyRadius);
            },
            err => {
                console.error(err);
                alert("Unable to access your location.");
            }
        );
    });
}

// Polygon-based spatial analysis (Leaflet.draw)

// Called when the user finishes drawing a new polygon on map
map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;

    // Only allow one polygon at a time
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);

    // Save polygon GeoJSON for later search re-use
    lastPolygonGeoJSON = layer.toGeoJSON();
    lastSearchMode = "polygon";
    runPolygonSearch();
});

// Call backend /properties/within_polygon/ using the saved polygon
function runPolygonSearch() {
    if (!lastPolygonGeoJSON) return;

    const url = buildPolygonUrl();

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastPolygonGeoJSON)
    })
    .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
    })
    .then(renderPropertiesOnMap)
    .catch(err => {
        console.error("Error loading polygon results:", err);
        alert("Error loading polygon results.");
    });
}

// re run the polygon search when filters (min, max price, prop. type) change
function reapplyFiltersToExistingPolygon() {
    if (!lastPolygonGeoJSON) {
        // nothing drawn yet – do nothing
        return;
    }
    runPolygonSearch();
}

// Attach change listeners to sidebar filter inputs
["min-price", "max-price", "property-type"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", reapplyFiltersToExistingPolygon);
});

// Summary Panel (count and average price)
// Summary calculation function
function updateSummary(data) {
    const box = document.getElementById("summary-box");

    if (!data || data.length === 0) {
        box.textContent = "No properties found.";
        return;
    }

    // Debug: see what the backend actually returned
    console.log("Summary data:", data);

    const count = data.length;

    // Compute average price ( extract numeric prices, ignoring null & NaN prices)
    const prices = data
        .map(p => Number(p.price))
        .filter(p => !Number.isNaN(p));

    let avgText = "Average price unknown";
        if (prices.length > 0) {
            const avg = Math.round(
                prices.reduce((a, b) => a + b, 0) / prices.length
            );
            avgText = "Average price: €" + avg.toLocaleString();
        }

        box.innerHTML = `
            <strong>Results:</strong><br>
            ${count} properties found<br>
            ${avgText}
        `;
}

// Clear results button 
const clearBtn = document.getElementById("clear-btn");
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        // remove all property markers
        markersLayer.clearLayers();
        // remove polygon
        drawnItems.clearLayers();
        lastPolygonGeoJSON = null;
        // Reset last search state
        lastSearchMode = null;
        lastNearbyLat = null;
        lastNearbyLon = null;
        lastNearbyRadius = null;
        // clear summary text
        updateSummary(null);
        // clear amenities markers
        amenitiesLayer.clearLayers();
        // Remove "You are here" marker if present
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
        const box = document.getElementById("summary-box");
        if (box) box.textContent = "Map cleared.";
    });
}

// Amenities 
// helpers for fetching and rendering amenities
// Get which amenity checkboxes are currently selecte
function getSelectedAmenityTypes() {
    const checkboxes = document.querySelectorAll(".amenity-checkbox");
    let selected = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selected.push(cb.value);
    });
    return selected;
}

// load amenities from backend
// Call backend /api/amenities/ around a given lat/lo
function loadAmenitiesAround(lat, lon) {
    const types = getSelectedAmenityTypes();
    if (types.length === 0) {
        alert("Please select at least one amenity category.");
        return;
    }

    // query string for amenities endpoint
    const params = new URLSearchParams({
        lat: lat,
        lon: lon,
        // 1km radius
        radius_m: 1000,             
        types: types.join(","),
    });

    fetch(`/api/amenities/?${params.toString()}`)
        .then(r => {
            if (!r.ok) throw new Error(`Server error ${r.status}`);
            return r.json();
        })
        .then(data => {
            // clear old amenity markers
            amenitiesLayer.clearLayers();

            if (!data.features || data.features.length === 0) {
                alert("No amenities found for this area.");
                return;
            }

            // for each returned amenity - draw a coloured circle marker
            data.features.forEach(f => {
                const [lonF, latF] = f.geometry.coordinates;
                const name = f.properties.name || "Unnamed";
                const kind = f.properties.kind || "amenity";

                // colour by category
                let fillColor = "#455a64"; // default grey for transport

                if (["education", "school", "college", "university", "educational_institution"].includes(kind)) {
                    fillColor = "#7b1fa2"; // purple – education
                }
                else if (["park", "parks", "playgrounds", "playground"].includes(kind)) {
                    fillColor = "#c871c2ff" // pink - parks
                }

                // add marker to map
                const marker = L.circleMarker([latF, lonF], {
                    radius: 6,
                    color: "#ffffff",
                    weight: 1,
                    fillColor: fillColor,
                    fillOpacity: 0.9
                }).bindPopup(`
                    <strong>${name}</strong><br>
                    Type: ${kind || "amenity"}
                    `);

                amenitiesLayer.addLayer(marker);
            });
        })
        .catch(err => {
            console.warn("Amenities unavailable:", err);
        });
}

// another button listener for load amenities linked with last nearby search location or map location
const amenitiesBtn = document.getElementById("amenities-btn");

if (amenitiesBtn) {
    amenitiesBtn.addEventListener("click", () => {
        if (lastNearbyLat !== null && lastNearbyLon !== null) {
            // use last nearby (radius search) centre
            loadAmenitiesAround(lastNearbyLat, lastNearbyLon);
        } else {
            // fallback: current map centre
            const center = map.getCenter();
            loadAmenitiesAround(center.lat, center.lng);
        }
    });
}
