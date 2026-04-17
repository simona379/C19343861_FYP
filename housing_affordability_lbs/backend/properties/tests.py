# Create your tests here.

# testing api views by mocking the ORM calls (managed = False for  RoutingKeyDublinYearStat and RoutingKeyAmenities, 
# Django will not create those tables for the test database automatically.)
# use real model instances in memory, without saving to the database
# Also: can test locally and not on server (with real production database)
# Will test: view logic & response handling 

# Gen AI 

from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from .models import RoutingKeyDublinYearStat, RoutingKeyAmenities
from .serializers import RoutingKeyDublinYearStatSerializer


class MockOrderedResult:
    def __init__(self, data):
        self.data = data

    def order_by(self, *args, **kwargs):
        return self.data

    def first(self):
        return self.data[0] if self.data else None


class RoutingKeyApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    # -----------------------------
    # RoutingKeyList tests
    # -----------------------------

    def test_routing_key_list_missing_year_returns_400(self):
        response = self.client.get("/api/routing-keys/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "year query param is required (e.g. ?year=2025)"},
        )

    def test_routing_key_list_invalid_min_tx_returns_400(self):
        response = self.client.get("/api/routing-keys/?year=2025&min_tx=abc")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "min_tx must be an integer"},
        )

    @patch("properties.api_views.RoutingKeyAmenities.objects.all")
    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_list_returns_merged_amenity_counts(
        self, mock_filter, mock_amenities_all
    ):
        row1 = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="D15",
            transactions=1287,
            median_price=418000,
            yoy_percent=11.47,
        )
        row2 = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="D24",
            transactions=937,
            median_price=376000,
            yoy_percent=-8.99,
        )

        mock_filter.return_value = MockOrderedResult([row1, row2])

        amenity1 = RoutingKeyAmenities(
            routingkey="D15",
            park_count=58,
            school_count=71,
            university_count=2,
            rail_tram_count=6,
        )
        amenity2 = RoutingKeyAmenities(
            routingkey="D24",
            park_count=172,
            school_count=83,
            university_count=1,
            rail_tram_count=21,
        )

        mock_amenities_all.return_value = [amenity1, amenity2]

        response = self.client.get("/api/routing-keys/?year=2025&min_tx=30")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["routing_key"], "D15")
        self.assertEqual(data[0]["park_count"], 58)
        self.assertEqual(data[0]["school_count"], 71)
        self.assertEqual(data[0]["university_count"], 2)
        self.assertEqual(data[0]["rail_tram_count"], 6)

        self.assertEqual(data[1]["routing_key"], "D24")
        self.assertEqual(data[1]["park_count"], 172)
        self.assertEqual(data[1]["school_count"], 83)
        self.assertEqual(data[1]["university_count"], 1)
        self.assertEqual(data[1]["rail_tram_count"], 21)

        mock_filter.assert_called_once_with(year=2025, transactions__gte=30)

    @patch("properties.api_views.RoutingKeyAmenities.objects.all")
    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_list_defaults_missing_amenity_row_to_zero(
        self, mock_filter, mock_amenities_all
    ):
        row = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=21.48,
        )

        mock_filter.return_value = MockOrderedResult([row])
        mock_amenities_all.return_value = []

        response = self.client.get("/api/routing-keys/?year=2025")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["routing_key"], "A94")
        self.assertEqual(data[0]["park_count"], 0)
        self.assertEqual(data[0]["school_count"], 0)
        self.assertEqual(data[0]["university_count"], 0)
        self.assertEqual(data[0]["rail_tram_count"], 0)

    @patch("properties.api_views.RoutingKeyAmenities.objects.all")
    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_list_defaults_null_amenity_values_to_zero(
        self, mock_filter, mock_amenities_all
    ):
        row = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=21.48,
        )

        amenity = RoutingKeyAmenities(
            routingkey="A94",
            park_count=None,
            school_count=None,
            university_count=None,
            rail_tram_count=None,
        )

        mock_filter.return_value = MockOrderedResult([row])
        mock_amenities_all.return_value = [amenity]

        response = self.client.get("/api/routing-keys/?year=2025")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data[0]["park_count"], 0)
        self.assertEqual(data[0]["school_count"], 0)
        self.assertEqual(data[0]["university_count"], 0)
        self.assertEqual(data[0]["rail_tram_count"], 0)

    # -----------------------------
    # RoutingKeyDetail tests
    # -----------------------------

    def test_routing_key_detail_missing_year_returns_400(self):
        response = self.client.get("/api/routing-keys/A94/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {"error": "year query param is required (e.g. ?year=2025)"},
        )

    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_detail_unknown_key_returns_404(self, mock_filter):
        mock_filter.return_value = MockOrderedResult([])

        response = self.client.get("/api/routing-keys/ZZZ/?year=2025")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "Not found"})

    @patch("properties.api_views.RoutingKeyAmenities.objects.filter")
    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_detail_returns_merged_data(
        self, mock_stats_filter, mock_amenity_filter
    ):
        row = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=21.48,
        )

        amenity = RoutingKeyAmenities(
            routingkey="A94",
            park_count=37,
            school_count=96,
            university_count=3,
            rail_tram_count=4,
        )

        mock_stats_filter.return_value = MockOrderedResult([row])
        mock_amenity_filter.return_value = MockOrderedResult([amenity])

        response = self.client.get("/api/routing-keys/A94/?year=2025")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["routing_key"], "A94")
        self.assertEqual(data["year"], 2025)
        self.assertEqual(data["transactions"], 593)
        self.assertEqual(data["median_price"], 820000)
        self.assertEqual(float(data["yoy_percent"]), 21.48)
        self.assertEqual(data["park_count"], 37)
        self.assertEqual(data["school_count"], 96)
        self.assertEqual(data["university_count"], 3)
        self.assertEqual(data["rail_tram_count"], 4)

    @patch("properties.api_views.RoutingKeyAmenities.objects.filter")
    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_detail_defaults_missing_amenity_to_zero(
        self, mock_stats_filter, mock_amenity_filter
    ):
        row = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=21.48,
        )

        mock_stats_filter.return_value = MockOrderedResult([row])
        mock_amenity_filter.return_value = MockOrderedResult([])

        response = self.client.get("/api/routing-keys/A94/?year=2025")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["park_count"], 0)
        self.assertEqual(data["school_count"], 0)
        self.assertEqual(data["university_count"], 0)
        self.assertEqual(data["rail_tram_count"], 0)

    # -----------------------------
    # RoutingKeyTrend tests
    # -----------------------------

    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_trend_returns_expected_fields(self, mock_filter):
        row1 = RoutingKeyDublinYearStat(
            year=2024,
            routing_key="A94",
            transactions=761,
            median_price=675000,
            yoy_percent=-2.17,
        )
        row2 = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=21.48,
        )

        mock_filter.return_value = MockOrderedResult([row1, row2])

        response = self.client.get("/api/routing-keys/A94/trend/")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data), 2)
        self.assertEqual(
            set(data[0].keys()),
            {"year", "median_price", "transactions", "yoy_percent"},
        )

    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_trend_unknown_key_returns_empty_list(self, mock_filter):
        mock_filter.return_value = MockOrderedResult([])

        response = self.client.get("/api/routing-keys/ZZZ/trend/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    @patch("properties.api_views.RoutingKeyDublinYearStat.objects.filter")
    def test_routing_key_trend_preserves_null_yoy_percent(self, mock_filter):
        row = RoutingKeyDublinYearStat(
            year=2019,
            routing_key="A94",
            transactions=4,
            median_price=445000,
            yoy_percent=None,
        )

        mock_filter.return_value = MockOrderedResult([row])

        response = self.client.get("/api/routing-keys/A94/trend/")

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data[0]["year"], 2019)
        self.assertEqual(data[0]["median_price"], 445000)
        self.assertEqual(data[0]["transactions"], 4)
        self.assertIsNone(data[0]["yoy_percent"])

