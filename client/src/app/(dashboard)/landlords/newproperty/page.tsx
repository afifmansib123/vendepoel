// src/app/(dashboard)/landlords/newproperty/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

// Icons
import { UploadCloud, XCircle, ImageOff } from 'lucide-react';

// Shadcn/ui components (as per your provided snippet)
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"; // Assuming you have these
import { Input } from "@/components/ui/input"; // Assuming you have this

// Options for select dropdowns
const PROPERTY_TYPES_OPTIONS = [
  "Condominium / Apartment", "House / Villa", "Townhouse", "Land",
  "Commercial Property (Shop/Office/Warehouse)", "Shophouse (TH-style)",
  "Studio Apartment", "Mixed-Use Property", "Serviced Apartment", "Bungalow",
  "Penthouse", "Other Residential", "Other Commercial",
];

const AMENITIES_OPTIONS = [
  "Swimming Pool", "Fitness Center/Gym", "Covered Parking", "Underground Parking",
  "24/7 Security", "CCTV", "Elevator", "Garden / Green Space", "Pet-friendly",
  "Air Conditioning (Central)", "Air Conditioning (Split-unit)", "Balcony",
  "Terrace", "Rooftop Terrace/Lounge", "High-speed Internet Access",
  "In-unit Laundry Hookup", "Communal Laundry Facility", "Co-working Space / Business Center",
  "Shuttle Service (e.g., to BTS/MRT in TH)", "Sauna / Steam Room",
  "Kids Playground / Play Area", "On-site Convenience Store/Shop", "Keycard Access System",
  "Bicycle Storage (Common in BE)", "Cellar / Private Storage Room (Common in BE)",
  "Energy Efficient Appliances/Features", "Central Heating (Common in BE)",
  "Double Glazing Windows", "Fireplace", "Wheelchair Accessible", "Smart Home Features",
  "Sea View / River View", "City View", "Mountain View", "Fully Furnished",
  "Partially Furnished", "Unfurnished",
];

const HIGHLIGHTS_OPTIONS = [
  "Prime Location / Sought-After Area", "Newly Renovated / Modern Interior",
  "Quiet and Peaceful Neighborhood", "Excellent Public Transport Links",
  "Near BTS/MRT Station (TH)", "Near Tram/Metro/Bus Stop (BE/General)",
  "Bright and Airy / Abundant Natural Light", "Spacious Rooms / Open Floor Plan",
  "Contemporary/Modern Design", "Classic/Traditional Charm", "High Ceilings",
  "Ample Storage Space", "Strong Investment Potential / Good ROI", "Move-in Ready Condition",
  "Panoramic / Stunning Views", "Waterfront Property (River/Canal/Sea)",
  "Near International School(s)", "Close to Major Hospitals/Clinics",
  "Beachfront / Easy Access to Beach (TH)", "Access to Golf Course(s)",
  "Expat-Friendly Community/Area", "Low Common Area Fees / HOA Dues",
  "Close to EU Institutions (Brussels, BE)", "Historic Building / Property with Character",
  "South-facing Garden/Terrace (Valued in BE)", "Good Energy Performance Certificate (EPC)",
  "Proximity to Parks / Green Spaces", "Corner Unit / End Unit (More Privacy/Light)",
  "Top Floor Unit (Views/Quiet)", "Ground Floor Unit with Private Garden Access",
  "Gated Community / Secure Compound", "Ideal for Families", "Perfect for Professionals/Couples",
  "Pet-Friendly Building/Community Rules",
];

