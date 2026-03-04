from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import RoutingKeyDublinYearStat
from .serializers import RoutingKeyDublinYearStatSerializer


class RoutingKeyList(APIView):
    def get(self, request):
        year = request.query_params.get("year")
        if not year:
            return Response({"error": "year query param is required (e.g. ?year=2025)"}, status=400)

        min_tx = int(request.query_params.get("min_tx", 30))
        qs = RoutingKeyDublinYearStat.objects.filter(year=int(year), transactions__gte=min_tx).order_by("-transactions")

        return Response(RoutingKeyDublinYearStatSerializer(qs, many=True).data)


class RoutingKeyDetail(APIView):
    def get(self, request, routing_key):
        year = request.query_params.get("year")
        if not year:
            return Response({"error": "year query param is required (e.g. ?year=2025)"}, status=400)

        obj = RoutingKeyDublinYearStat.objects.filter(
            year=int(year),
            routing_key=routing_key.upper()
        ).first()

        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(RoutingKeyDublinYearStatSerializer(obj).data)