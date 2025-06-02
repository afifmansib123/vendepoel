// src/app/(nondashboard)/seller-marketplace/SellerFiltersBar.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Not used after removing search button, can be removed if no other use
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SellerMarketplaceFilters } from "@/types/sellerMarketplaceTypes"; // Adjust path if necessary

// Define location data structures locally or import if shared
interface Province {
  name: string;
  cities: string[];
}

interface Country {
  name: string;
  code: string;
  provinces: Province[];
}

const SellerPropertyTypeOptions: Record<string, string> = {
  any: "Any Type",
  "Condominium / Apartment": "Condo/Apartment",
  "House / Villa": "House/Villa",
  Townhouse: "Townhouse",
  Land: "Land",
  "Commercial Property (Shop/Office/Warehouse)": "Commercial",
  // Add more based on your PROPERTY_TYPES_OPTIONS from the form page
  Other: "Other",
};

const BedOptions: Record<string, string> = {
  any: "Any Beds",
  "1": "1+ Bed",
  "2": "2+ Beds",
  "3": "3+ Beds",
  "4": "4+ Beds",
  "5": "5+ Beds", // Added for more options
};

interface SellerFiltersBarProps {
  onFiltersChange: (filters: SellerMarketplaceFilters) => void;
  initialFilters: SellerMarketplaceFilters;
}

