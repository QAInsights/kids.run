# Kids.Run

Kids.Run is a single page application built with React and Vite that helps parents optimize multi stop routes for dropping off and picking up children. The application automatically calculates driving times and draws efficient itineraries utilizing the Google Maps Directions API.

## Features

* Create and manage profiles for multiple children
* Schedule location based activities with specific starting and ending times
* Automatically load location coordinates via Google Maps Autocomplete
* Generate detailed daily itineraries with live driving duration estimates
* Toggle native dark mode styling

## Setup

1. Clone the repository
2. Run npm install
3. Run npm run dev to start the local development server

## Configuration

To use the live routing capabilities, you will need a Google Maps API Key. You must enable the following APIs in your Google Cloud Console:
* Places API
* Maps JavaScript API
* Directions API

Provide your API Key via the settings panel in the running application. Keys are securely stored only within your browser local storage.
