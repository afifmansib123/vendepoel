import {
  useAddFavoritePropertyMutation,
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
  useGetBuyerQuery,
  useRemoveFavoritePropertyMutation,
} from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { Property } from "@/types/prismaTypes";
// Assuming Tenant and Buyer types are compatible with UserProfileWithFavorites
// and are correctly returned by their respective hooks.
// These types should have an `id` (database ID) and `favorites` array.
import Card from "@/components/Card";
import React from "react";
import CardCompact from "@/components/CardCompact";

// Common interface for user profiles (Tenant or Buyer) that include favorites
interface UserProfileWithFavorites {
  id: string | number; // Database ID of the tenant or buyer
  cognitoId: string;
  favorites?: Property[];
}

const Listings = () => {
  // 1. Get authenticated user data and its loading state
  const { data: authUser, isLoading: isLoadingAuthUser } = useGetAuthUserQuery();

  // 2. Derive cognitoId and userRole from authUser
  const cognitoId = authUser?.cognitoInfo?.userId;
  // Explicitly type userRole for clarity in logic.
  // Assumes authUser.userRole is one of these specific strings or undefined.
  const userRole = authUser?.userRole as "tenant" | "buyer" | "manager" | "landlord" | undefined;

  // Optional: Log authUser and derived role for debugging
  React.useEffect(() => {
    if (!isLoadingAuthUser) {
      // console.log("Listings Page - AuthUser loaded:", authUser);
      // console.log("Listings Page - Derived userRole:", userRole);
    }
  }, [authUser, isLoadingAuthUser, userRole]);


  // 3. Fetch tenant-specific data if the user is a tenant
  const {
    data: tenantData,
    isLoading: isLoadingTenantProfile,
    // refetch: refetchTenantProfile, // See note in handleFavoriteToggle
  } = useGetTenantQuery(cognitoId!, { // cognitoId! is safe here due to the skip condition
    skip: !cognitoId || userRole !== "tenant",
  });

  // 4. Fetch buyer-specific data if the user is a buyer
  const {
    data: buyerData,
    isLoading: isLoadingBuyerProfile,
    // refetch: refetchBuyerProfile, // See note in handleFavoriteToggle
  } = useGetBuyerQuery(cognitoId!, { // cognitoId! is safe here due to the skip condition
    skip: !cognitoId || userRole !== "buyer",
  });

  // 5. Consolidate tenant or buyer data into a single currentUserProfile object
  // This profile is used to check if a property is already a favorite.
  const currentUserProfile: UserProfileWithFavorites | undefined = React.useMemo(() => {
    if (userRole === "tenant" && tenantData) {
      // Ensure Tenant type from useGetTenantQuery matches UserProfileWithFavorites
      return tenantData as UserProfileWithFavorites;
    }
    if (userRole === "buyer" && buyerData) {
      // Ensure Buyer type from useGetBuyerQuery matches UserProfileWithFavorites
      return buyerData as UserProfileWithFavorites;
    }
    return undefined;
  }, [userRole, tenantData, buyerData]);

  // 6. Get mutation hooks for adding/removing favorites
  const [addFavoriteMutation] = useAddFavoritePropertyMutation();
  const [removeFavoriteMutation] = useRemoveFavoritePropertyMutation();

  // Global state for view mode and filters
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  // Fetch properties based on filters
  const {
    data: properties,
    isLoading: isLoadingProperties,
    isError: isErrorProperties,
  } = useGetPropertiesQuery(filters);

  // 7. Handler for toggling a property's favorite status
  const handleFavoriteToggle = async (propertyId: number) => {
    // Early exit if user is not an authenticated tenant or buyer
    if (!authUser || !cognitoId || (userRole !== "tenant" && userRole !== "buyer")) {
      console.warn(
        "User must be an authenticated tenant or buyer to toggle favorites. Current role:",
        userRole
      );
      return;
    }

    // At this point, userRole is confirmed to be "tenant" or "buyer"
    const currentRoleForMutation = userRole as "tenant" | "buyer";

    const isFavorite = currentUserProfile?.favorites?.some(
      (fav: Property) => fav.id === propertyId
    );

    try {
      if (isFavorite) {
        await removeFavoriteMutation({
          cognitoId: cognitoId,
          propertyId,
          userRole: currentRoleForMutation, // Pass the determined role
        }).unwrap();
      } else {
        await addFavoriteMutation({
          cognitoId: cognitoId,
          propertyId,
          userRole: currentRoleForMutation, // Pass the determined role
        }).unwrap();
      }

      // Manual refetching (refetchTenantProfile / refetchBuyerProfile):
      // These should no longer be necessary if your `invalidatesTags` in
      // `addFavoritePropertyMutation` and `removeFavoritePropertyMutation`
      // (in api.ts) are correctly configured to invalidate the specific
      // tenant's or buyer's data cache (e.g., using tags like [{ type: "Tenants", id: userId }]).
      // Test thoroughly. If the favorite status doesn't update automatically,
      // you might need to re-enable these or ensure your tagging is correct.
      /*
      if (userRole === "tenant") {
        refetchTenantProfile();
      } else if (userRole === "buyer") {
        refetchBuyerProfile();
      }
      */

    } catch (error) {
      // Error handling is likely managed by `withToast` in the API slice
      console.error("Failed to toggle favorite status in Listings component:", error);
    }
  };

  // 8. Loading and error states for the page
  // Wait for authUser to load (to determine role) and properties to load.
  // Also consider loading states of individual tenant/buyer profiles if they impact initial UI.
  if (isLoadingAuthUser || isLoadingProperties) {
    return <>Loading...</>;
  }
  if (isErrorProperties || !properties) {
    return <div>Failed to fetch properties</div>;
  }

  // Determine if the favorite button should be shown
  const canShowFavoriteButton = !!authUser && (userRole === "tenant" || userRole === "buyer");

  return (
    <div className="w-full">
      <h3 className="text-sm px-4 font-bold">
        {properties.length}{" "}
        <span className="text-gray-700 font-normal">
          Places in {filters.location || "selected area"}
        </span>
      </h3>
      <div className="flex">
        <div className="p-4 w-full">
          {properties?.map((property) =>
            viewMode === "grid" ? (
              <Card
                key={property.id}
                property={property}
                isFavorite={
                  currentUserProfile?.favorites?.some(
                    (fav: Property) => fav.id === property.id
                  ) || false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={canShowFavoriteButton} // Updated logic
                propertyLink={`/search/${property.id}`}
              />
            ) : (
              <CardCompact
                key={property.id}
                property={property}
                isFavorite={
                  currentUserProfile?.favorites?.some(
                    (fav: Property) => fav.id === property.id
                  ) || false
                }
                onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                showFavoriteButton={canShowFavoriteButton} // Updated logic
                propertyLink={`/search/${property.id}`}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Listings;