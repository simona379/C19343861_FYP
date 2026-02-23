# Readme.md

Simona Petrauskaite
C19343861

Interactive geospatial web application for analysing residential property markets

Available at: https://myhousingmap.uk

⸻

# Overview

The Housing Affordability & Insights Map is an interactive web application built to help potential home buyers analyse residential property markets through:
	•	Geospatial visualisation of properties
	•	Price filtering & property type filtering
	•	Amenity search (schools, public transport, parks)
	•	User-driven polygon selection
	•	PWA features (installable + offline cache)
	•	Fully containerised production deployment

✔️ Full-stack development
✔️ Data analysis & ingestion pipelines
✔️ Geospatial processing (PostGIS, GeoDjango)
✔️ Modern deployment with Docker, Nginx & HTTPS
✔️ UX/UI engineering using Leaflet

⸻

# Tech Stack

Backend
	•	Python 3.11
	•	Django 5.2
	•	Django REST Framework
	•	GeoDjango
	•	PostGIS
	•	psycopg2

Frontend
	•	HTML, CSS, JavaScript
	•	Leaflet.js
	•	Service Worker (offline support)
	•	PWA (Web App) Manifest

DevOps & Deployment
	•	Docker & Docker Compose
	•	Nginx reverse proxy
	•	DigitalOcean Droplet
	•	HTTPS (Let’s Encrypt + Certbot)

Data Processing
	•	Pandas
	•	GeoPandas
	•	CSV → PostGIS ingestion via custom Django management command (import_ppr)

⸻

# System Architecture

Frontend (Leaflet, HTML, JS, PWA)

        │
        
Django Backend (REST API, GeoDjango)

        │
        
PostgreSQL + PostGIS Spatial Database

        │
        
Docker Compose (web + db services)

        │
        
Nginx Reverse Proxy + HTTPS

        │
        
DigitalOcean Droplet (Production Deployment)

⸻

# Project Structure

housing-app/
│
├── backend/
│   ├── backend/              # Django project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   ├── properties/           # Main application
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── import_ppr.py   # CSV → DB importer
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── api.py
│   │   ├── static/
│   │   │   └── properties/
│   │   │       ├── css/
│   │   │       ├── js/
│   │   │       └── icons/
│   │   └── templates/
│   │       └── properties/map.html
│   │
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
│
└── ppr_dublin.csv            # Property dataset

⸻

# Local Development Instructions

1. Clone the repository
git clone https://github.com/<your-repo>/housing-app.git
cd housing-app/backend

2. Set up a virtual environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

3. Start PostGIS (local or Docker)
brew install postgresql postgis
docker-compose up database

4. Apply migrations
python manage.py migrate

5. Import the property dataset
python manage.py import_ppr ../ppr_dublin.csv

6. Run the Django server
python manage.py runserver

⸻

# Docker Deployment (Local or Production)

1. Build & run containers
docker-compose up -d --build

This creates:
service         port            description
web             8000            Django server
database        5433->5432      PostGis Database

check running services
docker-compose ps

⸻

# Production Deployment (DigitalOcean)

Copy Project to Server
scp -r housing-app root@<server-ip>:~/housing-app

SSH into server
ssh root@<server-ip>

Start Docker in production
cd housing-app/backend
docker-compose up -d --build

⸻

# Nginx Reverse Proxy Configuration (port 80 -> 8000)

File: /etc/nginx/sites-available/housing
server {
    listen 80;
    server_name myhousingmap.uk www.myhousingmap.uk;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

Enable config:
ln -s /etc/nginx/sites-available/housing /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

⸻

# HTTPS setup (Certbot & Lets Encrypt)

Install
apt install -y certbot python3-certbot-nginx

Obtain certificate
certbot --nginx -d myhousingmap.uk -d www.myhousingmap.uk

⸻

# Progressive Web App (PWA)

Manifest File

properties/static/properties/manifest.webmanifest

Defines:
	•	App name
	•	Icons (192/512)
	•	Start URL
	•	Theme colour
	•	Standalone display mode

Service Worker

properties/static/properties/js/service-worker.js

Features:
	•	Offline caching
	•	Install prompts on supported browsers
	•	Cache-first delivery for core assets

⸻

# Dataset Description

Source: Dublin Residential Property Register
Fields used:
	•	Address
	•	Price
	•	Date
	•	Latitude / Longitude
	•	Property Type

Converted to GeoJSON + PostGIS geometry (PointField).

Imported via:
python manage.py import_ppr ../ppr_dublin.csv

⸻

# Testing Checklist

Map Features
	•	Load all properties
	•	Cluster colouring (low/mid/high price)
	•	Standalone colour-coded markers
	•	Drawing polygon to filter
	•	Radius search (“Use My Location”)
	•	Nearby amenities (schools, parks, transport) with custom colours
	•	Summary boxes

PWA Features
	•	Manifest recognition
	•	Service worker active
	•	App installation
	•	Reload offline behaviour using DevTools

Backend & Deployment
	•	Dockerised services
	•	PostGIS spatial queries
	•	HTTPS enforced
	•	Custom management command for data import


Backend & Database Verification:

Task                                    Command
All containers                          docker ps -a
Only running containers                 docker ps
App stack status                        docker-compose ps
Check Django response                   curl -I http://localhost:8000/
View logs                               docker-compose logs --tail=50 web

⸻

# This system has:

	•	Full stack end-to-end web app development
	•	Cloud deployment architecture
	•	Integration of geospatial technologies (PostGIS, GeoDjango)
    •	Docker containerisation for reproducible environments
	•	A fully working production PWA
	•	Secure, scalable architecture using containers
	•	Geographic data analysis
    •	Data ingestion and processing
	•	Secure deployment (HTTPS, Nginx reverse proxy)
	•	Interactive UX using Leaflet

⸻

# #Final Deliverables

Project includes:
	•	Working live deployment: https://myhousingmap.uk
	•	Source code repository
	•	README 
    •	Fully containerised backend
	•	CSV importer for dataset
	•	PWA-enabled frontend
	•	Production deployment on DigitalOcean (Docker + Nginx + HTTPS)

⸻

