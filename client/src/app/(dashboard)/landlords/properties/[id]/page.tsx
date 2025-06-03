"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Star,
  Phone,
  HelpCircle,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  // Add these new icons for highlights and amenities
  Wifi,
  Car,
  Waves,
  Trees,
  Dumbbell,
  Shield,
  Flame,
  Snowflake,
  ChefHat,
  Tv,
  Dog,
  Camera,
  Lock,
  Sun,
  Wind,
  Home,
  Users,
  Coffee,
  Gamepad2,
  Baby,
} from "lucide-react";



import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // For the top image carousel

// Components from the "zip file" (initial user provided files)
import ContactWidget from "@/app/(nondashboard)/search/[id]/ContactWidget"; // Adjusted path
import ApplicationModal from "@/app/(nondashboard)/search/[id]/ApplicationModal"; // Adjusted path
import { useGetAuthUserQuery } from "@/state/api";

// Define the expected shape of the fetched property data
interface SellerPropertyDetail {
  _id: string;
  id: number;
  name: string;
  description: string;
  salePrice: number;
  propertyType: string;
  propertyStatus: string;
  beds: number;
  baths: number;
  squareFeet: number;
  yearBuilt?: number | null;
  HOAFees?: number | null;
  amenities: string[];
  highlights: string[];
  openHouseDates?: string[];
  sellerNotes?: string;
  allowBuyerApplications: boolean;
  preferredFinancingInfo?: string;
  insuranceRecommendation?: string;
  sellerCognitoId: string;
  photoUrls: string[]; // This will be used for the top carousel
  agreementDocumentUrl?: string;
  postedDate: string;
  createdAt: string;
  updatedAt: string;
  buyerInquiries?: any[];
  location: {
    id: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates: { longitude: number; latitude: number } | null;
  } | null;
  // Mocked/assumed fields, ensure they exist in your actual data
  averageRating?: number;
  numberOfReviews?: number;
  applicationFee?: number;
  securityDeposit?: number;
  isPetsAllowed?: boolean;
  isParkingIncluded?: boolean;
}

const HighlightVisuals: Record<string, { icon: React.ElementType }> = {
  // Property Features
  "Air Conditioning": { icon: Snowflake },
  "Heating": { icon: Flame },
  "Hardwood Floors": { icon: Home },
  "Carpet": { icon: Home },
  "Tile Floors": { icon: Home },
  "High Ceilings": { icon: ArrowLeft }, // Use ArrowLeft rotated or replace with better icon
  "Walk-in Closet": { icon: Home },
  "Balcony": { icon: Sun },
  "Patio": { icon: Sun },
  "Fireplace": { icon: Flame },
  "Bay Windows": { icon: Sun },
  "Skylight": { icon: Sun },
  "Ceiling Fans": { icon: Wind },
  
  // Kitchen & Appliances
  "Updated Kitchen": { icon: ChefHat },
  "Stainless Steel Appliances": { icon: ChefHat },
  "Granite Countertops": { icon: ChefHat },
  "Dishwasher": { icon: ChefHat },
  "Microwave": { icon: ChefHat },
  "Refrigerator": { icon: ChefHat },
  "Washer/Dryer": { icon:  Wind},
  "Laundry Room": { icon: Wind},
  "In-Unit Laundry": { icon: Wind },
  
  // Technology & Connectivity
  "High-Speed Internet": { icon: Wifi },
  "WiFi Included": { icon: Wifi },
  "Cable Ready": { icon: Tv },
  "Smart Home Features": { icon: Home },
  "Security System": { icon: Shield },
  "Video Surveillance": { icon: Camera },
  "Keyless Entry": { icon: Lock },
  
  // Parking & Transportation
  "Garage": { icon: Car },
  "Covered Parking": { icon: Car },
  "Street Parking": { icon: Car },
  "Parking Included": { icon: Car },
  "EV Charging": { icon: Car },
  
  // Outdoor & Recreation
  "Swimming Pool": { icon: Waves },
  "Hot Tub": { icon: Waves },
  "Garden": { icon: Trees },
  "Landscaped Yard": { icon: Trees },
  "Deck": { icon: Sun },
  "Rooftop Access": { icon: Sun },
  "Outdoor Space": { icon: Trees },
  
  // Building Amenities
  "Fitness Center": { icon: Dumbbell },
  "Gym": { icon: Dumbbell },
  "Business Center": { icon: Coffee },
  "Conference Room": { icon: Users },
  "Lounge Area": { icon: Coffee },
  "Game Room": { icon: Gamepad2 },
  "Library": { icon: Coffee },
  "Concierge": { icon: Users },
  "24/7 Security": { icon: Shield },
  "Controlled Access": { icon: Lock },
  "Elevator": { icon: ArrowLeft }, // Use ArrowLeft rotated or replace
  
  // Pet & Family Friendly
  "Pet Friendly": { icon: Dog },
  "Dog Park": { icon: Dog },
  "Pet Wash Station": { icon: Dog },
  "Playground": { icon: Baby },
  "Family Friendly": { icon: Users },
  "Child Care": { icon: Baby },
  
  // Accessibility & Safety
  "Wheelchair Accessible": { icon: Users  },
  "Handicap Accessible": { icon: Users  },
  "Emergency Exits": { icon: Shield },
  "Fire Safety": { icon: Shield },
  "Smoke Free": { icon: Wind },
  "Non Smoking": { icon: Wind },
  
  // Default fallback
  DEFAULT: { icon: Star },
};


const SellerPropertyDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const propertyIdParams = params.id as string;

  const [property, setProperty] = useState<SellerPropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... other imports

// Inside the SellerPropertyDetailsPage component function:
// Add this state for the image preview logic
const [currentImageIndex, setCurrentImageIndex] = useState(0);

// Handlers for the custom image preview
const handlePrevImage = () => {
  if (property && property.photoUrls.length > 0) {
    setCurrentImageIndex((prev) => (prev === 0 ? property.photoUrls.length - 1 : prev - 1));
  }
};

const handleNextImage = () => {
  if (property && property.photoUrls.length > 0) {
    setCurrentImageIndex((prev) => (prev === property.photoUrls.length - 1 ? 0 : prev + 1));
  }
};

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: authUser } = useGetAuthUserQuery();
  const propertyIdForModal = Number(property?.id);

  useEffect(() => {
    if (!propertyIdParams || isNaN(Number(propertyIdParams))) {
      setError("Invalid Property ID.");
      setIsLoading(false);
      return;
    }
    const fetchPropertyDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/seller-properties/${propertyIdParams}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Property not found.");
          throw new Error(`Failed to fetch property: ${response.statusText}`);
        }
        const data: SellerPropertyDetail = await response.json();
        setProperty(data);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPropertyDetails();
  }, [propertyIdParams]);

  if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loading /></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-screen p-6"><h2 className="text-2xl font-semibold mb-2 text-red-600">Error</h2><p className="text-red-500 mb-6">{error}</p><Button onClick={() => router.back()}>Go Back</Button></div>;
  if (!property) return <div className="flex flex-col items-center justify-center min-h-screen p-6"><h2 className="text-2xl font-semibold mb-2">Not Found</h2><p className="text-gray-600 mb-6">Property not found.</p><Button onClick={() => router.push("/dashboard/landlords/properties")}>My Properties</Button></div>;

  const locationString = property.location ? `${property.location.city || ""}${property.location.city && property.location.state ? ", " : ""}${property.location.state || ""}${ (property.location.city || property.location.state) && property.location.country ? ", " : ""}${property.location.country || ""}`.trim().replace(/,$/, '') || "N/A" : "N/A";
  const fullAddress = property.location ? `${property.location.address || ""}${property.location.address ? ", " : ""}${property.location.city || ""}${property.location.city ? ", " : ""}${property.location.state || ""}${property.location.state ? " " : ""}${property.location.postalCode || ""}`.trim().replace(/,$/, "") || "N/A" : "N/A";
  const averageRating = property.averageRating || 0.0;
  const numberOfReviews = property.numberOfReviews || 0;
  const isVerifiedListing = property.propertyStatus === "For Sale";
  const applicationFee = property.applicationFee || 100;
  const securityDeposit = property.securityDeposit || 500;
  const isPetsAllowed = property.isPetsAllowed !== undefined ? property.isPetsAllowed : true;
  const isParkingIncluded = property.isParkingIncluded !== undefined ? property.isParkingIncluded : true;

  return (
    <div className="bg-white min-h-screen">
      {/* Full-width Image Carousel at the Top */}
{property && property.photoUrls && property.photoUrls.length > 0 ? (
  <div className="relative h-[350px] sm:h-[450px] md:h-[550px] w-full mb-8 overflow-hidden group"> {/* Added group for button visibility on hover */}
    {property.photoUrls.map((imageUrl, index) => (
      <div
        key={imageUrl} // Assuming imageUrls are unique, or use index if not
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          index === currentImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      >
        <Image
          src={imageUrl}
          alt={`${property.name} - Image ${index + 1}`}
          layout="fill"
          objectFit="cover"
          priority={index === 0} // Prioritize loading the first image
        />
      </div>
    ))}
    {property.photoUrls.length > 1 && (
      <>
        <button
          onClick={handlePrevImage}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-60 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all opacity-0 group-hover:opacity-100 z-20"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleNextImage}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-40 hover:bg-opacity-60 text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all opacity-0 group-hover:opacity-100 z-20"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </>
    )}
  </div>
) : (
  <div className="h-[300px] w-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 mb-8">
    <ImageIcon className="w-20 h-20 mb-2" />
    <p>No images available for this property.</p>
  </div>
)}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8"> {/* Added pb-8 */}
        <Link
            href="/dashboard/landlords/properties"
            className="inline-flex items-center mb-6 text-gray-500 hover:text-gray-700 transition-colors text-sm"
        >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to My Properties
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="w-full lg:w-2/3 space-y-10">
            {/* Property Overview Section */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-4">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5 text-gray-500" />
                  {locationString}
                </span>
                <span className="flex items-center">
                  <Star className="w-4 h-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                  {averageRating.toFixed(1)} ({numberOfReviews} Reviews)
                </span>
                {isVerifiedListing && (
                  <span className="text-green-600 font-medium">Verified Listing</span>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Sale Price</div>
                    <div className="font-semibold text-gray-800">
                      ${property.salePrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="relative">
                     <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 border-l border-gray-200 hidden sm:block"></span>
                    <div className="text-xs text-gray-500 mb-0.5">Bedrooms</div>
                    <div className="font-semibold text-gray-800">{property.beds} bd</div>
                  </div>
                  <div className="relative">
                     <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 border-l border-gray-200 hidden sm:block"></span>
                    <div className="text-xs text-gray-500 mb-0.5">Bathrooms</div>
                    <div className="font-semibold text-gray-800">{property.baths} ba</div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 border-l border-gray-200 hidden sm:block"></span>
                    <div className="text-xs text-gray-500 mb-0.5">Square Feet</div>
                    <div className="font-semibold text-gray-800">
                      {property.squareFeet.toLocaleString()} sq ft
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">About {property.name}</h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                {property.description}
              </p>
            </div>

                        {property.amenities && property.amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {property.amenities.map((highlight, index) => {
                    const HighlightIcon = HighlightVisuals[highlight]?.icon || HighlightVisuals.DEFAULT.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center text-center border border-gray-200 rounded-lg py-5 px-3"
                      >
                        <HighlightIcon className="w-7 h-7 mb-2 text-gray-600" />
                        <span className="text-xs text-gray-700">{highlight}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Highlights Section */}
            {property.highlights && property.highlights.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Highlights</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {property.highlights.map((highlight, index) => {
                    const HighlightIcon = HighlightVisuals[highlight]?.icon || HighlightVisuals.DEFAULT.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center text-center border border-gray-200 rounded-lg py-5 px-3"
                      >
                        <HighlightIcon className="w-7 h-7 mb-2 text-gray-600" />
                        <span className="text-xs text-gray-700">{highlight}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fees and Policies Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Fees and Policies</h2>
              <p className="text-xs text-gray-500 mb-4">
                The fees below are based on community-supplied data and may exclude additional fees and utilities.
              </p>
              <Tabs defaultValue="required-fees" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-md p-1">
                  <TabsTrigger value="required-fees" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Required Fees</TabsTrigger>
                  <TabsTrigger value="pets" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Pets</TabsTrigger>
                  <TabsTrigger value="parking" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Parking</TabsTrigger>
                </TabsList>
                <TabsContent value="required-fees" className="pt-5 text-sm">
                  <p className="font-medium text-gray-700 mb-3">One time move in fees</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Application Fee</span>
                      <span>${applicationFee}</span>
                    </div>
                    <Separator/>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Security Deposit</span>
                      <span>${securityDeposit}</span>
                    </div>
                    {property.HOAFees !== null && property.HOAFees !== undefined && (
                        <>
                            <Separator/>
                            <div className="flex justify-between items-center text-gray-600">
                                <span>HOA Fees (Monthly)</span>
                                <span>${property.HOAFees.toLocaleString()}</span>
                            </div>
                        </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="pets" className="pt-5 text-sm">
                  <p className="font-medium text-gray-700">
                    Pets are {isPetsAllowed ? "allowed" : "not allowed"}.
                  </p>
                </TabsContent>
                <TabsContent value="parking" className="pt-5 text-sm">
                  <p className="font-medium text-gray-700">
                    Parking is {isParkingIncluded ? "included" : "not included"}.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Map and Location Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Map and Location</h2>
              {(!property.location || !property.location.coordinates) && (
                 <p className="text-xs text-gray-500 mb-3">
                    Location coordinates are not available for this property. Map cannot be displayed.
                 </p>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1.5 text-gray-500 flex-shrink-0" />
                Property Address:
                <span className="ml-1 font-medium text-gray-800">{fullAddress}</span>
              </div>
              {property.location?.coordinates && (
                <div className="mt-4 h-[250px] rounded-lg bg-gray-200 flex items-center justify-center text-gray-500">
                  Map would be displayed here
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Contact Widget) */}
          <div className="w-full lg:w-1/3 lg:sticky top-8 h-fit">
            <div className="bg-white border border-primary-200 rounded-2xl p-7 h-fit min-w-[300px]">
                  {/* Contact Property */}
                  <div className="flex items-center gap-5 mb-4 border border-primary-200 p-4 rounded-xl">
                    <div className="flex items-center p-4 bg-primary-900 rounded-full">
                      <Phone className="text-primary-50" size={15} />
                    </div>
                    <div>
                      <p>Phone Number to Display</p>
                      <div className="text-lg font-bold text-primary-800">
                        (424) 340-5574
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-primary-700 text-white hover:bg-primary-600"
                    onClick={()=>{}}
                  >
                    Edit Property
                  </Button>
            
                  <hr className="my-4" />
                  <div className="text-sm">
                    <div className="text-primary-600 mb-1">Language: English, Bahasa.</div>
                    <div className="text-primary-600">
                      Open by appointment on Monday - Sunday
                    </div>
                  </div>
                </div>
          </div>
        </div>
      </div>

      {authUser && propertyIdForModal && (
        <ApplicationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={propertyIdForModal}
        />
      )}
    </div>
  );
};

export default SellerPropertyDetailsPage;