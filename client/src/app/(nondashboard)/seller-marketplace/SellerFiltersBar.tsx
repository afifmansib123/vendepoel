// src/app/(nondashboard)/seller-marketplace/SellerFiltersBar.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { debounce } from "lodash";
import { Input } from "@/components/ui/input"; // Assuming shadcn/ui
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SellerMarketplaceFilters } from "@/types/sellerMarketplaceTypes";

const SellerPropertyTypeOptions: Record<string, string> = {
  any: "Any Type",
  SingleFamily: "Single Family",
  Condo: "Condo",
  Townhouse: "Townhouse",
  MultiFamily: "Multi-Family",
  Land: "Land",
  Other: "Other",
};

const BedOptions: Record<string, string> = {
  any: "Any Beds",
  "1": "1+ Bed",
  "2": "2+ Beds",
  "3": "3+ Beds",
  "4": "4+ Beds",
};

interface SellerFiltersBarProps {
  onFiltersChange: (filters: SellerMarketplaceFilters) => void;
  initialFilters: SellerMarketplaceFilters;
}

const SellerFiltersBar: React.FC<SellerFiltersBarProps> = ({ onFiltersChange, initialFilters }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [locationInput, setLocationInput] = useState(initialFilters.location || "");
  const [minPriceInput, setMinPriceInput] = useState<string>(initialFilters.salePriceRange?.[0]?.toString() || "");
  const [maxPriceInput, setMaxPriceInput] = useState<string>(initialFilters.salePriceRange?.[1]?.toString() || "");
  const [propertyTypeSelect, setPropertyTypeSelect] = useState(initialFilters.propertyType || "any");
  const [bedsSelect, setBedsSelect] = useState(initialFilters.beds || "any");

  // Sync local state if initialFilters change (e.g. from URL on back/forward)
  useEffect(() => {
    setLocationInput(initialFilters.location || "");
    setMinPriceInput(initialFilters.salePriceRange?.[0]?.toString() || "");
    setMaxPriceInput(initialFilters.salePriceRange?.[1]?.toString() || "");
    setPropertyTypeSelect(initialFilters.propertyType || "any");
    setBedsSelect(initialFilters.beds || "any");
  }, [initialFilters]);

  const triggerFilterChange = useCallback(
    debounce(async (updatedLocalFilters: Partial<SellerMarketplaceFilters>) => {
      let newCoordinates: [number, number] | null = initialFilters.coordinates;

      // If location text changed, geocode it
      if (updatedLocalFilters.location !== undefined && updatedLocalFilters.location !== initialFilters.location) {
        if (updatedLocalFilters.location && updatedLocalFilters.location.trim() !== "") {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                updatedLocalFilters.location
              )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&fuzzyMatch=true&types=place,postcode,locality,neighborhood,address,poi`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              newCoordinates = data.features[0].center as [number, number];
            } else {
              newCoordinates = null; // No results, clear coordinates
            }
          } catch (err) {
            console.error("Error geocoding location:", err);
            newCoordinates = null; // Error, clear coordinates
          }
        } else {
            newCoordinates = null; // Empty location input, clear coordinates
        }
      }

      const finalFilters: SellerMarketplaceFilters = {
        location: updatedLocalFilters.location ?? initialFilters.location,
        coordinates: newCoordinates, // Use newly geocoded or existing if location didn't change
        salePriceRange: [
            updatedLocalFilters.salePriceRange?.[0] ?? initialFilters.salePriceRange[0],
            updatedLocalFilters.salePriceRange?.[1] ?? initialFilters.salePriceRange[1],
        ],
        propertyType: updatedLocalFilters.propertyType ?? initialFilters.propertyType,
        beds: updatedLocalFilters.beds ?? initialFilters.beds,
      };
      onFiltersChange(finalFilters);
    }, 700),
  [initialFilters.coordinates, initialFilters.location, initialFilters.salePriceRange, initialFilters.propertyType, initialFilters.beds, onFiltersChange]
);


  useEffect(() => {
    const currentPriceRange: [number | null, number | null] = [
        minPriceInput === "" ? null : Number(minPriceInput),
        maxPriceInput === "" ? null : Number(maxPriceInput),
    ];

    triggerFilterChange({
      location: locationInput,
      salePriceRange: currentPriceRange,
      propertyType: propertyTypeSelect === "any" ? null : propertyTypeSelect,
      beds: bedsSelect === "any" ? null : bedsSelect,
    });
  }, [locationInput, minPriceInput, maxPriceInput, propertyTypeSelect, bedsSelect, triggerFilterChange]);


  const handleLocationSearchClick = () => {
     // Trigger immediate geocoding and filter update
    triggerFilterChange.cancel(); // Cancel any pending debounced calls
    triggerFilterChange({ location: locationInput }); // Pass only location to re-trigger geocoding
  };
  
  const handleLocationKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLocationSearchClick();
    }
  };

  return (
    <div className="flex flex-wrap justify-start items-center w-full py-3 px-2 md:px-4 bg-white border-b border-gray-200 gap-3 sticky top-0 z-20 shadow-sm">
      {/* Search Location */}
      <div className="flex items-center">
        <Input
          placeholder="City, Address, Zip..."
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onKeyPress={handleLocationKeyPress}
          className="w-40 sm:w-48 md:w-56 rounded-l-lg rounded-r-none border-gray-300 h-10 focus:ring-primary-500 focus:border-primary-500"
        />
        <Button
          onClick={handleLocationSearchClick}
          variant="outline"
          className="rounded-r-lg rounded-l-none border-l-0 border-gray-300 h-10 px-3 hover:bg-gray-50"
          aria-label="Search location"
        >
          <Search className="w-4 h-4 text-gray-600" />
        </Button>
      </div>

      {/* Price Range Inputs */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          placeholder="Min Price"
          value={minPriceInput}
          onChange={(e) => setMinPriceInput(e.target.value)}
          min="0"
          className="w-24 md:w-28 rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500"
        />
        <span className="text-gray-400">-</span>
        <Input
          type="number"
          placeholder="Max Price"
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
          min="0"
          className="w-24 md:w-28 rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500"
        />
      </div>


      {/* Property Type */}
      <Select
        value={propertyTypeSelect}
        onValueChange={(value) => setPropertyTypeSelect(value)}
      >
        <SelectTrigger className="w-32 md:w-36 rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
          <SelectValue placeholder="Property Type" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SellerPropertyTypeOptions).map(([key, name]) => (
            <SelectItem key={key} value={key}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Beds */}
      <Select
          value={bedsSelect}
          onValueChange={(value) => setBedsSelect(value)}
        >
          <SelectTrigger className="w-28 md:w-32 rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BedOptions).map(([key, name]) => (
                <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
    </div>
  );
};

export default SellerFiltersBar;