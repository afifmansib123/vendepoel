// src/app/(nondashboard)/seller-marketplace/[id]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SellerProperty } from '@/types/sellerMarketplaceTypes'; // Ensure this path is correct

// These are the sub-components for the details page
import PropertyImageGallery from './PropertyImageGallery';
import PropertyDetailsSection from './PropertyDetailsSection';
import ContactSellerWidget from './ContactSellerWidget';

import { ArrowLeft, Loader2, AlertTriangle, MapPin } from 'lucide-react';
import Link from 'next/link';

// Fallback Button component if not using a UI library like shadcn/ui
const ButtonFallback = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, asChild?: boolean, className?: string}) => (
    <button {...props} className={`inline-flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${props.variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'} ${props.className || ''}`}>
      {children}
    </button>
);


const NAVBAR_HEIGHT = 64; // Example: Adjust to your actual navbar height

const SingleSellerPropertyPage = () => {
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.id as string; // Get the property ID from the URL

  const [property, setProperty] = useState<SellerProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for seller's public contact info (placeholder - fetch this properly)
  const [sellerInfo, setSellerInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setError("Property ID is missing from URL.");
      setIsLoading(false);
      return;
    }

    const fetchPropertyDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/seller-properties/${propertyId}`); // API call for single property
        if (!response.ok) {
          if (response.status === 404) throw new Error("Property not found. It may have been sold or removed.");
          throw new Error(`Failed to fetch property details: ${response.statusText} (Status: ${response.status})`);
        }
        const data: SellerProperty = await response.json();
        setProperty(data);

        // --- Placeholder: Fetch or determine seller's public contact info ---
        // In a real application, you might:
        // 1. Have the `/api/seller-properties/[id]` endpoint include public seller contact.
        // 2. Make another API call here using `data.sellerCognitoId` to get public profile.
        if (data.sellerCognitoId) {
            // Simulate fetching seller details (replace with actual API call if you have one)
            await new Promise(resolve => setTimeout(resolve, 100)); // mock delay
            setSellerInfo({
                name: `Real Estate Agent ${data.sellerCognitoId.substring(data.sellerCognitoId.length - 4)}`, // Example
                email: `agent_${data.sellerCognitoId.substring(data.sellerCognitoId.length - 4)}@example.realty` // Example
            });
        }
        // --- End Placeholder ---

      } catch (e: any) {
        console.error("Error fetching property details for ID:", propertyId, e);
        setError(e.message || "An unknown error occurred while loading the property.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [propertyId]); // Re-fetch if propertyId changes

  // Helper to format enum-like strings (if not using a global utility)
  const formatEnumStringLocal = (str: string | undefined | null): string => {
      if (!str) return 'N/A';
      // Simple formatter: add spaces before capitals, capitalize first letter of each word
      return str
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .replace(/_/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' ');
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50" style={{ paddingTop: NAVBAR_HEIGHT }}>
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <p className="mt-4 text-lg text-gray-600">Loading Property Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-700 px-4" style={{ paddingTop: NAVBAR_HEIGHT }}>
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-xl font-semibold text-center">Oops! Something went wrong.</p>
        <p className="text-center mb-6">{error}</p>
        <ButtonFallback variant="outline" onClick={() => router.push('/seller-marketplace')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
        </ButtonFallback>
      </div>
    );
  }

  if (!property) {
    // This case should ideally be handled by the error state if API returns 404 properly
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700 px-4" style={{ paddingTop: NAVBAR_HEIGHT }}>
        <AlertTriangle className="h-12 w-12 mb-4 text-orange-500" />
        <p className="text-xl font-semibold text-center">Property Not Found</p>
        <p className="text-center mb-6">The property you are looking for does not exist or is no longer available.</p>
         <ButtonFallback variant="outline" onClick={() => router.push('/seller-marketplace')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
        </ButtonFallback>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen" style={{ paddingTop: `${NAVBAR_HEIGHT + 16}px`}}> {/* Added more top padding */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl pb-16"> {/* Added bottom padding */}
        {/* Back Button and Breadcrumbs (Optional) */}
        <div className="mb-6 md:mb-8">
            <Link href="/seller-marketplace" legacyBehavior>
                <a className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 transition-colors group font-medium">
                    <ArrowLeft size={16} className="mr-1.5 group-hover:-translate-x-0.5 transition-transform"/>
                    Back to Marketplace
                </a>
            </Link>
            {/* Optional Breadcrumbs:
            <nav className="text-xs text-gray-500 mt-1">
                <span>Marketplace</span> / <span>{property.location.state}</span> / <span>{property.location.city}</span> / <span className="font-medium text-gray-700">{property.name}</span>
            </nav>
            */}
        </div>

        {/* Main property content */}
        <PropertyImageGallery images={property.photoUrls || []} propertyName={property.name} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Main Content Column (Property Info) */}
          <div className="lg:col-span-8">
            {/* Header Section */}
            <header className="pb-6 border-b border-gray-200 mb-6">
                {/* Property Type / Status Badges */}
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">
                        {formatEnumStringLocal(property.propertyType)}
                    </span>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${property.propertyStatus?.toLowerCase().includes('sale') ? 'text-green-700 bg-green-100' : 'text-yellow-700 bg-yellow-100'}`}>
                        {formatEnumStringLocal(property.propertyStatus)}
                    </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{property.name}</h1>

                <div className="mt-2 flex items-center text-gray-600 text-sm">
                    <MapPin size={16} className="mr-1.5 text-gray-400 flex-shrink-0"/>
                    <span>{property.location.address}, {property.location.city}, {property.location.state} {property.location.postalCode}</span>
                </div>
                 <p className="mt-4 text-4xl font-extrabold text-primary-600 tracking-tight">
                    ${property.salePrice.toLocaleString()}
                 </p>
            </header>

            {/* Details, Amenities, Map Sections */}
            <PropertyDetailsSection property={property} />

          </div>

          {/* Sidebar / Contact Widget Column */}
          <div className="lg:col-span-4">
            <ContactSellerWidget
              sellerName={sellerInfo?.name} // From placeholder state
              sellerEmail={sellerInfo?.email} // From placeholder state
              propertyName={property.name}
              propertyId={property.id}
              allowBuyerApplications={property.allowBuyerApplications}
            />
          </div>
        </div>

        {/* Footer Information */}
        <footer className="pt-12 mt-12 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Property ID: {property.id} • Listed on: {new Date(property.postedDate).toLocaleDateString()}</p>
            <p className="mt-1">Listing data is subject to change. Please verify all information.</p>
        </footer>
      </div>
    </div>
  );
};

export default SingleSellerPropertyPage;