interface SellerPropertyFormData {
  name: string;
  description: string;
  salePrice: number;
  propertyType: string;
  propertyStatus: string;
  amenities: string[];
  highlights: string[];
  beds: number;
  baths: number;
  squareFeet: number;
  yearBuilt?: number | null;
  HOAFees?: number | null;
  photos?: File[]; // Changed from FileList to File[]
  agreementDocument?: FileList; // Kept as FileList for now, can be changed if needed
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

// Mock API functions
const getAuthUserAPI = async (): Promise<AuthUser | null> => {
  console.log("API CALL (GET): /api/auth/user - Fetching authenticated user...");
  return new Promise((resolve) =>
    setTimeout(() => resolve({ cognitoInfo: { userId: "mock-seller-cognito-123" } }), 500)
  );
};

const createSellerPropertyAPI = async (
  formData: FormData
): Promise<{ success: boolean; property?: any; message?: string }> => {
  console.log("API CALL (POST): /api/seller-properties - Creating new seller property...");
  try {
    const response = await fetch("/api/seller-properties", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) return { success: false, message: data.message || `Error: ${response.status}` };
    return { success: true, property: data, message: "Seller property created!" };
  } catch (error) {
    console.error("createSellerPropertyAPI error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Network error" };
  }
};

const NewSellerPropertyPage = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const form = useForm<SellerPropertyFormData>({
    // If you decide to use Zod later, you would add: resolver: zodResolver(yourSchema),
    defaultValues: {
      name: "",
      description: "",
      salePrice: undefined,
      propertyType: "",
      propertyStatus: "For Sale",
      beds: undefined,
      baths: undefined,
      squareFeet: undefined,
      yearBuilt: null,
      HOAFees: null,
      allowBuyerApplications: true,
      amenities: [],
      highlights: [],
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
      photos: [], // Default to empty array for File[]
      agreementDocument: undefined,
    },
  });

  const { register, handleSubmit, reset, getValues, control, setValue, watch, formState: { errors } } = form;

  // --- START OF NEW PHOTO UPLOAD LOGIC ---
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const currentPhotoFiles: File[] = watch("photos") || [];

  useEffect(() => {
    let newUrls: string[] = [];
    if (currentPhotoFiles && currentPhotoFiles.length > 0) {
      newUrls = currentPhotoFiles.map(file => {
        if (file instanceof File) { // Ensure it's a File object
          return URL.createObjectURL(file);
        }
        return ''; // Or handle non-File objects appropriately
      }).filter(url => url !== '');
      setPreviewUrls(newUrls);
    } else {
      setPreviewUrls([]);
    }
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [currentPhotoFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFilesFromInput = Array.from(event.target.files);
      const existingFiles = getValues("photos") || [];
      
      // Basic validation example (can be expanded)
      const totalFiles = existingFiles.length + newFilesFromInput.length;
      if (totalFiles > 10) {
        alert("You can upload a maximum of 10 photos.");
        // Optionally, use RHF's setError:
        // form.setError("photos", { type: "manual", message: "Maximum 10 photos allowed." });
        if(event.target) event.target.value = ""; // Clear input to allow re-selection
        return;
      }

      const combinedFiles = [...existingFiles, ...newFilesFromInput];
      setValue("photos", combinedFiles, { shouldValidate: true, shouldDirty: true });
    }
    if(event.target) event.target.value = ""; // Clear input to allow re-selection
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const existingFiles = getValues("photos") || [];
    const updatedFiles = existingFiles.filter((_, index) => index !== indexToRemove);
    setValue("photos", updatedFiles, { shouldValidate: true, shouldDirty: true });
  };
  // --- END OF NEW PHOTO UPLOAD LOGIC ---

  useEffect(() => {
    getAuthUserAPI()
      .then((user) => {
        if (user) setAuthUser(user);
        else setAuthError("Failed to load user info.");
      })
      .catch(() => setAuthError("Error fetching user."));
  }, []);

  const onSubmit: SubmitHandler<SellerPropertyFormData> = async (submittedData) => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    if (!authUser?.cognitoInfo?.userId) {
      setSubmitMessage({ type: "error", text: "Authentication error. Please log in." });
      setIsSubmitting(false);
      return;
    }

    const currentFormValues = getValues();
    const data = { ...currentFormValues, ...submittedData };
    const processedData: SellerPropertyFormData = { ...data };

    // Data preprocessing (simplified for brevity, your existing logic is more comprehensive)
    if (!String(processedData.name || "").trim()) processedData.name = "Placeholder Property Name";
    // ... (include your other preprocessing steps) ...
    if (!Array.isArray(processedData.amenities)) processedData.amenities = [];
    if (!Array.isArray(processedData.highlights)) processedData.highlights = [];
    if (!Array.isArray(processedData.photos)) processedData.photos = []; // Ensure photos is an array

    const formDataToSubmit = new FormData();
    Object.entries(processedData).forEach(([key, value]) => {
      const K = key as keyof SellerPropertyFormData;

      if (K === "photos" || K === "agreementDocument") return; // Handled separately

      if (K === "amenities" || K === "highlights") {
        formDataToSubmit.append(K, JSON.stringify(value || []));
      } else if (K === "openHouseDates") {
        // ... your openHouseDates logic ...
        if (value === "Not scheduled") {
            formDataToSubmit.append(K, JSON.stringify(["Not scheduled"]));
          } else if (typeof value === "string" && value.trim()) {
            formDataToSubmit.append(
              K,
              JSON.stringify(value.split(",").map((d) => d.trim()).filter((d) => d))
            );
          } else {
            formDataToSubmit.append(K, JSON.stringify([]));
          }
      } else if (value !== undefined && value !== null) {
        formDataToSubmit.append(K, String(value));
      }
    });

    // Handle photos (now File[])
    if (processedData.photos && processedData.photos.length > 0) {
      processedData.photos.forEach((file) => {
        if (file instanceof File) { // Ensure it's a File object
          formDataToSubmit.append("photos", file); // Backend expects "photos" key
        }
      });
    }

    // Handle agreementDocument (still FileList)
    if (processedData.agreementDocument && processedData.agreementDocument.length > 0) {
      formDataToSubmit.append("agreementDocument", processedData.agreementDocument[0]);
    }

    formDataToSubmit.append("sellerCognitoId", authUser.cognitoInfo.userId);

    const response = await createSellerPropertyAPI(formDataToSubmit);
    if (response.success) {
      setSubmitMessage({ type: "success", text: response.message || "Property listed successfully!" });
      reset(); // Resets form to defaultValues
      setPreviewUrls([]); // Explicitly clear previews on successful reset
    } else {
      setSubmitMessage({ type: "error", text: response.message || "Failed to list property." });
    }
    setIsSubmitting(false);
  };

