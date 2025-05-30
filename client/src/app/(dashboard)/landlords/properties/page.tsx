"use client";

// Remove the old Card import if it's no longer needed elsewhere or rename it
// import Card from "@/components/Card"; 
import PropertyCard, { Property } from "@/components/properyCard"; // Import the new card and Property type
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetLandlordPropertiesQuery } from "@/state/api";
import React from "react";
import { PlusCircle } from "lucide-react"; // For a potential "Add Property" button

const LandlordProperties = () => {
  const {
    data: landlordProperties, // Type assertion for better intellisense
    isLoading,
    isError,
  } = useGetLandlordPropertiesQuery() as { data: Property[] | undefined, isLoading: boolean, isError: boolean };

  if (isLoading) return <Loading />;
  if (isError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Error Loading Properties
          </h2>
          <p className="text-gray-700">
            We encountered an issue while trying to fetch your properties.
            Please check your connection and try again later.
          </p>
        </div>
      </div>
    );

  return (
    <div className="dashboard-container bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8"> {/* Added bg and padding */}
      <Header
        title="My Properties"
        subtitle="View and manage your property listings as a landlord"
      />

      {/* Optional: Add a button to create new properties */}
      <div className="mb-6 text-right">
        <button
          onClick={() => { /* Logic to navigate to add property page */ alert("Navigate to Add Property Page"); }}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusCircle size={20} className="mr-2" />
          List New Property
        </button>
      </div>

      {landlordProperties && landlordProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"> {/* Adjusted xl breakpoint */}
          {landlordProperties.map((property) => (
            <PropertyCard
              key={property.id || property._id} // Use unique key
              property={property}
              propertyLink={`/landlords/properties/${property.id}`}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Properties Yet
          </h3>
          <p className="text-gray-500 mb-6">
            You haven’t listed any properties. Get started by adding your first one!
          </p>
          {/* You can reuse the button style from above or simplify */}
          <button
            onClick={() => { /* Logic to navigate to add property page */ alert("Navigate to Add Property Page"); }}
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <PlusCircle size={20} className="mr-2" />
            List Your First Property
          </button>
        </div>
      )}
    </div>
  );
};

export default LandlordProperties;