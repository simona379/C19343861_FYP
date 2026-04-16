from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import RoutingKeyDublinYearStat, RoutingKeyAmenities
from .serializers import RoutingKeyDublinYearStatSerializer

# backend API endpoint providing routing key housing statistics with integrated amenity counts
class RoutingKeyList(APIView):
    def get(self, request):
        year = request.query_params.get("year")
        if not year:
            return Response(
                {"error": "year query param is required (e.g. ?year=2025)"}, 
                status=400,
            )

        try:
            min_tx = int(request.query_params.get("min_tx", 30))
        except ValueError:
            return Response(
                {"error": "min_tx must be an integer"},
                status=400,
            )
        
        qs = RoutingKeyDublinYearStat.objects.filter(
            year=int(year), 
            transactions__gte=min_tx
        ).order_by("-transactions")

        # amenity lookup keyed by routing key
        amenities_lookup = {
            row.routingkey: row
            for row in RoutingKeyAmenities.objects.all()
        }

        # Attach amenity values onto each housing row before serialization
        # letting the serializer expose them as normal fields
        for row in qs:
            amenity = amenities_lookup.get(row.routing_key)

            row.park_count = amenity.park_count if amenity and amenity.park_count is not None else 0
            row.school_count = amenity.school_count if amenity and amenity.school_count is not None else 0
            row.university_count = amenity.university_count if amenity and amenity.university_count is not None else 0
            row.rail_tram_count = amenity.rail_tram_count if amenity and amenity.rail_tram_count is not None else 0

        serializer = RoutingKeyDublinYearStatSerializer(qs, many=True)
        return Response(serializer.data)

# Backend API endpoint used to return detailed housing and amenity statistics for a selected routing key and year
class RoutingKeyDetail(APIView):
    def get(self, request, routing_key):
        year = request.query_params.get("year")
        if not year:
            return Response(
                {"error": "year query param is required (e.g. ?year=2025)"}, 
                status=400,
            )

        obj = RoutingKeyDublinYearStat.objects.filter(
            year=int(year),
            routing_key=routing_key.upper()
        ).first()

        if not obj:
            return Response(
                {"error": "Not found"}, 
                status=status.HTTP_404_NOT_FOUND,
            )
        
        amenity = RoutingKeyAmenities.objects.filter(
            routingkey=routing_key.upper()
        ).first()

        obj.park_count = amenity.park_count if amenity and amenity.park_count is not None else 0
        obj.school_count = amenity.school_count if amenity and amenity.school_count is not None else 0
        obj.university_count = amenity.university_count if amenity and amenity.university_count is not None else 0
        obj.rail_tram_count = amenity.rail_tram_count if amenity and amenity.rail_tram_count is not None else 0

        serializer = RoutingKeyDublinYearStatSerializer(obj)

        return Response(serializer.data)

    
# trend endpoint used by frontend chart to show multi year change
class RoutingKeyTrend(APIView):
    def get(self, request, routing_key):
        qs = RoutingKeyDublinYearStat.objects.filter(
            routing_key=routing_key.upper()
        ).order_by("year")

        data = [
            {
                "year": row.year,
                "median_price": row.median_price,
                "transactions": row.transactions,
                "yoy_percent": row.yoy_percent,
            }
            for row in qs
        ]

        return Response(data)