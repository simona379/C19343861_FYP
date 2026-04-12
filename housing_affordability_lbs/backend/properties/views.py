# API view
import json
from django.views.decorators.csrf import csrf_exempt
from django.contrib.gis.geos import GEOSGeometry
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from rest_framework import status
from django.http import JsonResponse
# ODM
import requests
from django.conf import settings
from math import cos, radians

from .models import Property, RoutingKeyDublinYearStat, RoutingKeyAmenities
from .serializers import PropertySerializer, RoutingKeyDublinYearStatSerializer

@api_view(["GET"])
def routing_key_list(request):
    """
    Return routing key housing data merged with amenity counts

    Query params:
    - year (optional but expected in frontend, e.g. ?year=2025)

    - Housing stats come from RoutingKeyDublinYearStat
    - Amenity counts come from RoutingKeyAmenities
    - Missing amenity values are returned as 0 for display
    """
    year = request.GET.get("year")

    # housing queryset
    queryset = RoutingKeyDublinYearStat.objects.all().order_by("-transactions")

    if year:
        queryset = queryset.filter(year=year)

    # Python lookup table for amenities keyed by routing key
    amenities_lookup = {
        row.routingkey: {
            "park_count": row.park_count or 0,
            "school_count": row.school_count or 0,
            "university_count": row.university_count or 0,
            "rail_tram_count": row.rail_tram_count or 0,
        }
        for row in RoutingKeyAmenities.objects.all()
    }

    # Serialize housing rows then merge amenity values into each row
    merged_rows = []
    for row in queryset:
        data = RoutingKeyDublinYearStatSerializer(row).data

        amenities = amenities_lookup.get(
            row.routing_key,
            {
                "park_count": 0,
                "school_count": 0,
                "university_count": 0,
                "rail_tram_count": 0,
            },
        )

        data.update(amenities)
        merged_rows.append(data)

    return Response(merged_rows)




