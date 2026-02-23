# Add Django Rest Framework API endpoint

from rest_framework import serializers
from .models import Property

class PropertySerializer(serializers.ModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "address",
            "price",
            # description_of_property in dataset prp_dublin
            "property_type",
            "sale_date",
            "latitude",
            "longitude",
            "distance_km",
        ]

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None
    
    # Add distance for the LBS endpoint, nearby view will annotate distance - send distance to frontend too
    def get_distance_km(self, obj):
        dist = getattr(obj, "distance", None)
        if dist is None:
            return None
        # Distance is in metres when geography = True
        return round(dist.m / 1000.0, 3)