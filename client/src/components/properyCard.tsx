// components/PropertyCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  Bath,
  MapPin,
  Maximize,
  CalendarDays,
  Tag,
  Building,
} from "lucide-react"; // Or your preferred icon library

// Define a type for your property object based on the provided JSON
// This makes props handling much safer and easier
interface Location {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: null | { lat: number; lng: number }; // Assuming coordinates could be null
}

export interface Property {
  _id: string;
  id: number;
  name: string;
  description: string;
  salePrice: number;
  propertyType: string;
  propertyStatus: string;
  beds: number;
  baths: number;
  squareFeet: number;
  yearBuilt: number;
  HOAFees: number;
  photoUrls: string[];
  amenities: string[];
  highlights: string[];
  openHouseDates: string[];
  sellerNotes: string;
  allowBuyerApplications: boolean;
  preferredFinancingInfo: string;
  insuranceRecommendation: string;
  locationId: number;
  sellerCognitoId: string;
  buyerInquiries: any[]; // Define more strictly if needed
  postedDate: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  location: Location;
}

interface PropertyCardProps {
  property: Property;
  propertyLink: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  propertyLink,
}) => {
  const {
    name,
    salePrice,
    propertyType,
    propertyStatus,
    beds,
    baths,
    squareFeet,
    photoUrls,
    location,
    postedDate,
  } = property;

  const displayImage =
    photoUrls && photoUrls.length > 0
      ? photoUrls[0]
      : "https://via.placeholder.com/400x300.png?text=No+Image"; // Placeholder image

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB", // Change as needed
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(salePrice);

  const formattedDate = new Date(postedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={propertyLink} legacyBehavior>
      <a className="block bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
        <div className="relative h-48 w-full">
          <Image
            src={displayImage}
            alt={name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          {propertyStatus && (
            <span
              className={`absolute top-2 right-2 px-3 py-1 text-xs font-semibold text-white rounded-full ${
                propertyStatus === "For Sale"
                  ? "bg-blue-500"
                  : propertyStatus === "For Rent"
                  ? "bg-black"
                  : "bg-gray-500"
              }`}
            >
              {propertyStatus}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 truncate mb-1">
            {name}
          </h3>
          <p className="text-2xl font-bold text-gray-800 mb-2">
            {formattedPrice}
          </p>

          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPin size={16} className="mr-2 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              {location.address}, {location.city}, {location.state}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm text-gray-700 mb-3">
            <div className="flex items-center">
              <BedDouble size={16} className="mr-1 text-black" /> {beds}{" "}
              <span className="ml-1 hidden sm:inline">Beds</span>
            </div>
            <div className="flex items-center">
              <Bath size={16} className="mr-1 text-black" /> {baths}{" "}
              <span className="ml-1 hidden sm:inline">Baths</span>
            </div>
            <div className="flex items-center">
              <Maximize size={16} className="mr-1 text-black" />{" "}
              {squareFeet}
              <span className="ml-1 hidden sm:inline">sqft</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {propertyType && (
              <span className="flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                <Building size={12} className="mr-1" /> {propertyType}
              </span>
            )}
          </div>

          <div className="border-t pt-3 mt-3 flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center">
              <CalendarDays size={14} className="mr-1" />
              <span>Posted: {formattedDate}</span>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-black rounded-full font-medium group-hover:bg-gray-600 group-hover:text-white transition-colors">
              Manage
            </span>
          </div>
        </div>
      </a>
    </Link>
  );
};

export default PropertyCard;