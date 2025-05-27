"use client";

import Card from "@/components/Card"; // Assuming Card component is generic
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { 
    useGetAuthUserQuery, 
    useGetLandlordPropertiesQuery // CHANGED: Import landlord-specific query hook
} from "@/state/api";
import React from "react";

// Renamed component for clarity (optional, can keep as Properties if route defines context)
const LandlordProperties = () => {
  const { data: authUser } = useGetAuthUserQuery(); 
  
  // CHANGED: Use the query hook for landlord properties
  const {
    data: landlordProperties, // CHANGED: Variable name
    isLoading,
    isError, // CHANGED: It's good practice to use isError for more robust error handling
    // error, // 'error' object can be used for more detailed error info if needed
  } = useGetLandlordPropertiesQuery(authUser?.cognitoInfo?.userId || "", {
    skip: !authUser?.cognitoInfo?.userId, // Skip query if userId is not available
  });

  if (isLoading) return <Loading />;
  
  // CHANGED: Updated error message and check
  if (isError) return <div>Error loading your properties. Please try again.</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="My Properties"
        subtitle="View and manage your property listings as a landlord" // Subtitle slightly updated
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* CHANGED: Iterate over landlordProperties */}
        {landlordProperties?.map((property) => (
          <Card
            key={property.id}
            property={property}
            // These props are kept as original, assuming they are still relevant
            // or that the Card component handles different user contexts if needed.
            isFavorite={false} 
            onFavoriteToggle={() => {}} // Placeholder, implement if landlords can favorite
            showFavoriteButton={false}    // Assuming landlords don't favorite their own properties in this view
            // CHANGED: Updated propertyLink for landlord route
            propertyLink={`/landlords/properties/${property.id}`} 
          />
        ))}
      </div>
      {/* CHANGED: Updated message for no properties */}
      {(!landlordProperties || landlordProperties.length === 0) && (
        <p className="text-center text-gray-500 mt-8">You haven‘t listed any properties yet.</p>
      )}
    </div>
  );
};

// CHANGED: Export name
export default LandlordProperties;