  // Style constants
  const inputClassName = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const labelClassName = "block text-sm font-medium text-gray-700";
  const sectionCardClassName = "bg-white shadow-md rounded-xl p-6";
  const sectionTitleClassName = "text-xl font-semibold text-gray-900 mb-1";
  const sectionDescriptionClassName = "text-sm text-gray-600 mb-6";

  if (authError) return <div className="flex justify-center items-center h-screen"><p className="text-red-500">{authError}</p></div>;
  if (!authUser) return <div className="flex justify-center items-center h-screen"><p>Loading user information...</p></div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">List Your Property for Sale</h1>
        <p className="text-md text-gray-600 mt-1">Provide details to attract potential buyers.</p>
      </header>

      {submitMessage && (
        <div className={`mb-6 p-4 rounded-md ${submitMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {submitMessage.text}
        </div>
      )}

      {/* Use the Form component from shadcn/ui to wrap the form if you plan to use its context, not strictly necessary if only FormField is used */}
      <Form {...form}> 
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Property Overview</h2>
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
                <input type="number" id="salePrice" {...register("salePrice", { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="propertyStatus" className={labelClassName}>Property Status</label>
                <input type="text" id="propertyStatus" {...register("propertyStatus")} className={inputClassName} />
              </div>
            </div>
          </div>

          {/* Property Specifics */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Property Specifics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label htmlFor="beds" className={labelClassName}>Bedrooms</label>
                <input type="number" id="beds" {...register("beds", { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="baths" className={labelClassName}>Bathrooms</label>
                <input type="number" step="0.1" id="baths" {...register("baths", { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="squareFeet" className={labelClassName}>Square Feet (approx.)</label>
                <input type="number" id="squareFeet" {...register("squareFeet", { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="propertyType" className={labelClassName}>Property Type</label>
                <select id="propertyType" {...register("propertyType")} className={inputClassName} defaultValue="">
                  <option value="" disabled>-- Select Property Type --</option>
                  {PROPERTY_TYPES_OPTIONS.map((type) => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="yearBuilt" className={labelClassName}>Year Built</label>
                <input type="number" id="yearBuilt" {...register("yearBuilt", { valueAsNumber: true })} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="HOAFees" className={labelClassName}>HOA Fees (per month, if any)</label>
                <input type="number" id="HOAFees" {...register("HOAFees", { valueAsNumber: true })} className={inputClassName} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Location</h2>
             <div className="space-y-4">
                <div>
                  <label htmlFor="address" className={labelClassName}>Street Address</label>
                  <input type="text" id="address" {...register("address")} className={inputClassName} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="city" className={labelClassName}>City</label>
                    <input type="text" id="city" {...register("city")} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="state" className={labelClassName}>State/Province</label>
                    <input type="text" id="state" {...register("state")} className={inputClassName} />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className={labelClassName}>Postal/Zip Code</label>
                    <input type="text" id="postalCode" {...register("postalCode")} className={inputClassName} />
                  </div>
                </div>
                <div>
                  <label htmlFor="country" className={labelClassName}>Country</label>
                  <input type="text" id="country" {...register("country")} className={inputClassName} />
                </div>
            </div>
          </div>

          {/* --- NEW MEDIA & DOCUMENTS SECTION with Enhanced Photo Upload --- */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Media & Documents</h2>
            <div className="space-y-6">
              {/* Property Photos - Enhanced UI */}
              <div>
                <FormLabel className={`${labelClassName} mb-2`}>Property Photos</FormLabel>
                <p className="text-xs text-gray-500 mb-3">
                  Upload up to 10 images (Max 5MB each). JPG, PNG, WEBP accepted.
                </p>
                <FormField
                  control={control}
                  name="photos"
                  render={({ field }) => ( // `field` can be used if needed, but onChange is handled by `handleFileChange`
                    <FormItem>
                      <FormControl>
                        <div>
                          <label
                            htmlFor="photos-upload-input" // Changed ID to avoid conflict if "photos" is used elsewhere
                            className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                          >
                            <span className="flex items-center space-x-2">
                              <UploadCloud className="w-6 h-6 text-gray-600" />
                              <span className="font-medium text-gray-600">
                                Click to upload or <span className="text-indigo-600">drag and drop</span>
                              </span>
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              (PNG, JPG, WEBP up to 5MB each)
                            </span>
                          </label>
                          <Input // Using shadcn/ui Input for hidden file input
                            id="photos-upload-input"
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden" // Keep it hidden, label triggers it
                            onChange={handleFileChange} // Custom handler
                            // ref={field.ref} // RHF handles ref internally for `control`
                          />
                        </div>
                      </FormControl>
                      <FormMessage>{errors.photos?.message as React.ReactNode}</FormMessage>
                    </FormItem>
                  )}
                />

                {previewUrls.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {previewUrls.map((url, index) => (
                      <div key={url} className="relative group aspect-square">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-md border border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="destructive" // Assuming you have a destructive variant or customize
                          size="icon" // Assuming you have an icon size or customize
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-80 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-700 text-white rounded-full"
                          onClick={() => handleRemoveImage(index)}
                          aria-label="Remove image"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {previewUrls.length === 0 && currentPhotoFiles.length > 0 && (
                  <div className="mt-4 text-sm text-gray-500">
                    <ImageOff className="inline-block w-5 h-5 mr-1" />
                    {currentPhotoFiles.length} file(s) selected. Previews generating or unavailable.
                  </div>
                )}
              </div>

              {/* Agreement Document - Kept original simple upload */}
              <div>
                <label htmlFor="agreementDocument" className={labelClassName}>
                  Sales Agreement Template / Info (Optional)
                </label>
                <input
                  type="file"
                  id="agreementDocument"
                  {...register("agreementDocument")}
                  accept=".pdf,.doc,.docx,.txt"
                  className={`${inputClassName} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`}
                />
                 {/* errors.agreementDocument && <span className="text-red-500 text-xs">{errors.agreementDocument.message}</span> */}
              </div>
            </div>
          </div>
          {/* --- END OF MEDIA & DOCUMENTS SECTION --- */}


          {/* Additional Information for Buyers */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Additional Information for Buyers</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="openHouseDates" className={labelClassName}>Open House Dates & Times (e.g., "Sat 2-4pm, Sun 1-3pm")</label>
                    <input type="text" id="openHouseDates" {...register("openHouseDates")} className={inputClassName} placeholder="Enter dates, comma-separated" />
                </div>
                <div>
                    <label htmlFor="sellerNotes" className={labelClassName}>Special Notes from Seller</label>
                    <textarea id="sellerNotes" {...register("sellerNotes")} rows={3} className={inputClassName} placeholder="e.g., Recently updated kitchen, motivated seller."/>
                </div>
                <div className="flex items-center">
                    <input type="checkbox" id="allowBuyerApplications" {...register("allowBuyerApplications")} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                    <label htmlFor="allowBuyerApplications" className="ml-2 text-sm text-gray-700 cursor-pointer">
                        Allow interested buyers to submit inquiries/applications through the platform.
                    </label>
                </div>
                <div>
                    <label htmlFor="preferredFinancingInfo" className={labelClassName}>Preferred Financing / Banking Services (Optional)</label>
                    <textarea id="preferredFinancingInfo" {...register("preferredFinancingInfo")} rows={2} className={inputClassName} placeholder="e.g., Seller prefers offers with pre-approval from XYZ Bank."/>
                </div>
                <div>
                    <label htmlFor="insuranceRecommendation" className={labelClassName}>Insurance Recommendations (Optional)</label>
                    <textarea id="insuranceRecommendation" {...register("insuranceRecommendation")} rows={2} className={inputClassName} placeholder="e.g., Consider ABC Insurance for competitive homeowners rates."/>
                </div>
            </div>
          </div>

          {/* Property Features - Checkbox Groups */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Property Features</h2>
            <p className={sectionDescriptionClassName}>Select all applicable features and highlights.</p>
            <div className="mb-6">
              <label className={`${labelClassName} mb-2`}>Amenities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 max-h-60 overflow-y-auto p-3 border rounded-md bg-gray-50">
                {AMENITIES_OPTIONS.map((amenity) => (
                  <div key={amenity} className="flex items-center">
                    <input type="checkbox" id={`amenity-${amenity.replace(/\s+/g, "-").toLowerCase()}`} value={amenity} {...register("amenities")} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                    <label htmlFor={`amenity-${amenity.replace(/\s+/g, "-").toLowerCase()}`} className="ml-2 text-sm text-gray-700 cursor-pointer select-none">{amenity}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={`${labelClassName} mb-2`}>Property Highlights</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 max-h-60 overflow-y-auto p-3 border rounded-md bg-gray-50">
                {HIGHLIGHTS_OPTIONS.map((highlight) => (
                  <div key={highlight} className="flex items-center">
                    <input type="checkbox" id={`highlight-${highlight.replace(/\s+/g, "-").toLowerCase()}`} value={highlight} {...register("highlights")} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer" />
                    <label htmlFor={`highlight-${highlight.replace(/\s+/g, "-").toLowerCase()}`} className="ml-2 text-sm text-gray-700 cursor-pointer select-none">{highlight}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className={sectionCardClassName}>
            <h2 className={sectionTitleClassName}>Confirmation</h2>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input id="termsAgreed" type="checkbox" {...register("termsAgreed")} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer" />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="termsAgreed" className="font-medium text-gray-700 cursor-pointer select-none">
                  I confirm that the information provided is accurate to the best of my knowledge.
                </label>
                 {errors.termsAgreed && <p className="text-red-500 text-xs mt-1">{errors.termsAgreed.message}</p>}
              </div>
            </div>
          </div>

          {/* Submission */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "List Property for Sale"}
            </Button>
          </div>
        </form>
       </Form> 
    </div>
  );
};

export default NewSellerPropertyPage;