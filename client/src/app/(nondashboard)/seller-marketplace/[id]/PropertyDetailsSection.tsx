// src/app/(nondashboard)/seller-marketplace/[id]/PropertyDetailsSection.tsx
"use client"; // Good practice for components with hooks/interactivity, though this one is mostly display

import React from 'react';
import { SellerProperty } from '@/types/sellerMarketplaceTypes';
// Assuming you have a formatEnumString utility
// If not, define it locally or use a simple version
const formatEnumStringLocal = (str: string | undefined | null): string => {
    if (!str) return 'N/A';
    return str.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/-/g, ' ').trim().split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

import { Home, DollarSign, BedDouble, Bath, Square, CalendarDays, Hammer, CheckCircle, ListChecks, Info, ShieldAlert, Building } from 'lucide-react';

interface PropertyDetailsSectionProps {
  property: SellerProperty;
}

const DetailItem: React.FC<{ icon: React.ElementType; label: string; value: string | number | null | undefined }> = ({ icon: Icon, label, value }) => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) return null;
    return (
        <div className="flex flex-col p-3 md:p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center text-gray-500 mb-1.5">
                <Icon size={18} className="mr-2.5 flex-shrink-0 text-primary-600" />
                <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className="text-gray-800 font-semibold text-sm md:text-base">
                {typeof value === 'string' && (label.toLowerCase().includes('type') || label.toLowerCase().includes('status'))
                    ? formatEnumStringLocal(value)
                    : value}
            </p>
        </div>
    );
};

const ListSection: React.FC<{ title: string; items: string[] | undefined; icon: React.ElementType }> = ({ title, items, icon: Icon }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Icon size={22} className="mr-2.5 text-primary-600"/>
                {title}
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2.5 list-none pl-0">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center text-gray-700 text-sm py-1">
                        <CheckCircle size={16} className="mr-2 text-green-500 flex-shrink-0" />
                        {formatEnumStringLocal(item)}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const PropertyDetailsSection: React.FC<PropertyDetailsSectionProps> = ({ property }) => {
  return (
    <div className="py-6 md:py-8">
      <h3 className="text-2xl font-semibold text-gray-800 mb-6">Property Overview</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        <DetailItem icon={DollarSign} label="Sale Price" value={`$${property.salePrice.toLocaleString()}`} />
        <DetailItem icon={Building} label="Property Type" value={property.propertyType} />
        <DetailItem icon={BedDouble} label="Bedrooms" value={property.beds} />
        <DetailItem icon={Bath} label="Bathrooms" value={property.baths} />
        <DetailItem icon={Square} label="Area" value={`${property.squareFeet.toLocaleString()} sqft`} />
        <DetailItem icon={CalendarDays} label="Year Built" value={property.yearBuilt || 'N/A'} />
        <DetailItem icon={DollarSign} label="HOA Fees" value={property.HOAFees ? `$${property.HOAFees.toLocaleString()}/month` : 'N/A'} />
        <DetailItem icon={Hammer} label="Status" value={property.propertyStatus} />
      </div>

      {property.description && (
        <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center"><Info size={20} className="mr-2 text-primary-600"/>Description</h4>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{property.description}</p>
        </div>
      )}

      <ListSection title="Amenities" items={property.amenities} icon={ListChecks} />
      <ListSection title="Property Highlights" items={property.highlights} icon={CheckCircle} />

      {property.openHouseDates && property.openHouseDates.length > 0 && (
        <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center"><CalendarDays size={20} className="mr-2 text-primary-600"/>Open House Dates</h4>
            <ul className="list-none pl-0 space-y-2">
                {property.openHouseDates.map((dateString, index) => {
                    // Attempt to parse date, assuming it's a valid ISO string or similar
                    let formattedDate = dateString;
                    try {
                        const dateObj = new Date(dateString);
                        if (!isNaN(dateObj.getTime())) { // Check if date is valid
                           formattedDate = dateObj.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
                        }
                    } catch (e) { console.warn("Could not parse open house date string:", dateString); }

                    return (
                        <li key={index} className="text-gray-700 text-sm bg-blue-50 p-3 rounded-md border border-blue-200 shadow-sm">
                            {formattedDate}
                        </li>
                    );
                })}
            </ul>
        </div>
      )}

      {property.sellerNotes && (
        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm">
            <h4 className="text-lg font-semibold text-indigo-800 mb-2 flex items-center"><Info size={20} className="mr-2"/>Seller's Notes</h4>
            <p className="text-indigo-700 text-sm whitespace-pre-wrap">{property.sellerNotes}</p>
        </div>
      )}
      {property.preferredFinancingInfo && (
        <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg shadow-sm">
            <h4 className="text-lg font-semibold text-teal-800 mb-2 flex items-center"><DollarSign size={20} className="mr-2"/>Preferred Financing</h4>
            <p className="text-teal-700 text-sm whitespace-pre-wrap">{property.preferredFinancingInfo}</p>
        </div>
      )}
      {property.insuranceRecommendation && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
            <h4 className="text-lg font-semibold text-orange-800 mb-2 flex items-center"><ShieldAlert size={20} className="mr-2"/>Insurance Recommendation</h4>
            <p className="text-orange-700 text-sm whitespace-pre-wrap">{property.insuranceRecommendation}</p>
        </div>
      )}
    </div>
  );
};

export default PropertyDetailsSection;