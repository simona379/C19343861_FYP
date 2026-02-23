# Python base image
FROM python:3.11-slim

# System dependencies needed for GeoDjango + PostGIS
RUN apt-get update && apt-get install -y \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    libpq-dev\
    build-essential\
    && rm -rf /var/lib/apt/lists/*

# Python runtime settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Tell pip where GDAL is located
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Workdir inside container
WORKDIR /app

# Install Python dependenciess first (for better build caching)
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . /app/

# Expose Django port
EXPOSE 8000

# Default command: simple runserver
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]