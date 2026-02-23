
 # GeoDjango models
from django.contrib.gis.db import models
from django.contrib.gis.geos import Point



class Property(models.Model):
    address = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    bedrooms = models.IntegerField(null=True, blank=True)
    bathrooms = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    property_type = models.CharField(max_length=100, null=True, blank=True)
    sale_date = models.DateField(null=True, blank=True)

    # helper fields
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Actual geometry field used for spatial queries
    location = models.PointField(geography=True, srid=4326, null=True, blank=True)

    class Meta:
        verbose_name_plural = "Properties"

    def save(self, *args, **kwargs):
        # If lat & lon are provided, build the Point geometry automatically
        if self.latitude is not None and self.longitude is not None:
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.address} - €{self.price}"
    

# EdArea: stores ED polygons
class EdArea(models.Model):
    """
    Dublin Electoral Division polygon (v1 map unit).
    """
    name = models.CharField(max_length=255)
    county = models.CharField(max_length=255, blank=True, null=True)
    geom = models.MultiPolygonField(srid=4326)

    class Meta:
        verbose_name = "Electoral Division"
        verbose_name_plural = "Electoral Divisions"
        indexes = [
            models.Index(fields=["geom"]),
        ]

    def __str__(self):
        return self.name
    
# EdYearStats: stores aggregated stats per ED per year
class EdYearStats(models.Model):
    """
    Aggregated PPR stats per ED per year (v1 metrics).
    """
    ed = models.ForeignKey(EdArea, on_delete=models.CASCADE, related_name="year_stats")
    year = models.PositiveSmallIntegerField()
    transaction_count = models.PositiveIntegerField()
    median_price = models.DecimalField(max_digits=12, decimal_places=2)
    yoy_percent = models.DecimalField(max_digits=7, decimal_places=2, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["ed", "year"], name="unique_ed_year")
        ]
        indexes = [
            models.Index(fields=["year"]),
        ]

    def __str__(self):
        return f"{self.ed.name} ({self.year})"

