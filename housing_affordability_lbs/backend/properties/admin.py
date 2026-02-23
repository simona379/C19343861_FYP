from django.contrib import admin
from .models import Property

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("address", "price", "bedrooms", "bathrooms")
    fields = (
        "address",
        "price",
        "bedrooms",
        "bathrooms",
        "property_type",
        "sale_date",
        "latitude",
        "longitude",
        # add "location" here to see the map
    )