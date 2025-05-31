import { cleanParams, createNewUserInDatabase, withToast } from "@/lib/utils";
import {
  Application,
  Lease,
  Manager,
  // Landlord, // Assuming you'll import this from prismaTypes eventually, or use the hardcoded one below
  Payment,
  Property,
  Tenant,
  // User, // Assuming you'll import this or use the hardcoded one below
} from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { FiltersState } from ".";

// --- START Hardcoded Types (as requested for now) ---
interface Landlord {
  id: string | number;
  cognitoId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface Buyer{
  id: string | number;
  cognitoId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface CognitoUserInfo { // Basic structure for Cognito user info
  userId: string;
  username: string;
  // You might have more attributes from getCurrentUser().signInDetails or .attributes
}

interface User { // The structure returned by getAuthUser
  cognitoInfo: CognitoUserInfo; // Or more specific type from Amplify like `AuthUser`
  userInfo: Tenant | Manager | Landlord | Buyer; // Using the hardcoded types for now
  userRole: string;
}
// --- END Hardcoded Types ---

export type AppTag =
  | "Managers"
  | "Tenants"
  | "Landlords"
  | "Buyers"
  | "Properties"
  | "PropertyDetails"
  | "Leases"
  | "Payments"
  | "Applications";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { idToken } = session.tokens ?? {};
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: [ // Ensure "Landlords" is actually in this array
    "Managers",
    "Tenants",
    "Landlords", // <<< --- FIX #1: Ensure "Landlords" is present
    "Buyers",
    "Properties",
    "PropertyDetails",
    "Leases",
    "Payments",
    "Applications",
  ] as AppTag[],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({ // Using the hardcoded User type
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          // Get the user object from Amplify. It has userId, username, etc.
          const amplifyUser = await getCurrentUser(); 
          const userRole = idToken?.payload["custom:role"] as string;

          let endpoint = "";
          if (userRole === "manager") {
            endpoint = `/managers/${amplifyUser.userId}`;
          } else if (userRole === "tenant") {
            endpoint = `/tenants/${amplifyUser.userId}`;
          } else if (userRole === "landlord") {
            endpoint = `/landlords/${amplifyUser.userId}`;
          }else if (userRole === "buyer") {
  endpoint = `/buyers/${amplifyUser.userId}`;
} else {
            return {
              error:
                "Unknown user role or role not supported for details fetching.",
            };
          }

          let userDetailsResponse = await fetchWithBQ(endpoint);

          if (
            userDetailsResponse.error &&
            userDetailsResponse.error.status === 404
          ) {
            userDetailsResponse = await createNewUserInDatabase(
              amplifyUser, // Pass the amplifyUser object
              idToken,
              userRole,
              fetchWithBQ
            );
          }
          
          // Construct the cognitoInfo part from the amplifyUser object
          const cognitoInfoForApp: CognitoUserInfo = {
            userId: amplifyUser.userId,
            username: amplifyUser.username,
            // Map other necessary cognito details if needed
          };

          return {
            data: {
              cognitoInfo: cognitoInfoForApp, // Use the constructed cognito info
              userInfo: userDetailsResponse.data as Tenant | Manager | Landlord, // <<< --- FIX #2: Add Landlord
              userRole,
            },
          };
        } catch (error: any) {
          return { error: error.message || "Could not fetch user data" };
        }
      },
    }),

    // ... (rest of your existing endpoints: getProperties, getProperty, tenant endpoints, manager endpoints) ...
    
    // property related endpoints (no changes needed here based on last diff)
    getProperties: build.query<
      Property[],
      Partial<FiltersState> & { favoriteIds?: number[] }
    >({
      query: (filters) => {
        const params = cleanParams({
          location: filters.location,
          priceMin: filters.priceRange?.[0],
          priceMax: filters.priceRange?.[1],
          beds: filters.beds,
          baths: filters.baths,
          propertyType: filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities: filters.amenities?.join(","),
          availableFrom: filters.availableFrom,
          favoriteIds: filters.favoriteIds?.join(","),
          latitude: filters.coordinates?.[1],
          longitude: filters.coordinates?.[0],
        });

        return { url: "properties", params };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as AppTag, id })), // Using AppTag for consistency
              { type: "Properties" as AppTag, id: "LIST" },
            ]
          : [{ type: "Properties" as AppTag, id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch properties.",
        });
      },
    }),

    getProperty: build.query<Property, number>({
      query: (id) => `properties/${id}`,
      providesTags: (result, error, id) => [{ type: "PropertyDetails" as AppTag, id }], // Using AppTag
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load property details.",
        });
      },
    }),

    // tenant related endpoints (no changes needed here based on last diff)
    getTenant: build.query<Tenant, string>({
      query: (cognitoId) => `tenants/${cognitoId}`,
      providesTags: (result) => result ? [{ type: "Tenants" as AppTag, id: result.id }] : [], // Using AppTag
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile.",
        });
      },
    }),

    getBuyer: build.query<Buyer, string>({
      query: (cognitoId) => `buyers/${cognitoId}`,
      providesTags: (result) => result ? [{ type: "Buyers" as AppTag, id: result.id }] : [], // Using AppTag
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile.",
        });
      },
    }),

    getCurrentResidences: build.query<Property[], string>({
      query: (cognitoId) => `tenants/${cognitoId}/current-residences`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as AppTag, id })),
              { type: "Properties" as AppTag, id: "LIST" },
            ]
          : [{ type: "Properties" as AppTag, id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch current residences.",
        });
      },
    }),

        getCurrentResidencesbuyer: build.query<Property[], string>({
      query: (cognitoId) => `buyers/${cognitoId}/current-residences`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as AppTag, id })),
              { type: "Properties" as AppTag, id: "LIST" },
            ]
          : [{ type: "Properties" as AppTag, id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch current residences.",
        });
      },
    }),

    updateTenantSettings: build.mutation<
      Tenant,
      { cognitoId: string } & Partial<Tenant>
    >({
      query: ({ cognitoId, ...updatedTenant }) => ({
        url: `tenants/${cognitoId}`,
        method: "PUT",
        body: updatedTenant,
      }),
      invalidatesTags: (result) => result ? [{ type: "Tenants" as AppTag, id: result.id }] : [], // Using AppTag
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),



// In your api.ts file, within the `endpoints: (build) => ({ ... })` section:

// Make sure Tenant and Buyer types are correctly imported or defined
// import { Tenant, Property } from "@/types/prismaTypes";
// Assuming Buyer type is defined locally or imported, and includes `id` and `favorites`

    addFavoriteProperty: build.mutation<
      Tenant | Buyer, // The mutation can return either a Tenant or a Buyer object
      { cognitoId: string; propertyId: number; userRole: 'tenant' | 'buyer' } // Added userRole to args
    >({
      query: ({ cognitoId, propertyId, userRole }) => ({
        // Dynamically construct the URL based on userRole
        url: `${userRole}s/${cognitoId}/favorites/${propertyId}`, // e.g., "tenants/..." or "buyers/..."
        method: "POST",
      }),
      invalidatesTags: (result, error, { userRole }) => {
        // result is the Tenant or Buyer object returned by the API after adding the favorite
        // { userRole } is destructured from the arguments passed to the mutation
        if (result && result.id) {
          const userSpecificTagType = userRole === "tenant" ? "Tenants" : "Buyers";
          return [
            { type: userSpecificTagType as AppTag, id: result.id }, // Invalidate specific tenant or buyer cache
            { type: "Properties" as AppTag, id: "LIST" }, // May still be useful if favorite lists affect property list views
          ];
        }
        return [{ type: "Properties" as AppTag, id: "LIST" }]; // Fallback
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!", // Unified success message
          error: "Failed to add to favorites",
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant | Buyer, // The mutation can return either a Tenant or a Buyer object
      { cognitoId: string; propertyId: number; userRole: 'tenant' | 'buyer' } // Added userRole to args
    >({
      query: ({ cognitoId, propertyId, userRole }) => ({
        // Dynamically construct the URL based on userRole
        url: `${userRole}s/${cognitoId}/favorites/${propertyId}`, // e.g., "tenants/..." or "buyers/..."
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { userRole }) => {
        // result is the Tenant or Buyer object returned by the API after removing the favorite
        // { userRole } is destructured from the arguments passed to the mutation
        if (result && result.id) {
          const userSpecificTagType = userRole === "tenant" ? "Tenants" : "Buyers";
          return [
            { type: userSpecificTagType as AppTag, id: result.id }, // Invalidate specific tenant or buyer cache
            { type: "Properties" as AppTag, id: "LIST" },
          ];
        }
        return [{ type: "Properties" as AppTag, id: "LIST" }]; // Fallback
      },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Removed from favorites!", // Unified success message
          error: "Failed to remove from favorites.",
        });
      },
    }),

    // manager related endpoints (no changes needed here based on last diff)
    getManagerProperties: build.query<Property[], string>({
      query: (cognitoId) => `managers/${cognitoId}/properties`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as AppTag, id })),
              { type: "Properties" as AppTag, id: "LIST" },
            ]
          : [{ type: "Properties" as AppTag, id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load manager profile.",
        });
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      { cognitoId: string } & Partial<Manager>
    >({
      query: ({ cognitoId, ...updatedManager }) => ({
        url: `managers/${cognitoId}`,
        method: "PUT",
        body: updatedManager,
      }),
      invalidatesTags: (result) => result ? [{ type: "Managers" as AppTag, id: result.id }] : [], // Using AppTag
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    createProperty: build.mutation<Property, FormData>({
      query: (newProperty) => ({
        url: `properties`,
        method: "POST",
        body: newProperty,
      }),
      invalidatesTags: (result) => {
        const tags: AppTag[] = ["Properties" as AppTag]; // Initialize with base tag
        if (result?.manager?.id) { // Check if manager info is in result
            // This needs a type for result.manager.id, assuming string or number
            tags.push({ type: "Managers" as AppTag, id: result.manager.id } as any); // `as any` if id type mismatch, better to align types
        }
        // Add similar for landlord if result can contain landlord info
        // if (result?.landlord?.id) {
        //   tags.push({ type: "Landlords" as AppTag, id: result.landlord.id } as any);
        // }
        return tags;
    },
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error: "Failed to create property.",
        });
      },
    }),

    // lease related enpoints (no changes needed here based on last diff)
    getLeases: build.query<Lease[], void>({ // Changed number to void as query() takes no arg
      query: () => "leases",
      providesTags: [{type: "Leases" as AppTag, id: 'LIST'}], // Provide a general list tag
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch leases.",
        });
      },
    }),

    getPropertyLeases: build.query<Lease[], number>({
      query: (propertyId) => `properties/${propertyId}/leases`,
      providesTags: (result, error, propertyId) => 
        result ? [
            ...result.map(lease => ({ type: 'Leases' as AppTag, id: lease.id })),
            { type: 'Leases' as AppTag, id: 'LIST' } // Also invalidate/provide general list
        ] : [{ type: 'Leases' as AppTag, id: 'LIST' }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch property leases.",
        });
      },
    }),

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: (result, error, leaseId) => 
        result ? [
            ...result.map(payment => ({ type: 'Payments' as AppTag, id: payment.id })),
            { type: 'Payments' as AppTag, id: 'LIST' }
        ] : [{ type: 'Payments' as AppTag, id: 'LIST' }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch payment info.",
        });
      },
    }),

    // application related endpoints (no changes needed here based on last diff)
    getApplications: build.query<
      Application[],
      { userId?: string; userType?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.userId) {
          queryParams.append("userId", params.userId.toString());
        }
        if (params.userType) {
          queryParams.append("userType", params.userType);
        }

        return `applications?${queryParams.toString()}`;
      },
      providesTags: [{type: "Applications" as AppTag, id: 'LIST'}],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch applications.",
        });
      },
    }),

    updateApplicationStatus: build.mutation<
      Application & { lease?: Lease },
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({
        url: `applications/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: [{type:"Applications" as AppTag, id: 'LIST'}, {type:"Leases" as AppTag, id: 'LIST'}],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application status updated successfully!",
          error: "Failed to update application settings.",
        });
      },
    }),

    createApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({
        url: `applications`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: [{type: "Applications" as AppTag, id: 'LIST'}],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application created successfully!",
          error: "Failed to create applications.",
        });
      },
    }),

    // --- START Landlord Endpoints (already added from previous step) ---
    getLandlordProperties: build.query<Property[], void>({
  query: () => `seller-properties`,
  providesTags: (result) =>
    result
      ? [
          ...result.map(({ id }) => ({ type: "Properties" as AppTag, id })),
          { type: "Properties" as AppTag, id: "LIST" },
        ]
      : [{ type: "Properties" as AppTag, id: "LIST" }],
  async onQueryStarted(_, { queryFulfilled }) {
    await withToast(queryFulfilled, {
      error: "Failed to load landlord properties.",
    });
  },
}),

    updateLandlordSettings: build.mutation<
      Landlord,
      { cognitoId: string } & Partial<Landlord>
    >({
      query: ({ cognitoId, ...updatedLandlord }) => ({
        url: `landlords/${cognitoId}`,
        method: "PUT",
        body: updatedLandlord,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: "Landlords" as AppTag, id: result.id }] : [],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Landlord settings updated successfully!",
          error: "Failed to update landlord settings.",
        });
      },
    }),
    // --- END Landlord Endpoints ---
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation,
  useUpdateLandlordSettingsMutation, // <<< --- FIX #3: Add this export
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetCurrentResidencesQuery,
  useGetCurrentResidencesbuyerQuery,
  useGetManagerPropertiesQuery,
  useGetLandlordPropertiesQuery, // <<< --- FIX #3: Add this export
  useCreatePropertyMutation,
  useGetTenantQuery,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,
  useGetPaymentsQuery,
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,
  useGetBuyerQuery,
} = api;