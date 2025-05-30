// src/app/(dashboard)/landlords/newproperty/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form"; // Removed Controller as we simplify checkbox groups

// --- NO MORE IN-FILE ENUMS FOR FORM OPTIONS ---

interface SellerPropertyFormData {
  name: string;
  description: string;
  salePrice: number;
  // These are now plain text inputs
  propertyType: string;
  propertyStatus: string;
  amenities: string; // Will be a comma-separated string
  highlights: string; // Will be a comma-separated string

  beds: number;
  baths: number;
  squareFeet: number;
  yearBuilt?: number | null;
  HOAFees?: number | null;
  photos?: FileList;
  agreementDocument?: FileList;
  openHouseDates?: string;
  sellerNotes?: string;
  allowBuyerApplications: boolean;
  preferredFinancingInfo?: string;
  insuranceRecommendation?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  termsAgreed?: boolean;
}

interface AuthUser {
  cognitoInfo: { userId: string };
}

// Mock API functions (keep as is for now)
const getAuthUserAPI = async (): Promise<AuthUser | null> => {
  console.log("API CALL (GET): /api/auth/user - Fetching authenticated user...");
  return new Promise((resolve) =>
    setTimeout(
      () => resolve({ cognitoInfo: { userId: "mock-seller-cognito-123" } }),
      500
    )
  );
};

