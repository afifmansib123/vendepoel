"use client";

import SettingsForm from "@/components/SettingsForm"; // Assuming this form is generic
import {
  useGetAuthUserQuery,
  useUpdateLandlordSettingsMutation, // CHANGED: Import landlord-specific mutation
} from "@/state/api";
import React from "react";

// Renamed component from ManagerSettings to LandlordSettings
const LandlordSettings = () => {
  const { data: authUser, isLoading, isError } = useGetAuthUserQuery(); // Added isError for robustness
  
  // CHANGED: Use the mutation hook for landlord settings
  const [updateLandlord, { isLoading: isUpdating }] = useUpdateLandlordSettingsMutation(); // Added isUpdating for button state

  if (isLoading) return <>Loading...</>;

  // It's good practice to handle the case where authUser might not be loaded or there was an error
  if (isError || !authUser || !authUser.userInfo || !authUser.cognitoInfo) {
    // You might want a more user-friendly error display here
    console.error("Error fetching user data or user data is incomplete.");
    return <>Error loading user data. Please try refreshing.</>; 
  }

  // Initial data derived from authUser, structure kept same as original
  // Fallbacks added to prevent errors if fields are unexpectedly undefined
  const initialData = {
    name: authUser.userInfo.name || "",
    email: authUser.userInfo.email || "",
    phoneNumber: authUser.userInfo.phoneNumber || "",
  };

  const handleSubmit = async (data: typeof initialData) => {
    // It's important to ensure authUser.cognitoInfo.userId exists before making the call
    if (!authUser.cognitoInfo.userId) {
      console.error("Cannot update settings: User Cognito ID is missing.");
      // alert("An error occurred. User ID is missing."); // Or use a toast
      return; 
    }

    try {
      // CHANGED: Call the updateLandlord mutation
      await updateLandlord({
        cognitoId: authUser.cognitoInfo.userId, // No optional chaining, as we checked authUser.cognitoInfo above
        ...data,
      }).unwrap(); // .unwrap() is good for RTK Query to handle promise rejection for errors

      // Optional: Add success feedback (e.g., toast notification or alert)
      // alert("Settings updated successfully!"); 
      // console.log("Settings updated successfully");

    } catch (error) {
      console.error("Failed to update landlord settings:", error);
      // Optional: Add error feedback to the user
      // alert("Failed to update settings. Please try again.");
    }
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      userType="landlord" // CHANGED: userType prop to "landlord"
      // Optionally, pass isSubmitting state to SettingsForm if it supports it
      // isSubmitting={isUpdating} 
    />
  );
};

// CHANGED: Export name
export default LandlordSettings;