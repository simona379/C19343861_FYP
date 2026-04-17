# Readme.md

# myhousingmap.uk

Simona Petrauskaite
C19343861

Interactive geospatial decision-support system for analysing housing affordability and area suitability across Dublin.

Live system: https://myhousingmap.uk

⸻

# Overview

This project presents a web-based data visualisation and analysis tool designed to support potential home buyers in exploring housing markets across Dublin.

This system adopts an area-based analytical approach, aggregating housing and contextual data at the Eircode routing key level. This allows users to compare areas based on price trends, affordability and lifestyle factors.

The application integrates geospatial visualisation with multi-criteria decision support, enabling users to:

* Explore housing prices across areas using an interactive map
* Analyse trends and transaction data over time
* Filter areas based on budget constraints
* Evaluate areas using weighted preferences (e.g., schools, parks, transport)
* Compare results through rankings and visual analytics

## Motivation

Housing data is often complex and difficult to interpret at scale. This project aims to transform raw data into intuitive visual insights to support informed decision-making for potential buyers.

⸻

# Key Features

## Geospatial Visualisation

* Choropleth map of Dublin using routing key polygons
* Colour-coded areas based on affordability and suitability
* Interactive hover and click behaviour

## Area-Based Analytics

* Median property price per area
* Transaction counts
* Year-on-year price change
* Time-series trend visualisation

## Decision Support System

* User-defined preferences (schools, parks, education, transport)
* Weighted scoring system for area suitability
* Real-time filtering and ranking of areas

## Comparative Insights

* Ranked list of best matching areas
* Area comparison against city averages
* Visual breakdown of strengths and weaknesses

⸻

# Tech Stack

Backend
	•	Python 3.11
	•	Django 
	•	Django REST Framework
	•	GeoDjango
	•	PostgreSQL + PostGIS

Frontend
	•	React (Vite)
	•	React-Leaflet
	•	Chart.js (analytics)
	•	HTML, CSS, JavaScript

Data Processing
	•	Pandas
	•	GeoPandas
	•	Custom aggregation pipelines

DevOps & Deployment
	•	Docker & Docker Compose
	•	Nginx reverse proxy
	•	DigitalOcean Droplet
	•	HTTPS (Let’s Encrypt + Certbot)

⸻

# System Architecture

Frontend (React, Leaflet)

        │
        
Django Backend (REST API, GeoDjango)

        │
        
PostgreSQL + PostGIS (Spatial Database)

        │
        
Docker Containerised Service (web + db services)

        │
        
Nginx Reverse Proxy + HTTPS

        │
        
DigitalOcean Droplet (Production Deployment)

⸻

# Data Model

The system uses an area-level aggregation approach:

* Spatial unit: Eircode Routing Keys (e.g., D06, D09)
* Data aggregated per area:
    * Median price
    * Transaction count
    * Year-on-year change
    * Amenity counts

This aggregation approach improves performance, reduces spatial noise, and enables clearer comparison between areas.

⸻

# Project Structure

housing_affordability_lbs/
│
├── backend/
│   ├── backend/              # Django project
│   ├── properties/           # Core app (models, API, aggregation)
│   ├── data/
│   │   └── spatial/          # GeoJSON boundaries
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   └── RoutingKeys_EIRE.geojson
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   │   └── scoring.js    # Decision scoring logic
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js

⸻
 
# Core Functionality

API Endpoints (examples)

* /api/routing-keys/?year=2025
* /api/routing-keys/<key>/trend/
* /api/routing-keys/<key>/analysis/

These endpoints provide aggregated and analytical data used to power the frontend visualisations.

⸻

# Decision Scoring System

A custom scoring algorithm evaluates each area based on:

* Budget alignment
* Amenity availability
* User-defined weights

This produces:

* Suitability score (%)
* Ranking across all areas
* Interpretation of contributing factors

⸻

# Evaluation Focus

The system is evaluated based on:

* Accuracy of aggregated housing data
* Usability of the interface
* Effectiveness of the decision-support functionality
* Performance of spatial queries and API responses

⸻

# Key Contributions

* Transition from property-level to area-level analysis
* Integration of geospatial data with decision-support logic
* Development of a multi-criteria ranking system
* Full-stack implementation with real-world datasets
* Deployment of a live, production-ready system

⸻

# Final Deliverables

* Live application: https://myhousingmap.uk
* Full source code repository
* Data processing and aggregation pipeline
* Interactive geospatial visualisation system
* Final report and documentation

⸻

# Development & Deployment

## Using Docker
* docker-compose up -d --build

## Backend
* python manage.py migrate

## Frontend
* npm install
* npm run dev

