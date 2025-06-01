// src/components/SellerPropertyCard.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SellerProperty } from "@/types/sellerMarketplaceTypes"; // Adjusted import
import { MapPin, BedDouble, Bath, LandPlot, Building } from "lucide-react";
import { formatEnumString } from "@/lib/utils"; // Assuming you have this utility

interface SellerPropertyCardProps {
  property: SellerProperty;
  propertyLinkBase?: string; // e.g., "/seller-marketplace"
}

const SellerPropertyCard: React.FC<SellerPropertyCardProps> = ({
  property,
  propertyLinkBase = "/seller-marketplace",
}) => {
  const link = `${propertyLinkBase}/${property.id}`;
  const displayImage = property.photoUrls?.[0] || "/placeholder-property.jpg";

  return (
    <Link href={link} legacyBehavior>
      <a className="block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden mb-4 border border-gray-200">
        <div className="relative h-60 w-full">
          <Image
            src={displayImage}
            alt={property.name}
            layout="fill"
            objectFit="cover"
            className="rounded-t-xl"
          />
           <div className="absolute top-3 right-3 bg-primary-700 text-white text-xs px-2 py-1 rounded-md shadow">
            FOR SALE
          </div>
           <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <h3 className="text-xl font-semibold text-white truncate" title={property.name}>
              {property.name}
            </h3>
          </div>
        </div>
        <div className="p-5">
          <p className="text-2xl font-bold text-primary-700 mb-3">
            ${property.salePrice.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mb-3 flex items-center">

            <span className="truncate" title={`${property.location?.address}, ${property.location?.city}`}>
              {property.location?.address || "Address not available"}, {property.location?.city}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-sm text-gray-700 mb-4">
            <span className="flex items-center col-span-1">
              <BedDouble size={16} className="mr-1.5 text-primary-500" /> {property.beds} Beds
            </span>
            <span className="flex items-center col-span-1">
              <Bath size={16} className="mr-1.5 text-primary-500" /> {property.baths} Baths
            </span>
            <span className="flex items-center col-span-1">
              <LandPlot size={16} className="mr-1.5 text-primary-500" /> {property.squareFeet.toLocaleString()} sqft
            </span>
          </div>
           <div className="border-t pt-3 mt-3 flex justify-between items-center text-xs text-gray-500">
            <span className="flex items-center">
              <Building size={14} className="mr-1.5"/>
              {formatEnumString(property.propertyType)}
            </span>
            <span>Status: {formatEnumString(property.propertyStatus)}</span>
          </div>
        </div>
      </a>
    </Link>
  );
};

export default SellerPropertyCard;