"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  useGetLandlordPropertiesQuery,
} from "@/state/api";
import React from "react";

const LandlordProperties = () => {
  const {
    data: landlordProperties,
    isLoading,
    isError,
  } = useGetLandlordPropertiesQuery(); // ✅ No param needed

  if (isLoading) return <Loading />;
  if (isError)
    return <div className="text-red-500 text-center mt-4">Error loading your properties. Please try again.</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="My Properties"
        subtitle="View and manage your property listings as a landlord"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {landlordProperties?.map((property) => (
          <Card
            key={property.id}
            property={property}
            isFavorite={false}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/landlords/properties/${property.id}`}
          />
        ))}
      </div>

      {(!landlordProperties || landlordProperties.length === 0) && (
        <p className="text-center text-gray-500 mt-8">
          You haven’t listed any properties yet.
        </p>
      )}
    </div>
  );
};

export default LandlordProperties;
