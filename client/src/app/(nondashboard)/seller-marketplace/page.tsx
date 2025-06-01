// src/app/(nondashboard)/seller-marketplace/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SellerFiltersBar from "./SellerFiltersBar";
import SellerListings from "./SellerListings";
import SellerMap from "./SellerMap";
import {
  SellerProperty,
  SellerMarketplaceFilters,
  initialSellerMarketplaceFilters,
  cleanSellerFiltersForURL,
} from "@/types/sellerMarketplaceTypes";

// Define NAVBAR_HEIGHT or import it if available globally
const NAVBAR_HEIGHT = 64; // Example height in pixels

const SellerMarketplacePage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [allProperties, setAllProperties] = useState<SellerProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL or use defaults
  const [currentFilters, setCurrentFilters] = useState<SellerMarketplaceFilters>(() => {
    const params = new URLSearchParams(searchParams.toString());
    const filtersFromUrl: Partial<SellerMarketplaceFilters> = {};

    if (params.has('location')) filtersFromUrl.location = params.get('location')!;
    if (params.has('coordinates')) {
        const coords = params.get('coordinates')!.split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            filtersFromUrl.coordinates = [coords[0], coords[1]];
        }
    }
    if (params.has('salePriceRange')) {
        const [min, max] = params.get('salePriceRange')!.split(',');
        filtersFromUrl.salePriceRange = [min ? Number(min) : null, max ? Number(max) : null];
    }
    if (params.has('propertyType')) filtersFromUrl.propertyType = params.get('propertyType')!;
    if (params.has('beds')) filtersFromUrl.beds = params.get('beds')!;

    return { ...initialSellerMarketplaceFilters, ...filtersFromUrl };
  });


  // Fetch properties on component mount
  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/seller-properties"); // Your API endpoint
        if (!response.ok) {
          throw new Error(`Failed to fetch properties: ${response.statusText}`);
        }
        const data: SellerProperty[] = await response.json();
        setAllProperties(data);
      } catch (e: any) {
        console.error("Error fetching seller properties:", e);
        setError(e.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // Update URL when filters change
  const handleFiltersChange = useCallback((newFilters: SellerMarketplaceFilters) => {
    setCurrentFilters(newFilters);
    const cleanedQuery = cleanSellerFiltersForURL(newFilters);
    const queryString = new URLSearchParams(cleanedQuery).toString();
    router.push(`${pathname}?${queryString}`, { scroll: false });
  }, [pathname, router]);

  // Memoize filters for child components
  const memoizedFilters = useMemo(() => currentFilters, [currentFilters]);

  // Client-side filtering for the map (listings component does its own filtering)
  const propertiesForMap = useMemo(() => {
    if (isLoading || !allProperties) return [];
    return allProperties.filter(property => {
        let match = true;
        if (memoizedFilters.propertyType && property.propertyType !== memoizedFilters.propertyType) {
            match = false;
        }
        if (memoizedFilters.beds) {
            const minBeds = parseInt(memoizedFilters.beds, 10);
            if (property.beds < minBeds) match = false;
        }
        if (memoizedFilters.salePriceRange) {
            const [minPrice, maxPrice] = memoizedFilters.salePriceRange;
            if (minPrice !== null && property.salePrice < minPrice) match = false;
            if (maxPrice !== null && property.salePrice > maxPrice) match = false;
        }
        if (memoizedFilters.location && memoizedFilters.location.trim() !== "") {
            const searchTerm = memoizedFilters.location.toLowerCase();
            const inName = property.name.toLowerCase().includes(searchTerm);
            const inAddress = property.location.address.toLowerCase().includes(searchTerm);
            const inCity = property.location.city.toLowerCase().includes(searchTerm);
             if (!inName && !inAddress && !inCity ) {
                match = false;
            }
        }
        return match;
    });
  }, [allProperties, memoizedFilters, isLoading]);

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div
      className="w-full mx-auto flex flex-col bg-gray-100" // Changed background
      style={{ height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
    >
      <SellerFiltersBar
        onFiltersChange={handleFiltersChange}
        initialFilters={memoizedFilters}
      />
      <div className="flex flex-1 overflow-hidden pt-1"> {/* Added padding-top */}
        {/* Listings Section (Scrollable) */}
        <div className="w-full md:w-[45%] lg:w-2/5 xl:w-1/3 h-full overflow-y-auto bg-gray-100 md:pr-1">
          <SellerListings
            allProperties={allProperties}
            filters={memoizedFilters}
            isLoading={isLoading}
          />
        </div>

        {/* Map Section */}
        <div className="hidden md:block md:w-[55%] lg:w-3/5 xl:w-2/3 h-full p-1 md:p-2">

        </div>
      </div>
    </div>
  );
};

export default SellerMarketplacePage;