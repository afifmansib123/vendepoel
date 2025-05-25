// src/app/(nondashboard)/search/[id]/PropertyLocation.tsx
"use client";

import { useGetPropertyQuery } from "@/state/api";
// Make sure PropertyDetailsProps is defined or import the correct type for property
// For now, I'll assume it expects propertyId and PropertyFromAPI will be used internally
// import { PropertyFromAPI } from '@/types/apiReturnTypes';
import { Compass, MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

// Assuming PropertyDetailsProps looks something like this, adjust if different
interface PropertyDetailsProps {
  propertyId: number;
}

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property, // This 'property' will be of type PropertyFromAPI (or your equivalent)
    isError,
    isLoading,
    error, // Add error to the destructuring to display it
  } = useGetPropertyQuery(propertyId, {
    skip: !propertyId || isNaN(propertyId) // Good to keep this skip condition
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null); // To store map instance

  useEffect(() => {
    // Clean up existing map instance if it exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    if (isLoading || isError || !property || !mapContainerRef.current) {
        console.log("PropertyLocation: Skipping map initialization (loading, error, no property, or no map container).");
        return;
    }

    // <<< --- ADD THE CRITICAL NULL CHECKS HERE --- >>>
    if (
      property.location &&
      property.location.coordinates &&
      typeof property.location.coordinates.longitude === "number" &&
      typeof property.location.coordinates.latitude === "number"
    ) {
      const { longitude, latitude } = property.location.coordinates;

      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current, // No longer needs '!'
          style: "mapbox://styles/transthecontinental/cmayyj6gf00a501sd46psd2j8",
          center: [longitude, latitude],
          zoom: 14,
        });
        mapRef.current = map; // Store instance

        const marker = new mapboxgl.Marker()
          .setLngLat([longitude, latitude])
          .addTo(map);

        // Your custom marker styling (optional)
        // const markerElement = marker.getElement();
        // const path = markerElement.querySelector("path[fill='#3FB1CE']");
        // if (path) path.setAttribute("fill", "#000000");

        // Handle map resize
        const resizeObserver = new ResizeObserver(() => {
            if (mapRef.current) mapRef.current.resize();
        });
        resizeObserver.observe(mapContainerRef.current);

        return () => {
          if (mapContainerRef.current) { // Check ref before unobserving
            resizeObserver.unobserve(mapContainerRef.current);
          }
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
        };
      } catch (mapError) {
          console.error("Mapbox GL initialization error in PropertyLocation:", mapError);
      }
    } else {
      console.warn(`Property ID ${propertyId}: Location or coordinates are missing/invalid. Map not rendered.`);
    }
  }, [property, isLoading, isError, propertyId]); // propertyId added to deps if it could change

  if (isLoading) return <div className="py-16">Loading property location...</div>;

  if (isError) {
    let errorMessage = "Failed to load property data for location.";
    if (typeof error === 'object' && error !== null && 'data' in error) {
        const errorData = (error as any).data as { message?: string };
        errorMessage = `Error: ${errorData?.message || JSON.stringify((error as any).data)}`;
    } else if (error && 'message' in error) {
        errorMessage = `Error: ${(error as Error).message}`;
    }
    return <div className="py-16 text-red-600">{errorMessage}</div>;
  }

  if (!property) {
    return <div className="py-16">Property not found.</div>;
  }

  // If location or coordinates are missing, display a message instead of an empty map div
  if (!property.location || !property.location.coordinates || 
      typeof property.location.coordinates.longitude !== 'number' ||
      typeof property.location.coordinates.latitude !== 'number') {
    return (
      <div className="py-16">
        <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
          Map and Location
        </h3>
        <p className="mt-4 text-gray-600">Location coordinates are not available for this property. Map cannot be displayed.</p>
        {property.location?.address && (
             <div className="flex justify-between items-center text-sm text-primary-500 mt-2">
                <div className="flex items-center text-gray-500">
                    <MapPin className="w-4 h-4 mr-1 text-gray-700" />
                    Property Address:
                    <span className="ml-2 font-semibold text-gray-700">
                        {property.location.address || "Address not available"}
                    </span>
                </div>
             </div>
        )}
      </div>
    );
  }

  // Only render map container if coordinates are valid
  return (
    <div className="py-16">
      <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
        Map and Location
      </h3>
      <div className="flex justify-between items-center text-sm text-primary-500 mt-2">
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-1 text-gray-700" />
          Property Address:
          <span className="ml-2 font-semibold text-gray-700">
            {property.location.address || "Address not available"} {/* Safe access due to checks above */}
          </span>
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(
            property.location.address || ""
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-between items-center hover:underline gap-2 text-primary-600"
        >
          <Compass className="w-5 h-5" />
          Get Directions
        </a>
      </div>
      <div
        className="relative mt-4 h-[300px] rounded-lg overflow-hidden shadow-md" // Added shadow-md for better visuals
        ref={mapContainerRef}
      />
    </div>
  );
};

export default PropertyLocation;