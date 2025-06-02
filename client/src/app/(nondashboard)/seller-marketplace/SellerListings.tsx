// src/app/(nondashboard)/seller-marketplace/SellerListings.tsx
"use client";

import React from "react";
import { SellerProperty, SellerMarketplaceFilters } from "@/types/sellerMarketplaceTypes";
import SellerPropertyCard from "@/components/SellerPropertyCard"; // Ensure path is correct

interface SellerListingsProps {
  allProperties: SellerProperty[];
  filters: SellerMarketplaceFilters;
  isLoading: boolean;
}

const SellerListings: React.FC<SellerListingsProps> = ({ allProperties, filters, isLoading }) => {

  const filteredProperties = React.useMemo(() => {
    if (!allProperties) return []; // Handle case where allProperties might be initially undefined/null

    return allProperties.filter(property => {
      // Location filtering
      // Ensure property.location exists and has the country, state, city fields
      if (filters.country && (!property.location || property.location.country !== filters.country)) {
        return false;
      }
      if (filters.state && (!property.location || property.location.state !== filters.state)) {
        return false;
      }
      if (filters.city && (!property.location || property.location.city !== filters.city)) {
        return false;
      }

      // Other filters
      if (filters.propertyType && filters.propertyType !== "any" && property.propertyType !== filters.propertyType) {
        return false;
      }
      if (filters.beds && filters.beds !== "any") {
          const minBeds = parseInt(filters.beds, 10);
          if (property.beds < minBeds) return false;
      }
      if (filters.salePriceRange) {
          const [minPrice, maxPrice] = filters.salePriceRange;
          if (minPrice !== null && property.salePrice < minPrice) return false;
          if (maxPrice !== null && property.salePrice > maxPrice) return false;
      }
      return true;
    });
  }, [allProperties, filters]); // Dependencies: allProperties and filters

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
        Loading properties...
      </div>
    );
  }

  if (!allProperties || allProperties.length === 0) {
     return <div className="p-6 text-center text-gray-500">No properties available at the moment.</div>;
  }

  if (filteredProperties.length === 0 && !isLoading) { // Check !isLoading here
    return <div className="p-6 text-center text-gray-500">No properties match your current filters. Try adjusting your search.</div>;
  }

  // Construct location string for display, more robustly
  const locationParts: string[] = [];
  if (filters.city) locationParts.push(filters.city);
  if (filters.state) locationParts.push(filters.state);
  if (filters.country) locationParts.push(filters.country);
  const locationFilterString = locationParts.join(', ');

  return (
    <div className="w-full h-full">
      <h3 className="text-base px-4 py-3 font-semibold sticky top-0 bg-gray-50 z-10 border-b border-gray-200 text-gray-700">
        {filteredProperties.length} Propert{filteredProperties.length === 1 ? "y" : "ies"} Found
        {locationFilterString && <span className="font-normal text-gray-600"> in {locationFilterString}</span>}
      </h3>
      <div className="p-3 md:p-4 space-y-4">
        {filteredProperties.map((property) => (
          <SellerPropertyCard
            key={property._id} // Assuming _id is the unique identifier
            property={property}
            propertyLinkBase="/seller-marketplace" // Or your actual link base
          />
        ))}
      </div>
    </div>
  );
};

export default SellerListings;