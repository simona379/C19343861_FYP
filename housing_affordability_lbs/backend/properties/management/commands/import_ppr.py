import csv
from pathlib import Path
from datetime import datetime

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point

from properties.models import Property


class Command(BaseCommand):
    """
    Import the geocoded PPR dataset (to 2017) into the Property model.

    Expected columns:

      - 'year'
      - 'sale_date'
      - 'address'
      - 'ppr_county'
      - 'price'
      - 'description_of_property'
      - 'latitude'
      - 'longitude'
      - 'small_area'

    Usage:

        python manage.py import_ppr ../data/ppr_to2017_geocoded.csv --limit 5000
    """

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            type=str,
            help="Path to ppr_to2017_geocoded.csv",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Optional limit for number of rows (for testing).",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"])
        limit = options["limit"]

        if not csv_path.exists():
            self.stderr.write(self.style.ERROR(f"CSV not found: {csv_path}"))
            return

        self.stdout.write(self.style.NOTICE(f"Reading CSV: {csv_path}"))

        created_count = 0
        updated_count = 0
        skipped_no_coords = 0
        skipped_other = 0

        # This file is mac_roman encoded
        with csv_path.open(newline="", encoding="mac_roman") as f:
            reader = csv.DictReader(f)

            for i, row in enumerate(reader, start=1):
                if limit is not None and created_count >= limit:
                    break

                try:
                    # basic fields 
                    address = (row.get("address") or "").strip()
                    county = (row.get("ppr_county") or "").strip()
                    prop_type = (row.get("description_of_property") or "").strip()
                    small_area = (row.get("small_area") or "").strip()

                    # price is numeric in this dataset
                    raw_price = row.get("price")
                    if raw_price in ("", None):
                        continue
                    price = float(raw_price)

                    # sale date (try few formats) 
                    sale_date = None
                    raw_date = (row.get("sale_date") or "").strip()
                    if raw_date:
                        # try ISO style first, then dd/mm/yyyy
                        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                            try:
                                sale_date = datetime.strptime(raw_date, fmt).date()
                                break
                            except ValueError:
                                continue

                    # coords 
                    lat_str = row.get("latitude")
                    lon_str = row.get("longitude")
                    if not lat_str or not lon_str:
                        skipped_no_coords += 1
                        continue

                    try:
                        lat = float(lat_str)
                        lon = float(lon_str)
                    except ValueError:
                        skipped_no_coords += 1
                        continue

                    location = Point(lon, lat, srid=4326)

                    # create / update Property
                    # match on (address, price, sale_date) as a simple key
                    prop, created = Property.objects.get_or_create(
                        address=address,
                        price=price,
                        sale_date=sale_date,
                        defaults={
                            "property_type": prop_type,
                        },
                    )

                    # Update coordinates + any optional fields
                    changed = False

                    # If model has latitude/longitude fields, set them
                    if hasattr(prop, "latitude"):
                        prop.latitude = lat
                        changed = True
                    if hasattr(prop, "longitude"):
                        prop.longitude = lon
                        changed = True

                    # If the model has small_area, set it
                    if hasattr(prop, "small_area") and small_area:
                        prop.small_area = small_area
                        changed = True

                    # If the model has county, set it
                    if hasattr(prop, "county") and county:
                        prop.county = county
                        changed = True

                    # If the model has property_type and it's empty, fill it
                    if not getattr(prop, "property_type", None) and prop_type:
                        prop.property_type = prop_type
                        changed = True

                    # If the model has 'location' PointField, set it
                    if hasattr(prop, "location"):
                        prop.location = location
                        changed = True

                    if changed:
                        prop.save()
                        if not created:
                            updated_count += 1

                    if created:
                        created_count += 1

                    if i % 2000 == 0:
                        self.stdout.write(
                            f"Processed {i} rows... "
                            f"created: {created_count}, updated: {updated_count}"
                        )

                except Exception as e:
                    skipped_other += 1
                    # Uncomment to see row-level errors:
                    # self.stderr.write(f"Row {i} error: {e}")

        # Summary
        self.stdout.write(self.style.SUCCESS("Import finished."))
        self.stdout.write(self.style.SUCCESS(f"  Created: {created_count}"))
        self.stdout.write(self.style.SUCCESS(f"  Updated: {updated_count}"))
        self.stdout.write(
            self.style.WARNING(f"  Skipped (no/invalid coords): {skipped_no_coords}")
        )
        self.stdout.write(
            self.style.WARNING(f"  Skipped (other errors): {skipped_other}")
        )