# legacy code from earlier adaptation
@api_view(["GET"])
def properties_nearby(request):
    """
    Return properties within a given radius of a point.
    Query params:
      - lat (required, float)
      - lon (required, float)
      - radius_km (optional, float, default 5)

    Optional Filters:
    - min_price
    - max_price
    - property type

    GeoDjango and PostGIS is used to perform efficient spatial filtering.

    """

    # Parse and validate: lat, lon and radius_km
    try:
        lat = float(request.query_params.get("lat"))
        lon = float(request.query_params.get("lon"))
        radius_km = float(request.query_params.get("radius_km", 5))

    except (TypeError, ValueError):
        return Response(
            {"error": "Please provide valid lat, lon and optional radius_km."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # user : use my location, convert to geographic point (w/. srid 4326)
    user_location = Point(lon, lat, srid=4326)

    # Spatial query: all properties within radius
    qs = (
        Property.objects.filter (
            location__distance_lte=(user_location, D(km=radius_km))
        ).annotate (
            distance=Distance("location", user_location)
        ).order_by ("distance")
    )
    
    # Optional filters: Price range and property type
    min_price = request.query_params.get("min_price")
    max_price = request.query_params.get("max_price")
    property_type = request.query_params.get("property_type") 

    if min_price:
        try:
            qs = qs.filter(price__gte = float(min_price))
        except ValueError:
            pass

    if max_price:
        try:
            qs = qs.filter(price__lte = float(max_price))
        except ValueError:
            pass

    if property_type and property_type != "all":
        # assuming property_type is a text field from PPR like "Second-Hand Dwelling house /Apartment"
        qs = qs.filter(property_type__icontains=property_type)

    # Limit results for performance
    qs = qs[:500]

    # Serialize and return
    serializer = PropertySerializer(qs, many=True)
    return Response(serializer.data)

# HTML map view - front-end entry point
def map_view(request):
    """
    Render the main map page.
    """
    return render(request, "properties/map.html")

# Polygon filters - drawn shape search
@csrf_exempt
def properties_within_polygon(request):
    """
        Accepts a POSTed GeoJSON polygon from Leaflet.draw.
        Returns all properties inside that polygon.

        Supports same filters as /properties/nearby
        (min_price, max_price, property_type)
    """

    # POST bc of a GeoJSON body
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    # Parse Polygon geometry
    try:
        data = json.loads(request.body.decode("utf-8"))

        # GeoJSON Feature or raw Geometry allowed
        if data.get("type") == "Feature":
            geom_data = data["geometry"]
        else:
            geom_data = data

        # Convert JSON to GEOgeometry (PostGIS compatible)
        geom = GEOSGeometry(json.dumps(geom_data), srid=4326)

        # Fix invalid polygons
        if not geom.valid:
            geom = geom.buffer(0)

    except Exception as e:
        return JsonResponse({"error": f"Invalid GeoJSON: {e}"}, status=400)

    # Spatial query (property is inside polygon)
    qs = Property.objects.filter(location__within=geom)

    # Same optional filters as nearby search
    min_price = request.GET.get("min_price")
    max_price = request.GET.get("max_price")
    property_type = request.GET.get("property_type") 

    if min_price:
        try:
            qs = qs.filter(price__gte = float(min_price))
        except ValueError:
            pass

    if max_price:
        try:
            qs = qs.filter(price__lte = float(max_price))
        except ValueError:
            pass

    if property_type and property_type != "all":
        qs = qs.filter(property_type__icontains=property_type)

    serializer = PropertySerializer(qs[:500], many=True)
    return JsonResponse(serializer.data, safe=False)


# OSM backend django overpass endpoint
# Ameneties via Overpass API
def amenities_overpass(request):
    """
    Query overpass api for nearby amenities around a point

    Query params:
    - lat (required, float)
    - lon (required, float)
    - radius_m (optional, default 1000 clamped to 50, 2000)

    Features:
    - types (optional, comma_seperated categories):
          'education'  -> schools (educational_institutes), colleges, universities
          'parks'      -> parks, playgrounds
          'transport'  -> bus stops, tram & train platforms
    - uses overpass QL
    - Return GeoJSON FeatureCollection for Leaflet to display
    """

    # Parse location lat / lon 
    try:
        lat = float(request.GET.get("lat"))
        lon = float(request.GET.get("lon"))
    except (TypeError, ValueError):
        return JsonResponse(
            {"error": "lat and lon are required and must be floats."},
            status=400,
        )

    # Parse and limit Radius (guard against bad values) 
    radius_m = request.GET.get("radius_m", "1000")
    try:
        radius_m = int(radius_m)
    except ValueError:
        radius_m = 1000

    # between 50m and 2km
    radius_m = max(50, min(radius_m, 2000))  

    # Parse Category selcetion (from query string)
    types_raw = request.GET.get("types", "education,parks,transport")
    selected_keys = [t.strip() for t in types_raw.split(",") if t.strip()]

    # Mapping from category to overpass filter patterns 
    category_filters = {
        "education": [
            # Including node, way and relation to get all point (including some of largest ones)
            'nwr["amenity"="school"]',
            'nwr["amenity"="college"]',
            'nwr["amenity"="university"]',
            'nwr["office"="educational_institution"]',
        ],
        "parks": [
            'nwr["leisure"="park"]',
            'nwr["leisure"="playground"]',
        ],
        "transport": [
            'node["highway"="bus_stop"]',

             # Dublin tagging (OSM Overpass Turbo findings)
            'way["public_transport"="platform"]["train"="yes"]',
            'relation["public_transport"="platform"]["train"="yes"]',

            'node["amenity"="vending_machine"]["vending"="public_transport_tickets"]',

            'way["public_transport"="platform"]["tram"="yes"]',
            'relation["public_transport"="platform"]["tram"="yes"]',

            'node["public_transport"="platform"]["bus"="yes"]',

        ],
    }

    # Overpass filter blocks
    osm_filters = []
    for key in selected_keys:
        patterns = category_filters.get(key)
        if not patterns:
            continue
        for pattern in patterns:
            # e.g. node["amenity"="school"](around:1000,lat,lon);
            osm_filters.append(
                f'{pattern}(around:{radius_m},{lat},{lon});'
            )

    if not osm_filters:
        # Nothing selected - empty GeoJSON
        return JsonResponse({"type": "FeatureCollection", "features": []})

    # Overpass QL query
    # 'out centre;' for ways/relations to get centroid with lat/lon
    overpass_query = f"""
    [out:json][timeout:25];
    (
      {"".join(osm_filters)}
    );
    out center;
    """

    # Make request to Overpass API
    url = "https://overpass-api.de/api/interpreter"

    try:
        resp = requests.post(url, data={"data": overpass_query}, timeout=25)
    except Exception as e:
        # on errors: return an empty feature collection & error details
        print("Overpass request failed:", repr(e))
        return JsonResponse(
            {
                "type": "FeatureCollection",
                "features": [],
                "error": f"Overpass request failed: {e}",
            },
            status=200,
        )

    # Overpass returned error: return empty GeoJSON data & include error for debugging 
    if resp.status_code != 200:
        print("Overpass bad status:", resp.status_code, resp.text[:300])
        return JsonResponse(
            {
                "type": "FeatureCollection",
                "features": [],
                "error": f"Overpass HTTP {resp.status_code}",
            },
            status=200,
        )

    #Parse JSON
    try:
        data = resp.json()
    except ValueError as e:
        print("Overpass JSON error:", repr(e), resp.text[:300])
        return JsonResponse(
            {
                "type": "FeatureCollection",
                "features": [],
                "error": "Invalid JSON from Overpass",
            },
            status=200,
        )

    # Convert Overpass elements to GeoJSON Features
    features = []
    for el in data.get("elements", []):
        etype = el.get("type")

        # accept node, way, relation (ways/relation have center, node uses raw lat/lon)
        if etype == "node":
            lat_el = el.get("lat")
            lon_el = el.get("lon")
        elif etype in ("way", "relation"): 
            # ways and relations provide center for display
            center = el.get("center") or {}
            lat_el = center.get("lat")
            lon_el = center.get("lon")
        else:
            # ignore anything else
            continue

        # if still no coords, skip
        if lat_el is None or lon_el is None:
            continue

        tags = el.get("tags", {}) or {}
        name = tags.get("name", "Unnamed")

        # classify into one of amenity categories "kind" (for styling)
        kind = None

        # Education
        if (
            tags.get("amenity") in ("school", "college", "university") or tags.get("office") == "educational_institution"
        ):
            kind = "education"
        
        # Parks
        elif tags.get("leisure") in ("park", "playground"):
            kind = "parks"

        # Transport
        elif (
              tags.get("highway") == "bus_stop"
              or (
                  tags.get("public_transport") == "platform"
                  and any(tags.get(k) == "yes" for k in ("bus", "train", "tram"))
              )
              or (
                  tags.get("amenity") == "vending_machine"
                  and tags.get("vending") == "public_transport_tickets"
              )
        ):
            kind = "transport"

        # GeoJSON Feature
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon_el, lat_el],
                },
                "properties": {
                    "id": el.get("id"),
                    "name": name,
                    "kind": kind,
                    "tags": tags,
                },
            }
        )

    return JsonResponse(
        {
            "type": "FeatureCollection",
            "features": features,
        }
    )