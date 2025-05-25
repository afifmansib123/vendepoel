// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner"; // Assuming 'sonner' is your toast library

// --- Your existing utility functions (UNCHANGED) ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEnumString(str: string) {
  // Add a check for null or undefined str to prevent errors
  if (!str || typeof str !== 'string') return '';
  return str.replace(/([A-Z])/g, " $1").trim();
}

export function formatPriceValue(value: number | null, isMin: boolean) {
  if (value === null || value === 0)
    return isMin ? "Any Min Price" : "Any Max Price";
  if (value >= 1000) {
    const kValue = value / 1000;
    return isMin ? `$${kValue}k+` : `<$${kValue}k`;
  }
  return isMin ? `$${value}+` : `<$${value}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanParams(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(params).filter(
      (
        [_, value] // eslint-disable-line @typescript-eslint/no-unused-vars
      ) =>
        value !== undefined &&
        value !== "any" && // Handles specific string "any"
        value !== "" &&
        (Array.isArray(value) ? value.some((v) => v !== null) : value !== null)
    )
  );
}

type MutationMessages = {
  success?: string;
  error: string; // error message is mandatory
  // loading?: string; // If you want to add loading toasts, uncomment and use in withToast
};

export const withToast = async <T>(
  mutationFn: Promise<T>, // This is the promise from RTK Query's .unwrap() or the queryFulfilled
  messages: Partial<MutationMessages>
) => {
  const { success, error } = messages;

  try {
    // For RTK Query, the mutationFn promise here would typically be the one
    // that resolves with data or rejects with an error object.
    // If using onQueryStarted, queryFulfilled is the promise.
    const result = await mutationFn;

    // If mutationFn is from .unwrap(), it throws on error.
    // If it's queryFulfilled, result will have .data or .error.
    // Let's assume this withToast is used with .unwrap() for mutations.
    if (success) {
        // Check if result itself is an error structure (can happen if .unwrap() is not used and it's queryFulfilled)
        const resultAsAny = result as any;
        if (resultAsAny && resultAsAny.error) {
             if(error) toast.error(typeof resultAsAny.error.data?.message === 'string' ? resultAsAny.error.data.message : error);
        } else {
            toast.success(success);
        }
    }
    return result;
  } catch (err: any) { // This catch block is for when mutationFn (e.g., from .unwrap()) rejects
    const errorMessage = err?.data?.message || err?.message || error || "An unexpected error occurred.";
    if (error) toast.error(errorMessage); // Only show toast if an error message was provided
    throw err; // Re-throw the error so the calling code (e.g., component) can also handle it
  }
};
// --- End of your existing utility functions ---


// --- INTERFACES FOR createNewUserInDatabase (ensure these match Amplify's actual return types) ---
interface AmplifyCognitoUserAttributes {
  email?: string;
  phone_number?: string;
  name?: string;        // Standard Cognito attribute for full name
  given_name?: string;
  family_name?: string;
  // Add other attributes you expect, e.g., 'profile', 'picture'
  // For custom attributes, they would be like 'custom:your_attribute'
}

interface AmplifyCognitoUser { // From Amplify's getCurrentUser()
  userId: string;             // This is the 'sub' from Cognito
  username: string;           // The username they signed up/in with
  attributes?: AmplifyCognitoUserAttributes;
}

interface AmplifyIdTokenPayload { // From idToken.payload
  sub: string;
  email?: string;
  phone_number?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  "custom:role"?: string;
  email_verified?: boolean;
  phone_number_verified?: boolean;
  // any other claims in your ID token
}

interface AmplifyIdToken { // From session.tokens.idToken
  payload: AmplifyIdTokenPayload;
  toString(): string; // Method to get the raw JWT string
}
// --- END INTERFACES ---


// --- REVISED createNewUserInDatabase ---
export const createNewUserInDatabase = async (
  amplifyUser: AmplifyCognitoUser,      // From getCurrentUser()
  idTokenObj: AmplifyIdToken | undefined, // From fetchAuthSession().tokens.idToken
  userRole: string,                     // 'manager' or 'tenant'
  fetchWithBQ: any                      // RTK Query's fetchBaseQuery instance
) => {
  console.log('[utils/createNewUserInDatabase] Called. UserID:', amplifyUser.userId, 'Role:', userRole);
  const idTokenPayload = idTokenObj?.payload;

  // Extract attributes - these MUST come from Cognito successfully
  const cognitoIdForBody = amplifyUser.userId;

  // Prioritize idToken, then amplifyUser.attributes.
  const email = idTokenPayload?.email || amplifyUser.attributes?.email;
  const phoneNumber = idTokenPayload?.phone_number || amplifyUser.attributes?.phone_number;
  
  let name = idTokenPayload?.name || amplifyUser.attributes?.name;
  if (!name) {
    const givenName = idTokenPayload?.given_name || amplifyUser.attributes?.given_name;
    const familyName = idTokenPayload?.family_name || amplifyUser.attributes?.family_name;
    if (givenName && familyName) {
      name = `${givenName} ${familyName}`;
    } else if (givenName) {
      name = givenName;
    } else if (familyName) {
      name = familyName;
    } else {
      name = amplifyUser.username; // Fallback to username if no name parts found
    }
  }

  console.log(`[utils/createNewUserInDatabase] Extracted for payload - CognitoID: "${cognitoIdForBody}", Name: "${name}", Email: "${email}", Phone: "${phoneNumber}"`);

  // This payload is for your current "plain" POST /api/managers or /api/tenants
  // which expects cognitoId in the body.
  const userDataPayload = {
    cognitoId: cognitoIdForBody,
    name: name,
    email: email,
    phoneNumber: phoneNumber,
  };

  // Client-side check for truly missing essential data before sending
  // This is important because your backend POST handlers require these fields.
  if (!userDataPayload.cognitoId || !userDataPayload.name || !userDataPayload.email) {
    const missingFields: string[] = [];
    if (!userDataPayload.cognitoId) missingFields.push("cognitoId (from amplifyUser.userId)");
    if (!userDataPayload.name) missingFields.push("name/username (from Cognito attributes)");
    if (!userDataPayload.email) missingFields.push("email (from Cognito attributes)");
    
    const clientErrorMessage = `Client: Cannot create user profile in DB. Missing essential attributes from Cognito: ${missingFields.join(', ')}. Please check Cognito User Pool attribute settings, app client read permissions, and ensure the user has these attributes set in Cognito.`;
    console.error(`[utils/createNewUserInDatabase] ${clientErrorMessage}`);
    // Return an RTK-Query like error structure so getAuthUser's try/catch can handle it gracefully
    // or so that `userDetailsResponse.error` is populated.
    return { 
        error: { 
            status: 400, // Using 400 to indicate a client-side data preparation issue
            data: { message: clientErrorMessage } 
        } 
    };
  }

  const endpointPath = userRole.toLowerCase() === 'manager' ? '/managers' : '/tenants';
  console.log(`[utils/createNewUserInDatabase] Calling POST to ${endpointPath} with payload:`, userDataPayload);

  const createUserResponse = await fetchWithBQ({
    url: endpointPath, // Relative to NEXT_PUBLIC_API_BASE_URL
    method: 'POST',
    body: userDataPayload,
  });

  if (createUserResponse.error) {
    // Log the error from the backend
    console.error(`[utils/createNewUserInDatabase] Backend error creating user (POST ${endpointPath}): Status ${createUserResponse.error.status}`, createUserResponse.error.data);
  } else {
    console.log(`[utils/createNewUserInDatabase] Successfully created user via POST to ${endpointPath}:`, createUserResponse.data);
  }

  return createUserResponse; // Return the RTK Query response object (with .data or .error)
};