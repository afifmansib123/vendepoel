// src/app/(nondashboard)/seller-marketplace/SellerMap.tsx
"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  SellerProperty,
  SellerMarketplaceFilters,
} from "@/types/sellerMarketplaceTypes";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

interface SellerMapProps {
  properties: SellerProperty[]; // Filtered properties to display
  filters: SellerMarketplaceFilters;
  isLoading: boolean;
}

const SellerMap: React.FC<SellerMapProps> = ({
  properties,
  filters,
  isLoading,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current, // No longer needs '!' if checked above
        style: "mapbox://styles/transthecontinental/cmayyj6gf00a501sd46psd2j8", // Your Mapbox style
        center: filters.coordinates || [-98.5795, 39.8283], // Default to center of US or a sensible default
        zoom: filters.coordinates ? 9 : 3, // Zoom in if coordinates are specific, else zoom out
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      const mapInstance = mapRef.current;
      const resizeObserver = new ResizeObserver(() => {
        mapInstance.resize();
      });
      if (mapContainerRef.current) {
        // Check again because it could be nullified by fast refresh
        resizeObserver.observe(mapContainerRef.current);
      }

      return () => {
        if (mapContainerRef.current)
          resizeObserver.unobserve(mapContainerRef.current);
        mapInstance.remove();
        mapRef.current = null;
      };
    }
  }, []); // Initialize map only once

  useEffect(() => {
    if (!mapRef.current || isLoading) return;

    const map = mapRef.current;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (properties.length > 0) {
      properties.forEach((property) => {
        if (property.location?.coordinates) {
          const { longitude, latitude } = property.location.coordinates;
          const popupHTML = `
                    <div style="font-family: Arial, sans-serif; width: 220px; font-size: 13px;">
                    ${
                      property.photoUrls && property.photoUrls[0]
                        ? `<img src="${property.photoUrls[0]}" alt="${property.name}" style="width:100%; height:110px; object-fit:cover; border-radius:3px;">`
                        : ""
                    }
                    <h3 style="margin:8px 0 3px; font-size:1.05em; line-height: 1.2;">
                        <a href="/seller-marketplace/${
                          property.id
                        }" target="_blank" style="text-decoration:none; color:#0070f3; font-weight: 600;">${
            property.name
          }</a>
                    </h3>
                    <p style="margin:0 0 4px; font-size:1em; color:#16a34a; font-weight: bold;">
                        $${property.salePrice.toLocaleString()}
                    </p>
                    <p style="margin:0; font-size:0.8em; color:#555;">
                        ${property.beds} bd | ${
            property.baths
          } ba | ${property.squareFeet.toLocaleString()} sqft
                    </p>
                    </div>
                `;
          const marker = new mapboxgl.Marker({ color: "#16a34a" }) // Green for "for sale"
            .setLngLat([longitude, latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
                popupHTML
              )
            )
            .addTo(map);
          markersRef.current.push(marker);
        }
      });

      if (filters.coordinates) {
        map.flyTo({ center: filters.coordinates, zoom: 10, duration: 1200 });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        properties.forEach((p) => {
          if (p.location?.coordinates) {
            bounds.extend([
              p.location.coordinates.longitude,
              p.location.coordinates.latitude,
            ]);
          }
        });
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 1000 });
        }
      }
    } else if (filters.coordinates) {
      // No properties, but location searched
      map.flyTo({ center: filters.coordinates, zoom: 10, duration: 1200 });
    }
  }, [properties, filters.coordinates, isLoading]);

  return (
    <div className="h-full w-full relative rounded-xl overflow-hidden">
      <div
        ref={mapContainerRef}
        className="absolute top-0 bottom-0 left-0 right-0"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-400 bg-opacity-50 flex items-center justify-center">
          <p className="text-white text-lg">Loading Map...</p>
        </div>
      )}
      {!isLoading && properties.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg text-sm text-gray-700">
          No properties match your current search on the map.
        </div>
      )}
    </div>
  );
};

export default SellerMap;
