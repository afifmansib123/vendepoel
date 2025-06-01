// src/app/(nondashboard)/seller-marketplace/SellerListings.tsx
"use client";

import React from "react";
import { SellerProperty, SellerMarketplaceFilters } from "@/types/sellerMarketplaceTypes";
import SellerPropertyCard from "@/components/SellerPropertyCard";

interface SellerListingsProps {
  allProperties: SellerProperty[];
  filters: SellerMarketplaceFilters;
  isLoading: boolean;
}

const SellerListings: React.FC<SellerListingsProps> = ({ allProperties, filters, isLoading }) => {

  const filteredProperties = React.useMemo(() => {
    if (isLoading || !allProperties) return [];
    return allProperties.filter(property => {
      if (filters.propertyType && property.propertyType !== filters.propertyType) {
        return false;
      }
      if (filters.beds) {
          const minBeds = parseInt(filters.beds, 10);
          if (property.beds < minBeds) return false;
      }
      if (filters.salePriceRange) {
          const [minPrice, maxPrice] = filters.salePriceRange;
          if (minPrice !== null && property.salePrice < minPrice) return false;
          if (maxPrice !== null && property.salePrice > maxPrice) return false;
      }
      // Client-side text search (simple)
      if (filters.location && filters.location.trim() !== "") {
        const searchTerm = filters.location.toLowerCase();
        const inName = property.name.toLowerCase().includes(searchTerm);
        const inAddress = property.location.address.toLowerCase().includes(searchTerm);
        const inCity = property.location.city.toLowerCase().includes(searchTerm);
        const inState = property.location.state.toLowerCase().includes(searchTerm);
        if (!inName && !inAddress && !inCity && !inState) {
            return false;
        }
      }
      return true;
    });
  }, [allProperties, filters, isLoading]);

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

  if (filteredProperties.length === 0) {
    return <div className="p-6 text-center text-gray-500">No properties match your current filters. Try adjusting your search.</div>;
  }

  return (
    <div className="w-full h-full">
      <h3 className="text-base px-4 py-3 font-semibold sticky top-0 bg-gray-50 z-10 border-b border-gray-200 text-gray-700">
        {filteredProperties.length} Proper K{filteredProperties.length === 1 ? "y" : "ies"} Found
        {filters.location && <span className="font-normal text-gray-600"> near "{filters.location}"</span>}
      </h3>
      <div className="p-3 md:p-4 space-y-4">
        {filteredProperties.map((property) => (
          <SellerPropertyCard
            key={property._id}
            property={property}
            propertyLinkBase="/seller-marketplace"
          />
        ))}
      </div>
    </div>
  );
};

export default SellerListings;