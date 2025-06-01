// src/app/(nondashboard)/seller-marketplace/[id]/PropertyMiniMap.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { SellerPropertyLocationCoordinates } from '@/types/sellerMarketplaceTypes';
import { MapPin } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

interface PropertyMiniMapProps {
  coordinates: SellerPropertyLocationCoordinates | null;
  address?: string;
  propertyName?: string;
}

const PropertyMiniMap: React.FC<PropertyMiniMapProps> = ({ coordinates, address, propertyName }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) {
      console.warn("MiniMap: Map container ref not available.");
      return;
    }
    if (!mapboxgl.accessToken) {
        console.error("MiniMap: Mapbox Access Token is not set!");
        return;
    }

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
        try {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: coordinates ? [coordinates.longitude, coordinates.latitude] : [-98.5795, 39.8283], // Default center if no coords
                zoom: coordinates ? 14 : 3,
                interactive: true, // Allow some interaction
            });
            mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

            const mapInstance = mapRef.current;
            const currentMapContainer = mapContainerRef.current;
            const resizeObserver = new ResizeObserver(() => {
                if (mapInstance) mapInstance.resize();
            });
            if (currentMapContainer) resizeObserver.observe(currentMapContainer);

            // Cleanup function for when the component unmounts or coordinates change leading to re-initialization (though we try to avoid that)
            // This cleanup is primarily for the observer and map instance removal.
             const cleanup = () => {
                if (currentMapContainer) resizeObserver.unobserve(currentMapContainer);
                if (mapInstance) mapInstance.remove();
             };
             // If coordinates are not present on initial load, we might not set a marker yet.
             // The effect below will handle marker updates.
            // For initial setup, if this effect reruns, it should clean itself up.
            // return cleanup; //This caused issues with marker updates. Cleanup handled by main component unmount or specific logic.

        } catch (error) {
            console.error("Error initializing mini map:", error);
            return; // Stop if map fails to initialize
        }
    }

    // Update map center and marker when coordinates change
    if (mapRef.current && coordinates) {
        mapRef.current.flyTo({
            center: [coordinates.longitude, coordinates.latitude],
            zoom: 14,
            duration: 1000
        });

        // Remove old marker if it exists
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }

        // Add new marker
        markerRef.current = new mapboxgl.Marker({color: "#16a34a"})
            .setLngLat([coordinates.longitude, coordinates.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(propertyName || address || 'Property Location'))
            .addTo(mapRef.current);
    } else if (mapRef.current && !coordinates) { // No coordinates, remove marker
        if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
        // Optionally, reset map view to a default if coordinates become null
        // mapRef.current.flyTo({ center: [-98.5795, 39.8283], zoom: 3 });
    }
    
    // Cleanup map instance on component unmount
    return () => {
        if (mapRef.current) {
            console.log("MiniMap: Cleaning up map instance on unmount.");
            mapRef.current.remove();
            mapRef.current = null; // Ensure it's reset for potential remounts
            markerRef.current = null;
        }
    };


  }, [coordinates, propertyName, address]); // Rerun effect if coordinates or identifier text changes

  if (!coordinates && !address) { // If no location info at all
    return (
      <div className="py-6 md:py-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">Location</h3>
        <p className="text-gray-600">Map data is not available for this property.</p>
      </div>
    );
  }


  return (
    <div className="py-6 md:py-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Location</h3>
      {address && (
            <div className="mb-4 flex items-start text-gray-700">
                <MapPin size={20} className="mr-2.5 mt-0.5 text-gray-500 flex-shrink-0" />
                <span className="text-sm">{address}</span>
            </div>
        )}
      {/* Container for the map */}
      <div
        ref={mapContainerRef}
        className="h-72 md:h-96 w-full rounded-lg overflow-hidden shadow-lg border border-gray-200"
        style={{ backgroundColor: '#f0f0f0' }} // Fallback bg for when map is loading/failed
      >
        {!mapboxgl.accessToken && <p className="p-4 text-red-600 text-center">Mapbox token missing.</p>}
      </div>
       {coordinates && (
         <div className="mt-3 text-xs text-gray-500">
            Longitude: {coordinates.longitude.toFixed(4)}, Latitude: {coordinates.latitude.toFixed(4)}
         </div>
        )}
    </div>
  );
};

export default PropertyMiniMap;