const createSellerPropertyAPI = async (
  formData: FormData
): Promise<{ success: boolean; property?: any; message?: string }> => {
  console.log(
    "API CALL (POST): /api/seller-properties - Creating new seller property..."
  );
  try {
    const response = await fetch("/api/seller-properties", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok)
      return { success: false, message: data.message || `Error: ${response.status}` };
    return { success: true, property: data, message: "Seller property created!" };
  } catch (error) {
    console.error("createSellerPropertyAPI error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
};

const NewSellerPropertyPage = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    // control, // No longer needed for simplified amenities/highlights
    // formState: { errors }, // Errors are less relevant with placeholder strategy
  } = useForm<SellerPropertyFormData>({
    defaultValues: {
      name: "",
      description: "",
      salePrice: undefined,
      propertyType: "", // Default to empty string for text input
      propertyStatus: "For Sale", // Can keep a sensible default string
      beds: undefined,
      baths: undefined,
      squareFeet: undefined,
      yearBuilt: null,
      HOAFees: null,
      allowBuyerApplications: true,
      amenities: "", // Default to empty string for comma-separated input
      highlights: "", // Default to empty string for comma-separated input
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      termsAgreed: false,
      openHouseDates: "",
      sellerNotes: "",
      preferredFinancingInfo: "",
      insuranceRecommendation: "",
      photos: undefined,
      agreementDocument: undefined,
    },
  });

  useEffect(() => {
    getAuthUserAPI()
      .then((user) => {
        if (user) setAuthUser(user);
        else setAuthError("Failed to load user info.");
      })
      .catch(() => setAuthError("Error fetching user."));
  }, []);

  const onSubmit: SubmitHandler<SellerPropertyFormData> = async (
    submittedData
  ) => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    if (!authUser?.cognitoInfo?.userId) {
      setSubmitMessage({
        type: "error",
        text: "Authentication error. Please log in.",
      });
      setIsSubmitting(false);
      return;
    }

    const data = { ...getValues(), ...submittedData };
    const processedData: SellerPropertyFormData = { ...data };

    // --- DATA PREPROCESSING TO FILL MISSING/INVALID VALUES ---
    // Strings (including formerly enum-driven fields)
    if (!String(processedData.name || "").trim()) processedData.name = "Placeholder Property Name";
    if (!String(processedData.description || "").trim()) processedData.description = "No description provided.";
    if (!String(processedData.propertyType || "").trim()) processedData.propertyType = "Not Specified";
    if (!String(processedData.propertyStatus || "").trim()) processedData.propertyStatus = "Availability Unknown";
    if (!String(processedData.address || "").trim()) processedData.address = "123 Placeholder St";
    if (!String(processedData.city || "").trim()) processedData.city = "Anytown";
    if (!String(processedData.state || "").trim()) processedData.state = "State";
    if (!String(processedData.postalCode || "").trim()) processedData.postalCode = "00000";
    if (!String(processedData.country || "").trim()) processedData.country = "Placeholder Country";
    
    // Comma-separated strings for amenities/highlights (ensure they are strings)
    processedData.amenities = String(processedData.amenities || "").trim();
    processedData.highlights = String(processedData.highlights || "").trim();


    // Numbers
    if ( typeof processedData.salePrice !== "number" || isNaN(processedData.salePrice) || processedData.salePrice < 1) processedData.salePrice = 50000;
    if (typeof processedData.beds !== "number" || isNaN(processedData.beds) || processedData.beds < 0) processedData.beds = 1;
    if ( typeof processedData.baths !== "number" || isNaN(processedData.baths) || processedData.baths < 0) processedData.baths = 1;
    if ( typeof processedData.squareFeet !== "number" || isNaN(processedData.squareFeet) || processedData.squareFeet < 1) processedData.squareFeet = 500;

    // Optional Numbers
    const currentYear = new Date().getFullYear();
    if ( processedData.yearBuilt === null || typeof processedData.yearBuilt !== "number" || isNaN(processedData.yearBuilt) || processedData.yearBuilt < 1800 || processedData.yearBuilt > currentYear ) {
      processedData.yearBuilt = 2000; // Or set to null if backend handles null for optional numbers
    }
    if ( processedData.HOAFees === null || typeof processedData.HOAFees !== "number" || isNaN(processedData.HOAFees) || processedData.HOAFees < 0 ) {
      processedData.HOAFees = 0; // Or set to null
    }

    // Optional text fields
    if (!String(processedData.openHouseDates || "").trim()) processedData.openHouseDates = "Not scheduled";
    if (!String(processedData.sellerNotes || "").trim()) processedData.sellerNotes = "No special notes.";
    if (!String(processedData.preferredFinancingInfo || "").trim()) processedData.preferredFinancingInfo = "Any standard financing.";
    if (!String(processedData.insuranceRecommendation || "").trim()) processedData.insuranceRecommendation = "Standard homeowners insurance recommended.";
    
    processedData.allowBuyerApplications = !!processedData.allowBuyerApplications;
    processedData.termsAgreed = !!processedData.termsAgreed;
    // --- END OF DATA PREPROCESSING ---

    const formData = new FormData();
    Object.entries(processedData).forEach(([key, value]) => {
      const K = key as keyof SellerPropertyFormData;

      if (K === "photos" || K === "agreementDocument") return;

      if (K === "amenities" || K === "highlights") {
        // Send comma-separated string as an array of strings
        // If it's empty, send empty array.
        const items = typeof value === 'string' && value.trim()
            ? value.split(',').map(item => item.trim()).filter(item => item)
            : [];
        formData.append(K, JSON.stringify(items));
      } else if (K === "openHouseDates") {
        if (value === "Not scheduled") {
          formData.append(K, JSON.stringify(["Not scheduled"]));
        } else if (typeof value === 'string' && value.trim()) {
          formData.append(K, JSON.stringify(value.split(',').map(d => d.trim()).filter(d => d)));
        } else {
          formData.append(K, JSON.stringify([]));
        }
      } else if (value !== undefined && value !== null) {
        formData.append(K, String(value));
      } else if (value === null && (K === "yearBuilt" || K === "HOAFees")) {
        // If you want to explicitly send null for optional numbers that were cleared
        // formData.append(K, "null"); // Backend would need to parse "null" string
        // Or, current logic fills them with defaults (e.g., 2000, 0), so they are sent as numbers.
        // If they are truly optional and can be absent, just don't append.
        // The current pre-processing step above ensures they have a value (0 or 2000)
        // so this 'else if' block might not be hit if they are always filled.
      }
    });

    if (processedData.photos && processedData.photos.length > 0) {
      for (let i = 0; i < processedData.photos.length; i++)
        formData.append("photos", processedData.photos[i]);
    }
    if (
      processedData.agreementDocument &&
      processedData.agreementDocument.length > 0
    ) {
      formData.append(
        "agreementDocument",
        processedData.agreementDocument[0]
      );
    }

    formData.append("sellerCognitoId", authUser.cognitoInfo.userId);

    const response = await createSellerPropertyAPI(formData);
    if (response.success) {
      setSubmitMessage({
        type: "success",
        text: response.message || "Property listed successfully!",
      });
      reset();
    } else {
      setSubmitMessage({
        type: "error",
        text: response.message || "Failed to list property.",
      });
    }
    setIsSubmitting(false);
  };

  // Style constants (keep as is)
  const inputClassName = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const labelClassName = "block text-sm font-medium text-gray-700";
  const sectionCardClassName = "bg-white shadow-md rounded-xl p-6";
  const sectionTitleClassName = "text-xl font-semibold text-gray-900 mb-1";
  const sectionDescriptionClassName = "text-sm text-gray-600 mb-6";
  // checkboxLabelClass & checkboxInputClass are no longer used for amenities/highlights directly

  if (authError) { /* ... */ }
  if (!authUser) { /* ... */ }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">List Your Property for Sale (Simplified)</h1>
        <p className="text-md text-gray-600 mt-1">
          Provide details to attract potential buyers. All fields are open.
        </p>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <div className={sectionCardClassName}>
          <h2 className={sectionTitleClassName}>Property Overview</h2>
          {/* ... Name and Description inputs ... (same as before) */}
           <div className="space-y-4">
            <div>
              <label htmlFor="name" className={labelClassName}>Property Title / Name</label>
              <input type="text" id="name" {...register("name")} className={inputClassName} />
            </div>
            <div>
              <label htmlFor="description" className={labelClassName}>Description</label>
              <textarea id="description" {...register("description")} rows={5} className={inputClassName}></textarea>
            </div>
          </div>
        </div>

        {/* Sale Details */}
        <div className={sectionCardClassName}>
          <h2 className={sectionTitleClassName}>Sale Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="salePrice" className={labelClassName}>Asking Price ($)</label>
              <input type="number" id="salePrice" {...register("salePrice", { valueAsNumber: true })} className={inputClassName}/>
            </div>
            <div>
              <label htmlFor="propertyStatus" className={labelClassName}>Property Status (e.g., For Sale, Rented)</label>
              <input type="text" id="propertyStatus" {...register("propertyStatus")} className={inputClassName}/>
            </div>
          </div>
        </div>

        {/* Property Specifics */}
        <div className={sectionCardClassName}>
          <h2 className={sectionTitleClassName}>Property Specifics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* ... Beds, Baths, SquareFeet inputs ... (same as before) */}
            <div>
              <label htmlFor="beds" className={labelClassName}>Bedrooms</label>
              <input type="number" id="beds" {...register("beds", { valueAsNumber: true })} className={inputClassName}/>
            </div>
            <div>
              <label htmlFor="baths" className={labelClassName}>Bathrooms</label>
              <input type="number" step="0.1" id="baths" {...register("baths", { valueAsNumber: true })} className={inputClassName}/>
            </div>
            <div>
              <label htmlFor="squareFeet" className={labelClassName}>Square Feet (approx.)</label>
              <input type="number" id="squareFeet" {...register("squareFeet", { valueAsNumber: true })} className={inputClassName}/>
            </div>
            <div>
              <label htmlFor="propertyType" className={labelClassName}>Property Type (e.g., Apartment, House)</label>
              <input type="text" id="propertyType" {...register("propertyType")} className={inputClassName}/>
            </div>
            {/* ... Year Built, HOA Fees inputs ... (same as before) */}
            <div>
              <label htmlFor="yearBuilt" className={labelClassName}>Year Built</label>
              <input type="number" id="yearBuilt" {...register("yearBuilt", {valueAsNumber: true })} className={inputClassName}/>
            </div>
            <div>
              <label htmlFor="HOAFees" className={labelClassName}>HOA Fees (per month, if any)</label>
              <input type="number" id="HOAFees" {...register("HOAFees", {valueAsNumber: true})} className={inputClassName}/>
            </div>
          </div>
        </div>

        {/* Location (same as before) */}
        <div className={sectionCardClassName}>
             <h2 className={sectionTitleClassName}>Location</h2>
             {/* ... Address, City, State, Postal Code, Country inputs ... (same as before) */}
            <div className="space-y-4">
                <div><label htmlFor="address" className={labelClassName}>Street Address</label><input type="text" id="address" {...register("address")} className={inputClassName} /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label htmlFor="city" className={labelClassName}>City</label><input type="text" id="city" {...register("city")} className={inputClassName} /></div>
                    <div><label htmlFor="state" className={labelClassName}>State/Province</label><input type="text" id="state" {...register("state")} className={inputClassName} /></div>
                    <div><label htmlFor="postalCode" className={labelClassName}>Postal/Zip Code</label><input type="text" id="postalCode" {...register("postalCode")} className={inputClassName} /></div>
                </div>
                <div><label htmlFor="country" className={labelClassName}>Country</label><input type="text" id="country" {...register("country")} className={inputClassName} /></div>
            </div>
        </div>


        {/* Features (Amenities & Highlights) - Simplified to Text Inputs */}
        <div className={sectionCardClassName}>
          <h2 className={sectionTitleClassName}>Property Features</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="amenities" className={labelClassName}>
                Amenities (comma-separated, e.g., Pool, Gym, Parking)
              </label>
              <input type="text" id="amenities" {...register("amenities")} className={inputClassName} placeholder="Pool, Gym, Parking"/>
            </div>
            <div>
              <label htmlFor="highlights" className={labelClassName}>
                Highlights (comma-separated, e.g., Great View, Quiet Area)
              </label>
              <input type="text" id="highlights" {...register("highlights")} className={inputClassName} placeholder="Great View, Quiet Area"/>
            </div>
          </div>
        </div>

        {/* Media & Documents (same as before) */}
        <div className={sectionCardClassName}>
          <h2 className={sectionTitleClassName}>Media & Documents</h2>
           {/* ... Photos and Agreement Document inputs ... (same as before) */}
            <div className="space-y-6">
                <div><label htmlFor="photos" className={labelClassName}>Property Photos (select multiple)</label><input type="file" id="photos" {...register("photos")} multiple accept="image/*" className={`${inputClassName} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`} /></div>
                <div><label htmlFor="agreementDocument" className={labelClassName}>Sales Agreement Template / Info (Optional)</label><input type="file" id="agreementDocument" {...register("agreementDocument")} accept=".pdf,.doc,.docx,.txt" className={`${inputClassName} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`} /></div>
            </div>
        </div>

        {/* Additional Information for Buyers (same as before) */}
        <div className={sectionCardClassName}>
          <h2 className={sectionTitleClassName}>Additional Information for Buyers</h2>
           {/* ... Open House, Seller Notes, Allow Applications, Financing, Insurance inputs ... (same as before) */}
            <div className="space-y-4">
                <div><label htmlFor="openHouseDates" className={labelClassName}>Open House Dates & Times (e.g., "Sat 2-4pm, Sun 1-3pm")</label><input type="text" id="openHouseDates" {...register("openHouseDates")} className={inputClassName} placeholder="Enter dates, comma-separated"/></div>
                <div><label htmlFor="sellerNotes" className={labelClassName}>Special Notes from Seller</label><textarea id="sellerNotes" {...register("sellerNotes")} rows={3} className={inputClassName} placeholder="e.g., Recently updated kitchen, motivated seller."/></div>
                <div className="flex items-center"><input type="checkbox" id="allowBuyerApplications" {...register("allowBuyerApplications")} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/><label htmlFor="allowBuyerApplications" className="ml-2 text-sm text-gray-700 cursor-pointer">Allow interested buyers to submit inquiries/applications through the platform.</label></div>
                <div><label htmlFor="preferredFinancingInfo" className={labelClassName}>Preferred Financing / Banking Services (Optional)</label><textarea id="preferredFinancingInfo" {...register("preferredFinancingInfo")} rows={2} className={inputClassName} placeholder="e.g., Seller prefers offers with pre-approval from XYZ Bank."/></div>
                <div><label htmlFor="insuranceRecommendation" className={labelClassName}>Insurance Recommendations (Optional)</label><textarea id="insuranceRecommendation" {...register("insuranceRecommendation")} rows={2} className={inputClassName} placeholder="e.g., Consider ABC Insurance for competitive homeowners rates."/></div>
            </div>
        </div>

        {/* Terms (same as before) */}
        <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Terms and Conditions</h2>
            {/* ... Terms text and checkbox ... (same as before) */}
            <div className="h-32 overflow-y-auto border rounded-md p-3 bg-gray-50 text-sm text-gray-700 mb-4"><pre className="whitespace-pre-wrap font-sans">1. Accuracy: You confirm all details are true.{"\n"}2. Compliance: Listing complies with all local and federal housing laws.{"\n"}3. Commission: Applicable commission rates will be agreed upon separately.</pre></div>
            <div className="flex items-center"><input type="checkbox" id="termsAgreed" {...register("termsAgreed")} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/><label htmlFor="termsAgreed" className="ml-2 text-sm text-gray-700 cursor-pointer">I agree to the terms and conditions. (Optional)</label></div>
        </div>


        {/* Submission (same as before) */}

        <button type="submit" disabled={isSubmitting}
          className="w-full md:w-auto flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
          {isSubmitting ? "Submitting..." : "List Property for Sale"}
        </button>
      </form>
    </div>
  );
};

export default NewSellerPropertyPage;