const SellerFiltersBar: React.FC<SellerFiltersBarProps> = ({ onFiltersChange, initialFilters }) => {
  // Location state
  const [allCountriesData, setAllCountriesData] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>(initialFilters.country || "");
  const [currentProvinces, setCurrentProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>(initialFilters.state || "");
  const [currentCities, setCurrentCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(initialFilters.city || "");

  // Other filter states
  const [minPriceInput, setMinPriceInput] = useState<string>(initialFilters.salePriceRange?.[0]?.toString() || "");
  const [maxPriceInput, setMaxPriceInput] = useState<string>(initialFilters.salePriceRange?.[1]?.toString() || "");
  const [propertyTypeSelect, setPropertyTypeSelect] = useState(initialFilters.propertyType || "any");
  const [bedsSelect, setBedsSelect] = useState(initialFilters.beds || "any");

  // Fetch location data on component mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/locations.json');
        if (!response.ok) {
          console.error('Failed to fetch location data. Status:', response.status);
          throw new Error('Failed to fetch location data');
        }
        const data: Country[] = await response.json();
        setAllCountriesData(data);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocations();
  }, []);

  // Sync local state with initialFilters when they change or location data loads
  useEffect(() => {
    setMinPriceInput(initialFilters.salePriceRange?.[0]?.toString() || "");
    setMaxPriceInput(initialFilters.salePriceRange?.[1]?.toString() || "");
    setPropertyTypeSelect(initialFilters.propertyType || "any");
    setBedsSelect(initialFilters.beds || "any");

    const initialCountryName = initialFilters.country || "";
    setSelectedCountry(initialCountryName);

    if (allCountriesData.length > 0) { // Ensure country data is loaded
      if (initialCountryName) {
        const countryData = allCountriesData.find(c => c.name === initialCountryName);
        if (countryData) {
          setCurrentProvinces(countryData.provinces);
          const initialProvinceName = initialFilters.state || "";
          setSelectedProvince(initialProvinceName);

          if (initialProvinceName) {
            const provinceData = countryData.provinces.find(p => p.name === initialProvinceName);
            if (provinceData) {
              setCurrentCities(provinceData.cities);
              setSelectedCity(initialFilters.city || "");
            } else {
              setCurrentCities([]);
              setSelectedCity("");
            }
          } else { // No initial province, clear city
            setCurrentCities([]);
            setSelectedCity("");
          }
        } else { // Initial country not found in data, clear dependent
          setCurrentProvinces([]);
          setSelectedProvince("");
          setCurrentCities([]);
          setSelectedCity("");
        }
      } else { // No initial country, clear all dependent
        setCurrentProvinces([]);
        setSelectedProvince("");
        setCurrentCities([]);
        setSelectedCity("");
      }
    }
  }, [initialFilters, allCountriesData]); // Rerun if initialFilters or allCountriesData change

  // Effect for when 'selectedCountry' changes
  useEffect(() => {
    if (selectedCountry && allCountriesData.length > 0) {
      const countryData = allCountriesData.find(c => c.name === selectedCountry);
      setCurrentProvinces(countryData ? countryData.provinces : []);
    } else {
      setCurrentProvinces([]);
    }
    // Reset dependent selections when country changes if not from initial load
    if (selectedProvince || selectedCity) { // Avoid resetting if initial load is setting them
      setSelectedProvince("");
      setCurrentCities([]);
      setSelectedCity("");
    }
  }, [selectedCountry, allCountriesData]);

  // Effect for when 'selectedProvince' changes
  useEffect(() => {
    if (selectedProvince && selectedCountry && allCountriesData.length > 0) {
      const countryData = allCountriesData.find(c => c.name === selectedCountry);
      if (countryData) {
        const provinceData = countryData.provinces.find(p => p.name === selectedProvince);
        setCurrentCities(provinceData ? provinceData.cities : []);
      } else {
        setCurrentCities([]);
      }
    } else {
      setCurrentCities([]);
    }
    if (selectedCity) { // Avoid resetting if initial load is setting it
       setSelectedCity("");
    }
  }, [selectedProvince, selectedCountry, allCountriesData]);

  // Debounced filter change trigger
  const triggerFilterChange = useCallback(
    debounce((filtersToApply: SellerMarketplaceFilters) => {
      onFiltersChange(filtersToApply);
    }, 700),
    [onFiltersChange] // onFiltersChange should be stable
  );

  // Effect to call triggerFilterChange when any filter state changes
  useEffect(() => {
    const currentPriceRange: [number | null, number | null] = [
      minPriceInput === "" ? null : Number(minPriceInput),
      maxPriceInput === "" ? null : Number(maxPriceInput),
    ];

    const filtersToApply: SellerMarketplaceFilters = {
      country: selectedCountry || null,
      state: selectedProvince || null,
      city: selectedCity || null,
      salePriceRange: currentPriceRange,
      propertyType: propertyTypeSelect === "any" ? null : propertyTypeSelect,
      beds: bedsSelect === "any" ? null : bedsSelect,
    };
    triggerFilterChange(filtersToApply);
  }, [
    selectedCountry,
    selectedProvince,
    selectedCity,
    minPriceInput,
    maxPriceInput,
    propertyTypeSelect,
    bedsSelect,
    triggerFilterChange,
  ]);

  const handleSelectChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, anyValue: string) => {
    setter(value === anyValue ? "" : value);
  };

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-start items-center w-full py-3 px-2 md:px-4 bg-white border-b border-gray-200 gap-2 md:gap-3 sticky top-0 z-20 shadow-sm">
      {/* Country Select */}
      <Select
        value={selectedCountry || "any-country"}
        onValueChange={(value) => handleSelectChange(setSelectedCountry, value, "any-country")}
      >
        <SelectTrigger className="w-full sm:w-auto min-w-[130px] md:min-w-[150px] rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any-country">Any Country</SelectItem>
          {allCountriesData.map((country) => (
            <SelectItem key={country.code} value={country.name}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* State/Province Select */}
      <Select
        value={selectedProvince || "any-province"}
        onValueChange={(value) => handleSelectChange(setSelectedProvince, value, "any-province")}
        disabled={!selectedCountry || currentProvinces.length === 0}
      >
        <SelectTrigger className="w-full sm:w-auto min-w-[130px] md:min-w-[160px] rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
          <SelectValue placeholder="State/Province" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any-province">Any State/Province</SelectItem>
          {currentProvinces.map((province) => (
            <SelectItem key={province.name} value={province.name}>
              {province.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* City Select */}
      <Select
        value={selectedCity || "any-city"}
        onValueChange={(value) => handleSelectChange(setSelectedCity, value, "any-city")}
        disabled={!selectedProvince || currentCities.length === 0}
      >
        <SelectTrigger className="w-full sm:w-auto min-w-[130px] md:min-w-[160px] rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any-city">Any City</SelectItem>
          {currentCities.map((cityName) => (
            <SelectItem key={cityName} value={cityName}>
              {cityName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Price Range Inputs */}
      <div className="flex items-center gap-1 w-full sm:w-auto">
        <Input
          type="number"
          placeholder="Min Price"
          value={minPriceInput}
          onChange={(e) => setMinPriceInput(e.target.value)}
          min="0"
          className="w-1/2 sm:w-24 md:w-28 rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500"
          aria-label="Minimum price"
        />
        <span className="text-gray-400 px-1">-</span>
        <Input
          type="number"
          placeholder="Max Price"
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
          min="0"
          className="w-1/2 sm:w-24 md:w-28 rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500"
          aria-label="Maximum price"
        />
      </div>

      {/* Property Type */}
      <Select
        value={propertyTypeSelect}
        onValueChange={(value) => setPropertyTypeSelect(value)}
      >
        <SelectTrigger className="w-full sm:w-auto min-w-[130px] md:min-w-[140px] rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
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
          <SelectTrigger className="w-full sm:w-auto min-w-[110px] md:min-w-[120px] rounded-lg border-gray-300 h-10 text-sm focus:ring-primary-500 focus:border-primary-500">
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