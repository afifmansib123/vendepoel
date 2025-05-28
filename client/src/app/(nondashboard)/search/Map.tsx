// src/app/(nondashboard)/search/Map.tsx
"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
// import { Property } from "@/types/prismaTypes"; // << REMOVE THIS, USE PropertyFromAPI

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const styles = { /* ... your map component styles ... */ }; // Assuming you have some or can add

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null); // Explicitly type the ref
  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters); // Pass the filters from Redux state

  useEffect(() => {
    // Ensure mapContainerRef.current is not null before initializing map
    if (!mapContainerRef.current || isLoading || isError || !properties || properties.length === 0) {
        // If there are no properties, or still loading/error, or ref is not ready, don't initialize map
        // You might want to remove an existing map instance here if properties array becomes empty later
        return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current, // No longer needs '!' if checked above
      style: "mapbox://styles/transthecontinental/cmayyj6gf00a501sd46psd2j8", // Your Mapbox style
      center: filters.coordinates || [-98.5795, 39.8283], // Default to center of US or a sensible default
      zoom: filters.coordinates ? 9 : 3, // Zoom in if coordinates are specific, else zoom out
    });

    properties.forEach((property) => { // Use the correct type
      // <<<<<<<< ADD NULL CHECKS HERE >>>>>>>>>>
      if (property.location && property.location.coordinates &&
          typeof property.location.coordinates.longitude === 'number' &&
          typeof property.location.coordinates.latitude === 'number') {
        
        const marker = createPropertyMarker(property, map); // Pass the correctly typed property
        // Optional: Style marker based on some property data if needed
        // const markerElement = marker.getElement();
        // const path = markerElement.querySelector("path[fill='#3FB1CE']");
        // if (path) path.setAttribute("fill", "#000000");
      } else {
        console.warn(`Property ID ${property.id} (${property.name}) is missing valid location or coordinates. Skipping marker.`);
      }
    });

    // Adjust map bounds to fit markers if needed (optional)
    if (properties.some(p => p.location && p.location.coordinates)) {
        const bounds = new mapboxgl.LngLatBounds();
        properties.forEach((property) => {
            if (property.location && property.location.coordinates &&
                typeof property.location.coordinates.longitude === 'number' &&
                typeof property.location.coordinates.latitude === 'number') {
                bounds.extend([property.location.coordinates.longitude, property.location.coordinates.latitude]);
            }
        });
        if (!bounds.isEmpty()) { // Check if bounds actually have points
             map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
    }


    const resizeObserver = new ResizeObserver(() => {
        map.resize();
    });
    if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
    }


    return () => {
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current);
      }
      map.remove();
    };
    // Ensure filters.coordinates is stable or correctly memoized if it causes too many re-renders
  }, [isLoading, isError, properties, filters.coordinates]); 

  if (isLoading) return <div style={{ padding: '20px' }}>Loading map and properties...</div>;
  // Better error display for user
  if (isError) return <div style={{ padding: '20px', color: 'red' }}>Failed to fetch properties for the map. Please try again later.</div>;
  if (!properties) return <div style={{ padding: '20px' }}>No property data available.</div>; // Should be caught by isLoading ideally

  return (
    <div className="basis-5/12 grow relative rounded-xl" style={{minHeight: '400px' /* Ensure map has height */}}>
      <div
        className="map-container rounded-xl"
        ref={mapContainerRef}
        style={{
          position: 'absolute', // Ensure map fills the container
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      />
      {properties.length === 0 && !isLoading && <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>No properties match your current filters.</div>}
    </div>
  );
};

// Ensure Property type here matches what is passed from the loop
const createPropertyMarker = (property : any, map: mapboxgl.Map) => {
  // The null checks are now done before calling this function,
  // but an extra check here for safety doesn't hurt, or rely on TypeScript nullability.
  if (!property.location?.coordinates) {
    console.error("createPropertyMarker called with invalid property location/coordinates", property);
    return null; // Or handle gracefully
  }

  const popupHTML = `
    <div style="font-family: Arial, sans-serif; width: 200px;">
      ${property.photoUrls && property.photoUrls[0] ? `<img src="${property.photoUrls[0]}" alt="${property.name}" style="width:100%; height:100px; object-fit:cover; border-radius:3px;">` : ''}
      <h3 style="margin:5px 0 3px; font-size:1em;">
        <a href="/search/${property.id}" target="_blank" style="text-decoration:none; color:#0070f3;">${property.name}</a>
      </h3>
      <p style="margin:0; font-size:0.9em; color:#333;">
        $${property.pricePerMonth} <span style="font-size:0.8em; color:#777;">/ month</span>
      </p>
      <p style="margin:3px 0 0; font-size:0.8em; color:#555;">
        ${property.beds} bed(s), ${property.baths} bath(s) - ${property.squareFeet} sqft
      </p>
    </div>
  `;

  const marker = new mapboxgl.Marker()
    .setLngLat([
      property.location.coordinates.longitude, // Assumed to be valid numbers here
      property.location.coordinates.latitude,
    ])
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML))
    .addTo(map);
  return marker;
};

export default Map;