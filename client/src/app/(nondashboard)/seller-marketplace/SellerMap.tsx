// src/app/(nondashboard)/seller-marketplace/SellerMap.tsx
"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { SellerProperty } from "@/types/sellerMarketplaceTypes";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

interface SellerMapProps {
  properties: SellerProperty[];
  isLoading: boolean;
}

const SellerMap: React.FC<SellerMapProps> = ({ properties, isLoading }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Function to geocode a location string
  const geocodeLocation = useCallback(async (locationString: string): Promise<{longitude: number, latitude: number} | null> => {
    try {
      const query = encodeURIComponent(locationString);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxgl.accessToken}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Geocoding response for ${locationString}:`, data);
      
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        return { longitude, latitude };
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to geocode ${locationString}:`, error);
      return null;
    }
  }, []);

  // Function to create location markers
  const createLocationMarker = useCallback((
    coordinates: {longitude: number, latitude: number}, 
    properties: SellerProperty[], 
    map: mapboxgl.Map
  ) => {
    const propertyCount = properties.length;
    const firstProperty = properties[0];
    
    console.log(`Creating marker for ${firstProperty.location.city} with ${propertyCount} properties`);
    
    // Format price range
    const prices = properties.map(p => p.salePrice).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    const priceRange = minPrice === maxPrice ? 
      formatPrice(minPrice) : 
      `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

    // Create popup content
    const propertyListHTML = properties.slice(0, 5).map(property => `
      <div style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
        <div style="font-weight: 600; font-size: 0.9em; margin-bottom: 2px; color: #1f2937;">
          ${property.name}
        </div>
        <div style="font-size: 0.85em; color: #059669; font-weight: 600; margin-bottom: 2px;">
          ${formatPrice(property.salePrice)}
        </div>
        <div style="font-size: 0.8em; color: #6b7280;">
          ${property.beds} bed • ${property.baths} bath • ${property.propertyType}
        </div>
      </div>
    `).join('');

    const popupHTML = `
      <div style="font-family: Arial, sans-serif; width: 280px;">
        <div style="background: #059669; color: white; padding: 12px; margin: -15px -15px 12px -15px;">
          <h3 style="margin: 0 0 4px; font-size: 1.1em; font-weight: 600;">
            ${firstProperty.location.city}, ${firstProperty.location.country}
          </h3>
          <div style="font-size: 0.9em; opacity: 0.9;">
            ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'} • ${priceRange}
          </div>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto;">
          ${propertyListHTML}
          ${properties.length > 5 ? `
            <div style="text-align: center; padding: 8px; color: #6b7280; font-size: 0.8em;">
              ... and ${properties.length - 5} more properties
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Create custom marker
    const markerElement = document.createElement('div');
    markerElement.style.cssText = `
      background: #059669;
      color: white;
      border: 3px solid white;
      border-radius: 50%;
      width: ${Math.min(35 + (propertyCount * 3), 60)}px;
      height: ${Math.min(35 + (propertyCount * 3), 60)}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${propertyCount > 99 ? '11px' : '14px'};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    markerElement.textContent = propertyCount > 99 ? '99+' : propertyCount.toString();

    // Add hover effect
    markerElement.addEventListener('mouseenter', () => {
      markerElement.style.transform = 'scale(1.15)';
    });
    markerElement.addEventListener('mouseleave', () => {
      markerElement.style.transform = 'scale(1)';
    });

    const marker = new mapboxgl.Marker(markerElement)
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .setPopup(new mapboxgl.Popup({ 
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px'
      }).setHTML(popupHTML))
      .addTo(map);

    return marker;
  }, []);

  // Function to add property markers to the map
  const addPropertyMarkers = useCallback(async (map: mapboxgl.Map, properties: SellerProperty[]) => {
    console.log("Adding property markers for:", properties);
    
    // Group properties by city and country
    const locationGroups: { [key: string]: SellerProperty[] } = {};
    
    properties.forEach(property => {
      if (property.location?.city && property.location?.country) {
        const locationKey = `${property.location.city}, ${property.location.country}`;
        if (!locationGroups[locationKey]) {
          locationGroups[locationKey] = [];
        }
        locationGroups[locationKey].push(property);
      }
    });

    console.log("Location groups:", locationGroups);

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    // Process each location group
    for (const [locationKey, propertiesInLocation] of Object.entries(locationGroups)) {
      console.log(`Processing location: ${locationKey} with ${propertiesInLocation.length} properties`);
      
      try {
        const coordinates = await geocodeLocation(locationKey);
        
        if (coordinates) {
          console.log(`Geocoded ${locationKey} to:`, coordinates);
          hasValidCoordinates = true;
          bounds.extend([coordinates.longitude, coordinates.latitude]);
          createLocationMarker(coordinates, propertiesInLocation, map);
        } else {
          console.warn(`Could not geocode location: ${locationKey}`);
        }
      } catch (error) {
        console.error(`Error geocoding ${locationKey}:`, error);
      }
    }

    // Fit map to show all markers
    if (hasValidCoordinates && !bounds.isEmpty()) {
      setTimeout(() => {
        map.fitBounds(bounds, { 
          padding: 50, 
          maxZoom: 10,
          duration: 1000 
        });
      }, 500);
    }
  }, [geocodeLocation, createLocationMarker]);

  useEffect(() => {
    console.log("SellerMap useEffect triggered");
    console.log("Properties:", properties);
    console.log("isLoading:", isLoading);
    console.log("mapContainerRef.current:", mapContainerRef.current);
    console.log("Mapbox token exists:", !!mapboxgl.accessToken);

    // Debug info for display
    setDebugInfo(`
      Properties count: ${properties?.length || 0}
      IsLoading: ${isLoading}
      Container ready: ${!!mapContainerRef.current}
      Token exists: ${!!mapboxgl.accessToken}
    `);

    if (!mapContainerRef.current) {
      console.log("No map container ref");
      return;
    }

    if (isLoading) {
      console.log("Still loading, skipping map init");
      return;
    }

    if (!mapboxgl.accessToken) {
      setMapError("Mapbox access token is missing");
      return;
    }

    // Clean up existing map if it exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      console.log("Initializing map...");
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [0, 20],
        zoom: 2,
        attributionControl: false,
      });

      mapRef.current = map;

      // Force map to resize after initialization
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      }, 100);

      map.on('load', async () => {
        console.log("Map loaded successfully");
        setMapError(null);
        
        // Process properties and add markers
        if (properties && properties.length > 0) {
          await addPropertyMarkers(map, properties);
        }
      });

      map.on('error', (e) => {
        console.error("Map error:", e);
        setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });

    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(`Failed to initialize map: ${error}`);
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up map");
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };

  }, [properties, isLoading, addPropertyMarkers]);

  // Show debug information
  if (mapError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-red-50 rounded-md p-4">
        <div className="text-red-600 font-semibold mb-2">Map Error:</div>
        <div className="text-red-500 text-sm text-center">{mapError}</div>
        <div className="text-gray-500 text-xs mt-4 whitespace-pre-line">{debugInfo}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-200 rounded-md">
        <div className="text-gray-500">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gray-100" style={{ minHeight: '500px' }}>
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '500px',
        }}
      />
      
      {/* Debug overlay */}
      <div className="absolute top-2 left-2 bg-white bg-opacity-90 p-2 rounded text-xs max-w-xs z-10">
        <div className="font-semibold">Debug Info:</div>
        <div className="whitespace-pre-line">{debugInfo}</div>
      </div>
    </div>
  );
};

export default SellerMap;