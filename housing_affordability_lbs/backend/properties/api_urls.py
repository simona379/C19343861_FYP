from django.urls import path
from .api_views import RoutingKeyList, RoutingKeyDetail, RoutingKeyTrend

urlpatterns = [
    path("routing-keys/", RoutingKeyList.as_view(), name="routing-key-list"),
    path("routing-keys/<str:routing_key>/", RoutingKeyDetail.as_view(), name="routing-key-detail"),
    path("routing-keys/<str:routing_key>/trend/", RoutingKeyTrend.as_view()),

]