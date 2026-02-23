# backend/urls.py

from django.contrib import admin
from django.urls import path, include
from properties.views import map_view, properties_within_polygon, properties_nearby
# service wroker
from django.views.generic import TemplateView


urlpatterns = [
    path("service-worker.js", TemplateView.as_view(template_name="service-worker.js", content_type="application/javascript",), name="service-worker",),
    path("admin/", admin.site.urls),

    # API endpoints
    path("api/", include("properties.api_urls")),

    # Include all URLs from properties app (nearby and within_polygon)
    path("", include("properties.urls")),

    #path("api/properties/nearby/", properties_nearby, name="properties-nearby"),
    #path("api/properties/within_polygon/", properties_within_polygon, name="properties-within-polygon"),
    # path("", map_view, name="map"),  # homepage = map
]