from django.test import TestCase
from .models import RoutingKeyDublinYearStat
from .serializers import RoutingKeyDublinYearStatSerializer

# -----------------------------
# RoutingKeySerializer tests
# -----------------------------

class RoutingKeySerializerTests(TestCase):

    def test_serializer_includes_injected_amenity_fields(self):
        # Arrange
        obj = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=21.48,
        )

        # Inject fields manually (same as your view does)
        obj.park_count = 10
        obj.school_count = 20
        obj.university_count = 3
        obj.rail_tram_count = 5

        # Act
        data = RoutingKeyDublinYearStatSerializer(obj).data

        # Assert
        self.assertEqual(data["park_count"], 10)
        self.assertEqual(data["school_count"], 20)
        self.assertEqual(data["university_count"], 3)
        self.assertEqual(data["rail_tram_count"], 5)


    def test_serializer_contains_all_expected_fields(self):
        # Arrange
        obj = RoutingKeyDublinYearStat(
            year=2025,
            routing_key="A94",
            transactions=593,
            median_price=820000,
            yoy_percent=None,
        )

        obj.park_count = 0
        obj.school_count = 0
        obj.university_count = 0
        obj.rail_tram_count = 0

        # Act
        data = RoutingKeyDublinYearStatSerializer(obj).data

        # Assert
        expected_fields = {
            "year",
            "routing_key",
            "transactions",
            "median_price",
            "yoy_percent",
            "park_count",
            "school_count",
            "university_count",
            "rail_tram_count",
        }

        self.assertEqual(set(data.keys()), expected_fields)