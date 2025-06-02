// src/app/(nondashboard)/seller-marketplace/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SellerFiltersBar from "./SellerFiltersBar";
import SellerListings from "./SellerListings";
// Import SellerMap if you re-implement it
// import SellerMap from "./SellerMap";
import {
  SellerProperty,
  SellerMarketplaceFilters,
  initialSellerMarketplaceFilters,
  cleanSellerFiltersForURL,
} from "@/types/sellerMarketplaceTypes";

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

    // Read new location filters from URL
    if (params.has('country')) filtersFromUrl.country = params.get('country')!;
    if (params.has('state')) filtersFromUrl.state = params.get('state')!;
    if (params.has('city')) filtersFromUrl.city = params.get('city')!;

    // Existing filter reading
    if (params.has('salePriceRange')) {
      const [min, max] = params.get('salePriceRange')!.split(',');
      filtersFromUrl.salePriceRange = [
        min && min !== 'null' && !isNaN(Number(min)) ? Number(min) : null,
        max && max !== 'null' && !isNaN(Number(max)) ? Number(max) : null
      ];
    } else {
      // Ensure salePriceRange always has a default structure
      filtersFromUrl.salePriceRange = [null, null];
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
        // Ensure your API returns properties with the location structure:
        // property.location.country, property.location.state, property.location.city
        const response = await fetch("/api/seller-properties");
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
    setCurrentFilters(newFilters); // Update local state
    const cleanedQuery = cleanSellerFiltersForURL(newFilters); // Use updated cleaner
    const queryString = new URLSearchParams(cleanedQuery).toString();
    router.push(`${pathname}?${queryString}`, { scroll: false });
  }, [pathname, router]);

  // Memoize filters for child components to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => currentFilters, [currentFilters]);

  // Client-side filtering for the map (if you re-add SellerMap)
  // SellerListings component does its own filtering, so this `propertiesForMap`
  // is primarily if you want to show different/all markers on a map and highlight some.
  // For now, this filtering logic is illustrative for a map context.
  const propertiesForMap = useMemo(() => {
    if (isLoading || !allProperties) return [];
    return allProperties.filter(property => {
        let match = true;

        // Location filtering
        if (memoizedFilters.country && property.location.country !== memoizedFilters.country) {
            match = false;
        }
        if (match && memoizedFilters.state && property.location.state !== memoizedFilters.state) {
            match = false;
        }
        if (match && memoizedFilters.city && property.location.city !== memoizedFilters.city) {
            match = false;
        }

        // Other filters (copied from SellerListings for consistency if map were to use them)
        if (match && memoizedFilters.propertyType && property.propertyType !== memoizedFilters.propertyType) {
            match = false;
        }
        if (match && memoizedFilters.beds) {
            const minBeds = parseInt(memoizedFilters.beds, 10);
            if (property.beds < minBeds) match = false;
        }
        if (match && memoizedFilters.salePriceRange) {
            const [minPrice, maxPrice] = memoizedFilters.salePriceRange;
            if (minPrice !== null && property.salePrice < minPrice) match = false;
            if (maxPrice !== null && property.salePrice > maxPrice) match = false;
        }
        return match;
    });
  }, [allProperties, memoizedFilters, isLoading]);


  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div
      className="w-full mx-auto flex flex-col bg-gray-100"
      style={{ height: `calc(100vh - ${NAVBAR_HEIGHT}px)` }}
    >
      <SellerFiltersBar
        onFiltersChange={handleFiltersChange}
        initialFilters={memoizedFilters} // Pass memoizedFilters
      />
      <div className="flex flex-1 overflow-hidden pt-1">
        {/* Listings Section (Scrollable) */}
        <div className="w-full md:w-[45%] lg:w-2/5 xl:w-1/3 h-full overflow-y-auto bg-gray-100 md:pr-1">
          <SellerListings
            allProperties={allProperties} // Pass all fetched properties
            filters={memoizedFilters}     // Pass the current, memoized filters
            isLoading={isLoading}
          />
        </div>

        {/* Map Section Placeholder */}
        <div className="hidden md:block md:w-[55%] lg:w-3/5 xl:w-2/3 h-full p-1 md:p-2">
           {/* If you re-add SellerMap, pass `propertiesForMap` or `allProperties` + `filters`
           <SellerMap properties={propertiesForMap} isLoading={isLoading} />
           */}
           <div className="bg-gray-200 h-full flex items-center justify-center text-gray-500 rounded-md">
            Map Area (Placeholder)
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerMarketplacePage;