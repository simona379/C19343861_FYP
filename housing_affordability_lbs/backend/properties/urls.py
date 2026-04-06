from django.urls import path
from .views import properties_within_polygon, properties_nearby, map_view
from . import views

urlpatterns = [
    path("", views.map_view, name="map"),
    path("api/properties/nearby/", properties_nearby, name="properties-nearby"),
    path("api/properties/within_polygon/", properties_within_polygon, name="properties-within-polygon"),
    path("api/amenities/", views.amenities_overpass, name="amenities_overpass"),

]