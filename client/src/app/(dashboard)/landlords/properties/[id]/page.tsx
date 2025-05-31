"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  CalendarDays,
  Tag,
  Info,
  FileText,
  DollarSign,
  Home,
  ImageIcon,
  CircleCheck,
  Briefcase,
  Building2,
  ListChecks,
  Newspaper,
  Users,
  Handshake,
  Library,
  ShieldAlert,
  AlertTriangle,
  Eye, // For View Count or Inquiries (placeholder)
  MessageSquare, // For Contact Seller / Inquire
} from "lucide-react";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define the expected shape of the fetched property data
// This should match SingleSellerPropertyResponse from your API
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
  photoUrls: string[];
  agreementDocumentUrl?: string;
  postedDate: string; // Dates will be strings from JSON
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
}

const SellerPropertyDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string; // Will be string from params

  const [property, setProperty] = useState<SellerPropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId || isNaN(Number(propertyId))) {
      setError("Invalid Property ID.");
      setIsLoading(false);
      return;
    }

    const fetchPropertyDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/seller-properties/${propertyId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Property not found.");
          }
          throw new Error(`Failed to fetch property: ${response.statusText}`);
        }
        const data: SellerPropertyDetail = await response.json();
        setProperty(data);
      } catch (err: any) {
        console.error("Error fetching property details:", err);
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [propertyId]);

  if (isLoading) return <Loading />;

  if (error) {
    return (
      <div className="dashboard-container flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Property</h2>
        <p className="text-red-500 mb-6">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!property) {
    // This case should ideally be caught by the 404 in fetch, but as a fallback
    return (
      <div className="dashboard-container flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Property Not Found</h2>
        <p className="text-gray-600 mb-6">
          The property you are looking for does not exist or may have been
          removed.
        </p>
        <Button onClick={() => router.push("/")}>Go to Homepage</Button>{" "}
        {/* Adjust link as needed */}
      </div>
    );
  }

  const fullAddress = property.location
    ? `${property.location.address || ""}${
        property.location.address ? ", " : ""
      }${property.location.city || ""}${property.location.city ? ", " : ""}${
        property.location.state || ""
      }${property.location.state ? " " : ""}${
        property.location.postalCode || ""
      }`
        .trim()
        .replace(/,$/, "")
    : "Address not available";

  return (
    <div className="dashboard-container">
      {/* Back to a relevant listing page - adjust href as needed */}
      <Link
        href="/buy" // Example: Link to a page showing all properties for sale
        className="flex items-center mb-6 text-gray-600 hover:text-primary-600 transition-colors"
        scroll={false}
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        <span>Back to Properties for Sale</span>
      </Link>

      <Header
        title={property.name || "Property Details"}
        subtitle={`Explore the details of this property listed for sale.`}
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Images and Key Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Carousel */}
          {property.photoUrls && property.photoUrls.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Carousel className="w-full rounded-lg overflow-hidden">
                  <CarouselContent>
                    {property.photoUrls.map((url, index) => (
                      <CarouselItem key={index}>
                        <div className="relative aspect-video w-full">
                          <Image
                            src={url}
                            alt={`${property.name} - Image ${index + 1}`}
                            layout="fill"
                            objectFit="cover"
                            priority={index === 0}
                            className="rounded-lg"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                    {property.photoUrls.length === 0 && (
                      <CarouselItem>
                        <div className="relative aspect-video w-full bg-gray-200 flex items-center justify-center rounded-lg">
                          <ImageIcon className="w-16 h-16 text-gray-400" />
                        </div>
                      </CarouselItem>
                    )}
                  </CarouselContent>
                  {property.photoUrls.length > 1 && (
                    <>
                      <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2" />
                      <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2" />
                    </>
                  )}
                </Carousel>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex items-center justify-center aspect-video bg-gray-100 rounded-lg">
              <ImageIcon className="w-24 h-24 text-gray-400" />
              <p className="ml-4 text-gray-500">No images available</p>
            </Card>
          )}

          {/* Property Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">
                {property.name}
              </CardTitle>
              <CardDescription className="flex items-center text-lg text-gray-600 mt-1">
                <MapPin className="w-5 h-5 mr-2 text-primary-500" />
                {fullAddress}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-gray-700">
                <span className="flex items-center">
                  <BedDouble className="w-5 h-5 mr-2 text-blue-500" />{" "}
                  {property.beds} Beds
                </span>
                <span className="flex items-center">
                  <Bath className="w-5 h-5 mr-2 text-blue-500" />{" "}
                  {property.baths} Baths
                </span>
                <span className="flex items-center">
                  <Ruler className="w-5 h-5 mr-2 text-blue-500" />{" "}
                  {property.squareFeet.toLocaleString()} sq ft
                </span>
                {property.yearBuilt && (
                  <span className="flex items-center">
                    <CalendarDays className="w-5 h-5 mr-2 text-blue-500" />{" "}
                    Built: {property.yearBuilt}
                  </span>
                )}
              </div>
              <Separator />
              <p className="text-gray-700 text-md leading-relaxed">
                {property.description}
              </p>
            </CardContent>
          </Card>

          {/* Amenities and Highlights */}
          {(property.amenities.length > 0 ||
            property.highlights.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ListChecks className="w-6 h-6 mr-2 text-green-600" />{" "}
                  Features & Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-800">
                      Amenities
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {property.amenities.map((amenity, index) => (
                        <li key={`amenity-${index}`}>{amenity}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {property.highlights.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-800">
                      Highlights
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {property.highlights.map((highlight, index) => (
                        <li key={`highlight-${index}`}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Open House Dates */}
          {property.openHouseDates && property.openHouseDates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-6 h-6 mr-2 text-purple-600" /> Open House
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {property.openHouseDates.map((dateStr, index) => (
                    <li
                      key={`oh-${index}`}
                      className="flex items-center text-gray-700"
                    >
                      <CalendarDays className="w-5 h-5 mr-2 text-purple-500 flex-shrink-0" />
                      {new Date(dateStr).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Seller Notes */}
          {property.sellerNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Newspaper className="w-6 h-6 mr-2 text-yellow-600" />{" "}
                  Seller's Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {property.sellerNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Pricing, Status, Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24">
            {" "}
            {/* Sticky for nice scrolling */}
            <CardHeader>
              <CardTitle className="flex items-center text-3xl font-bold text-primary-600">
                <DollarSign className="w-8 h-8 mr-2" />
                {property.salePrice.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </CardTitle>
              <div className="flex items-center mt-2">
                <Briefcase className="w-5 h-5 mr-2 text-gray-500" />
                <Badge
                  variant={
                    property.propertyStatus === "For Sale"
                      ? "default"
                      : property.propertyStatus === "Pending"
                      ? "secondary"
                      : property.propertyStatus === "Sold"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-sm px-3 py-1"
                >
                  {property.propertyStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" /> Property Type:
                </span>
                <span className="font-semibold text-gray-800">
                  {property.propertyType}
                </span>
              </div>
              {property.HOAFees !== null && property.HOAFees !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Home className="w-5 h-5 mr-2" /> HOA Fees:
                  </span>
                  <span className="font-semibold text-gray-800">
                    ${property.HOAFees.toLocaleString()}/month
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" /> Posted:
                </span>
                <span className="font-semibold text-gray-800">
                  {new Date(property.postedDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <Handshake className="w-5 h-5 mr-2" /> Buyer Applications:
                </span>
                <span
                  className={`font-semibold ${
                    property.allowBuyerApplications
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {property.allowBuyerApplications
                    ? "Accepted"
                    : "Not Accepted"}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-4">
              {property.allowBuyerApplications &&
                property.propertyStatus === "For Sale" && (
                  <Button
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CircleCheck className="w-5 h-5 mr-2" /> Apply to Buy / Make
                    Offer
                  </Button>
                )}
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                as="a"
                href={property.agreementDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="w-5 h-5 mr-2" /> View Agreement/Disclosures
              </Button>
            </CardFooter>
          </Card>

          {property.preferredFinancingInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Library className="w-5 h-5 mr-2 text-indigo-600" /> Preferred
                  Financing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {property.preferredFinancingInfo}
                </p>
              </CardContent>
            </Card>
          )}

          {property.insuranceRecommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <ShieldAlert className="w-5 h-5 mr-2 text-orange-600" />{" "}
                  Insurance Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {property.insuranceRecommendation}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerPropertyDetailsPage;
