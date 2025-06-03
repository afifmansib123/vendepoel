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
  // Icons for highlights and amenities (from original)
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
  // New Icons
  User,
  Mail,
  CalendarDays,
  UserCheck,
} from "lucide-react";

import Loading from "@/components/Loading"; // Assuming this path is correct
import { Button } from "@/components/ui/button"; // Assuming this path is correct
import { Separator } from "@/components/ui/separator"; // Assuming this path is correct
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming this path is correct
// Carousel import is not used for top image gallery in the provided code, using custom logic.
// If you have a Carousel component for the top images, ensure it's correctly used or remove the import if not.

// ... existing lucide-react imports
import {

  // ADD THESE NEW ICONS:
  Wrench,
  Banknote,
  ClipboardList
} from "lucide-react";
import { useGetAuthUserQuery } from "@/state/api";

// Define the expected shape of seller information
interface SellerInfo {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  // Add other relevant seller details if available from your API
}

// Updated property data interface
interface SellerPropertyDetail {
  _id: string;
  id: number; // Assuming this is a unique numeric ID from your backend, distinct from _id
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
  // allowBuyerApplications: boolean; // This was for the old application system
  preferredFinancingInfo?: string;
  insuranceRecommendation?: string;
  sellerCognitoId: string; // May still be useful for backend logic
  photoUrls: string[];
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
  averageRating?: number;
  numberOfReviews?: number;
  applicationFee?: number; // Retained for "Fees and Policies"
  securityDeposit?: number; // Retained for "Fees and Policies"
  isPetsAllowed?: boolean;
  isParkingIncluded?: boolean;
  seller?: SellerInfo; // Added seller information
}

const HighlightVisuals: Record<string, { icon: React.ElementType }> = {
  "Air Conditioning": { icon: Snowflake },
  Heating: { icon: Flame },
  "Hardwood Floors": { icon: Home },
  Carpet: { icon: Home },
  "Tile Floors": { icon: Home },
  "High Ceilings": { icon: ArrowLeft },
  "Walk-in Closet": { icon: Home },
  Balcony: { icon: Sun },
  Patio: { icon: Sun },
  Fireplace: { icon: Flame },
  "Bay Windows": { icon: Sun },
  Skylight: { icon: Sun },
  "Ceiling Fans": { icon: Wind },
  "Updated Kitchen": { icon: ChefHat },
  "Stainless Steel Appliances": { icon: ChefHat },
  "Granite Countertops": { icon: ChefHat },
  Dishwasher: { icon: ChefHat },
  Microwave: { icon: ChefHat },
  Refrigerator: { icon: ChefHat },
  "Washer/Dryer": { icon: Wind },
  "Laundry Room": { icon: Wind },
  "In-Unit Laundry": { icon: Wind },
  "High-Speed Internet": { icon: Wifi },
  "WiFi Included": { icon: Wifi },
  "Cable Ready": { icon: Tv },
  "Smart Home Features": { icon: Home },
  "Security System": { icon: Shield },
  "Video Surveillance": { icon: Camera },
  "Keyless Entry": { icon: Lock },
  Garage: { icon: Car },
  "Covered Parking": { icon: Car },
  "Street Parking": { icon: Car },
  "Parking Included": { icon: Car },
  "EV Charging": { icon: Car },
  "Swimming Pool": { icon: Waves },
  "Hot Tub": { icon: Waves },
  Garden: { icon: Trees },
  "Landscaped Yard": { icon: Trees },
  Deck: { icon: Sun },
  "Rooftop Access": { icon: Sun },
  "Outdoor Space": { icon: Trees },
  "Fitness Center": { icon: Dumbbell },
  Gym: { icon: Dumbbell },
  "Business Center": { icon: Coffee },
  "Conference Room": { icon: Users },
  "Lounge Area": { icon: Coffee },
  "Game Room": { icon: Gamepad2 },
  Library: { icon: Coffee },
  Concierge: { icon: Users },
  "24/7 Security": { icon: Shield },
  "Controlled Access": { icon: Lock },
  Elevator: { icon: ArrowLeft },
  "Pet Friendly": { icon: Dog },
  "Dog Park": { icon: Dog },
  "Pet Wash Station": { icon: Dog },
  Playground: { icon: Baby },
  "Family Friendly": { icon: Users },
  "Child Care": { icon: Baby },
  "Wheelchair Accessible": { icon: Users },
  "Handicap Accessible": { icon: Users },
  "Emergency Exits": { icon: Shield },
  "Fire Safety": { icon: Shield },
  "Smoke Free": { icon: Wind },
  "Non Smoking": { icon: Wind },
  DEFAULT: { icon: Star },
};

// --- ScheduleVisitModal Component ---
interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  propertyId: string | number; // Can be _id or id
  sellerEmail?: string; // Optional: to prefill or use in notification
}

const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  isOpen,
  onClose,
  propertyName,
  // propertyId, // Potentially use for submission
  // sellerEmail, // Potentially use for submission
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual submission logic (e.g., API call to backend)
    console.log("Visit Request Submitted:", {
      propertyName,
      // propertyId,
      // sellerEmail,
      ...formData,
    });
    alert(
      `Visit request for "${propertyName}" submitted! The seller will contact you.`
    );
    onClose(); // Close modal after submission
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalFadeIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Schedule a Visit
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-6 h-6" />{" "}
            {/* Assuming XIcon, or use a simple 'X' */}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Interested in <span className="font-medium">{propertyName}</span>?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Fill out the form below, and the seller will contact you to confirm
          the details.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              onChange={handleChange}
              value={formData.name}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                onChange={handleChange}
                value={formData.email}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                onChange={handleChange}
                value={formData.phone}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="preferredDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Preferred Date
              </label>
              <input
                type="date"
                name="preferredDate"
                id="preferredDate"
                required
                onChange={handleChange}
                value={formData.preferredDate}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <label
                htmlFor="preferredTime"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Preferred Time
              </label>
              <input
                type="time"
                name="preferredTime"
                id="preferredTime"
                required
                onChange={handleChange}
                value={formData.preferredTime}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message (Optional)
            </label>
            <textarea
              name="message"
              id="message"
              rows={3}
              onChange={handleChange}
              value={formData.message}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
            ></textarea>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Request Visit
            </Button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modalFadeIn {
          animation: modalFadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
// Simple X Icon component, replace with lucide X if preferred
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"
    ></path>
  </svg>
);

// --- RequestMaintenanceModal Component ---
interface RequestMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  propertyId: string | number;
}

const RequestMaintenanceModal: React.FC<RequestMaintenanceModalProps> = ({
  isOpen,
  onClose,
  propertyName,
  // propertyId, // Potentially use for submission
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    requestType: "inspection", // Default value
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Maintenance Request Submitted:", {
      propertyName,
      // propertyId,
      ...formData,
    });
    alert(
      `Maintenance/inspection request for "${propertyName}" submitted!`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalFadeIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Request Maintenance / Inspection
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Need to check something for <span className="font-medium">{propertyName}</span>?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Describe your request, and we'll coordinate with the relevant services.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="maintenance-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>
            <input
              type="text"
              name="name"
              id="maintenance-name"
              required
              onChange={handleChange}
              value={formData.name}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="maintenance-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="maintenance-email"
                required
                onChange={handleChange}
                value={formData.email}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
            <div>
              <label
                htmlFor="maintenance-phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="maintenance-phone"
                onChange={handleChange}
                value={formData.phone}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="requestType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type of Request
            </label>
            <select
              name="requestType"
              id="requestType"
              required
              onChange={handleChange}
              value={formData.requestType}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
            >
              <option value="inspection">Property Inspection</option>
              <option value="repair_query">Repair Query (e.g., AC, Plumbing)</option>
              <option value="general_maintenance">General Maintenance Question</option>
              <option value="cosmetic_changes">Cosmetic Changes Inquiry</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="maintenance-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description of Request
            </label>
            <textarea
              name="description"
              id="maintenance-description"
              rows={3}
              required
              onChange={handleChange}
              value={formData.description}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              placeholder="E.g., 'Interested in inspecting the roof condition' or 'Enquiring about possibility of fixing the leaky faucet in kitchen.'"
            ></textarea>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </div>
      {/* Keep the style tag if it's not already global or in ScheduleVisitModal */}
      <style jsx global>{`
        @keyframes modalFadeInMaintenance { /* Use a unique animation name if needed */
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modalFadeIn { /* Or use a more generic class if animation is the same */
          animation: modalFadeInMaintenance 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
// --- End RequestMaintenanceModal Component ---

// --- RequestFinancialServicesModal Component ---
interface RequestFinancialServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
  propertyId: string | number;
}

const RequestFinancialServicesModal: React.FC<RequestFinancialServicesModalProps> = ({
  isOpen,
  onClose,
  propertyName,
  // propertyId, // Potentially use for submission
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    inquiryType: "mortgage_preapproval", // Default value
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Financial Services Inquiry Submitted:", {
      propertyName,
      // propertyId,
      ...formData,
    });
    alert(
      `Financial services inquiry for "${propertyName}" submitted! Our partners will contact you.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalFadeIn">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Inquire About Financial Services
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          Considering <span className="font-medium">{propertyName}</span>?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Let us connect you with our financial partners for mortgages, loans, or advice.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="financial-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>
            <input
              type="text"
              name="name"
              id="financial-name"
              required
              onChange={handleChange}
              value={formData.name}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="financial-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="financial-email"
                required
                onChange={handleChange}
                value={formData.email}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
            <div>
              <label
                htmlFor="financial-phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                id="financial-phone"
                onChange={handleChange}
                value={formData.phone}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="inquiryType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type of Inquiry
            </label>
            <select
              name="inquiryType"
              id="inquiryType"
              required
              onChange={handleChange}
              value={formData.inquiryType}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
            >
              <option value="mortgage_preapproval">Mortgage Pre-approval</option>
              <option value="loan_options">Loan Options & Rates</option>
              <option value="financial_advice">General Financial Advice</option>
              <option value="investment_potential">Investment Potential Inquiry</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="financial-message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message (Optional)
            </label>
            <textarea
              name="message"
              id="financial-message"
              rows={3}
              onChange={handleChange}
              value={formData.message}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
              placeholder="Any specific questions or details you'd like to share?"
            ></textarea>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Submit Inquiry
            </Button>
          </div>
        </form>
      </div>
      {/* Keep the style tag if it's not already global or in ScheduleVisitModal */}
      <style jsx global>{`
        @keyframes modalFadeInFinancial { /* Use a unique animation name if needed */
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modalFadeIn { /* Or use a more generic class if animation is the same */
          animation: modalFadeInFinancial 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
// --- End ScheduleVisitModal Component ---

const MarketplacePropertyDetailsPage = () => {
    const {data : user} = useGetAuthUserQuery()
  const params = useParams();
  const router = useRouter();
  const propertyIdParams = params.id as string;

  const [property, setProperty] = useState<SellerPropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isScheduleVisitModalOpen, setIsScheduleVisitModalOpen] =
    useState(false);

  // ADD THESE STATES:
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isFinancialServicesModalOpen, setIsFinancialServicesModalOpen] = useState(false);

  useEffect(() => {
    if (!propertyIdParams) {
      // Simplified check, assuming ID is always a string from params
      setError("Invalid Property ID.");
      setIsLoading(false);
      return;
    }
    const fetchPropertyDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure this API endpoint returns the SellerPropertyDetail structure, including `seller` object
        const response = await fetch(
          `/api/seller-properties/${propertyIdParams}`
        );
        if (!response.ok) {
          if (response.status === 404) throw new Error("Property not found.");
          throw new Error(`Failed to fetch property: ${response.statusText}`);
        }
        const data: SellerPropertyDetail = await response.json();

        // For demonstration, if seller info is not in API, you can mock it here or ensure API provides it
        // Example of adding mock seller if not present:
        // if (!data.seller) {
        //   data.seller = {
        //     name: "Mock Seller Agency",
        //     email: "contact@mockseller.com",
        //     phone: "555-000-1111",
        //     companyName: "Real Estate Mock Inc."
        //   };
        // }

        setProperty(data);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPropertyDetails();
  }, [propertyIdParams]);

  const handlePrevImage = () => {
    if (property && property.photoUrls.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? property.photoUrls.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (property && property.photoUrls.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === property.photoUrls.length - 1 ? 0 : prev + 1
      );
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="text-2xl font-semibold mb-2 text-red-600">Error</h2>
        <p className="text-red-500 mb-6">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  if (!property)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h2 className="text-2xl font-semibold mb-2">Not Found</h2>
        <p className="text-gray-600 mb-6">Property not found.</p>
        <Button onClick={() => router.push("/seller-marketplace")}>
          Back to Marketplace
        </Button>
      </div>
    );

  const locationString = property.location
    ? `${property.location.city || ""}${
        property.location.city && property.location.state ? ", " : ""
      }${property.location.state || ""}${
        (property.location.city || property.location.state) &&
        property.location.country
          ? ", "
          : ""
      }${property.location.country || ""}`
        .trim()
        .replace(/,$/, "") || "N/A"
    : "N/A";
  const fullAddress = property.location
    ? `${property.location.address || ""}${
        property.location.address ? ", " : ""
      }${property.location.city || ""}${property.location.city ? ", " : ""}${
        property.location.state || ""
      }${property.location.state ? " " : ""}${
        property.location.postalCode || ""
      }`
        .trim()
        .replace(/,$/, "") || "N/A"
    : "N/A";
  const averageRating = property.averageRating || 0.0;
  const numberOfReviews = property.numberOfReviews || 0;
  const isVerifiedListing = property.propertyStatus === "For Sale"; // Or any other status that means verified
  const applicationFee = property.applicationFee || 100;
  const securityDeposit = property.securityDeposit || 500;
  const isPetsAllowed =
    property.isPetsAllowed !== undefined ? property.isPetsAllowed : true;
  const isParkingIncluded =
    property.isParkingIncluded !== undefined
      ? property.isParkingIncluded
      : true;

  const handleRequestSellerDetails = () => {
    if (!property) {
      alert("Property details are not loaded yet.");
      return;
    }

    const recipientEmail = "abc@gmail.com";
    const subject = `Inquiry about Property: ${property.name}`;
    const body = `
Hello,

I am interested in learning more about the seller for the following property:

Property Name: ${property.name}
Property ID: ${property._id}

Please provide me with more information.

Thank you.
    `;

    // Encode subject and body for the mailto link
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body.trim()); // .replace(/\n/g, '%0D%0A') if newlines are critical

    const mailtoLink = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;

    window.location.href = mailtoLink;
  };


  return (
    <div className="bg-white min-h-screen">
      {/* Full-width Image Carousel */}
      {property.photoUrls && property.photoUrls.length > 0 ? (
        <div className="relative h-[350px] sm:h-[450px] md:h-[550px] w-full mb-8 overflow-hidden group">
          {property.photoUrls.map((imageUrl, index) => (
            <div
              key={imageUrl + index} // Use index for key if imageUrls are not guaranteed unique
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                index === currentImageIndex
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0"
              }`}
            >
              <Image
                src={imageUrl}
                alt={`${property.name} - Image ${index + 1}`}
                layout="fill"
                objectFit="cover"
                priority={index === 0}
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Link
          href="/seller-marketplace" // Changed link
          className="inline-flex items-center mb-6 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Marketplace {/* Changed text */}
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="w-full lg:w-2/3 space-y-10">
            {/* Property Overview Section */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {property.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-4">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5 text-gray-500" />
                  {locationString}
                </span>
                <span className="flex items-center">
                  <Star className="w-4 h-4 mr-1.5 text-yellow-400 fill-current" />
                  {averageRating.toFixed(1)} ({numberOfReviews} Reviews)
                </span>
                {isVerifiedListing && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Verified Listing
                  </span>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">
                      Sale Price
                    </div>
                    <div className="font-semibold text-gray-800 text-lg">
                      ${property.salePrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 border-l border-gray-200 hidden sm:block"></span>
                    <div className="text-xs text-gray-500 mb-0.5">Bedrooms</div>
                    <div className="font-semibold text-gray-800 text-lg">
                      {property.beds} bed
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 border-l border-gray-200 hidden sm:block"></span>
                    <div className="text-xs text-gray-500 mb-0.5">
                      Bathrooms
                    </div>
                    <div className="font-semibold text-gray-800 text-lg">
                      {property.baths} bathroom
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-8 border-l border-gray-200 hidden sm:block"></span>
                    <div className="text-xs text-gray-500 mb-0.5">
                      Square Feet
                    </div>
                    <div className="font-semibold text-gray-800 text-lg">
                      {property.squareFeet.toLocaleString()} sq ft
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                About {property.name}
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities Section */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Amenities
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {property.amenities.map((amenity, index) => {
                    // Renamed 'highlight' to 'amenity' for clarity
                    const AmenityIcon =
                      HighlightVisuals[amenity]?.icon ||
                      HighlightVisuals.DEFAULT.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center text-center border border-gray-200 rounded-lg py-5 px-3 hover:shadow-md transition-shadow"
                      >
                        <AmenityIcon className="w-7 h-7 mb-2 text-blue-600" />
                        <span className="text-xs text-gray-700 font-medium">
                          {amenity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Highlights Section */}
            {property.highlights && property.highlights.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Highlights
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {property.highlights.map((highlight, index) => {
                    const HighlightIcon =
                      HighlightVisuals[highlight]?.icon ||
                      HighlightVisuals.DEFAULT.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col items-center text-center border border-gray-200 rounded-lg py-5 px-3 hover:shadow-md transition-shadow"
                      >
                        <HighlightIcon className="w-7 h-7 mb-2 text-blue-600" />
                        <span className="text-xs text-gray-700 font-medium">
                          {highlight}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fees and Policies Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                Fees and Policies
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                The fees below are based on community-supplied data and may
                exclude additional fees and utilities.
              </p>
              <Tabs defaultValue="required-fees" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-md p-1">
                  <TabsTrigger
                    value="required-fees"
                    className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Required Fees
                  </TabsTrigger>
                  <TabsTrigger
                    value="pets"
                    className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Pets
                  </TabsTrigger>
                  <TabsTrigger
                    value="parking"
                    className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Parking
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="required-fees" className="pt-5 text-sm">
                  <p className="font-medium text-gray-700 mb-3">
                    One time move in fees
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Application Fee</span>
                      <span>${applicationFee}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Security Deposit</span>
                      <span>${securityDeposit}</span>
                    </div>
                    {property.HOAFees !== null &&
                      property.HOAFees !== undefined && (
                        <>
                          <Separator />
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
                  {/* You can add more details about pet policy here if available */}
                </TabsContent>
                <TabsContent value="parking" className="pt-5 text-sm">
                  <p className="font-medium text-gray-700">
                    Parking is {isParkingIncluded ? "included" : "not included"}
                    .
                  </p>
                  {/* You can add more details about parking here if available */}
                </TabsContent>
              </Tabs>
            </div>

            {/* Map and Location Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                Map and Location
              </h2>
              {(!property.location || !property.location.coordinates) && (
                <p className="text-xs text-gray-500 mb-3">
                  Location coordinates are not available for this property. Map
                  cannot be displayed.
                </p>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1.5 text-gray-500 flex-shrink-0" />
                Property Address:
                <span className="ml-1 font-medium text-gray-800">
                  {fullAddress}
                </span>
              </div>
              {property.location?.coordinates ? (
                <div className="mt-4 h-[250px] rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 border border-gray-300">
                  {/* Replace with your actual map component e.g. Google Maps, Leaflet, Mapbox */}
                  Map Placeholder (Lat:{" "}
                  {property.location.coordinates.latitude.toFixed(4)}, Lng:{" "}
                  {property.location.coordinates.longitude.toFixed(4)})
                </div>
              ) : (
                <div className="mt-4 h-[250px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                  Map not available
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Seller Info & Schedule Visit) */}
 <div className="w-full lg:w-1/3 lg:sticky top-8 h-fit space-y-6">
            {/* Seller Information Card - (Your existing card) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Seller Information
              </h3>
              <p className="text-sm text-gray-500">
                Please Request The Sellers Dealer Details if you want more
                details. For Physically Vsiting the property , Please schedule a
                visit.
              </p>
            </div>

            <Button
              onClick={handleRequestSellerDetails}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold rounded-md shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Request Seller Details
            </Button>

            {/* Schedule Visit Button - (Your existing button) */}
            <Button
              onClick={() => setIsScheduleVisitModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold rounded-md shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <CalendarDays className="w-5 h-5 mr-2" />
              Schedule a Visit
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Request a tour and the seller will contact you.
            </p>

            {/* ADD THESE NEW BUTTONS: */}
            <Separator className="my-4" /> {/* Optional: for visual separation */}

            <Button
              onClick={() => setIsMaintenanceModalOpen(true)}
              variant="outline" // Or choose another variant/style
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 py-3 text-base font-semibold rounded-md shadow-sm hover:shadow-md transition-all"
              size="lg"
            >
              <UserCheck className="w-5 h-5 mr-2" />
              Request to be an Agent
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Need to check something or inquire about repairs?
            </p>

            <Button
              onClick={() => setIsFinancialServicesModalOpen(true)}
              variant="outline" // Or choose another variant/style
              className="w-full border-green-600 text-green-600 hover:bg-green-50 py-3 text-base font-semibold rounded-md shadow-sm hover:shadow-md transition-all"
              size="lg"
            >
              <Banknote className="w-5 h-5 mr-2" />
              Inquire about Financial Services
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Explore mortgage options or get financial advice.
            </p>
          </div>
        </div>
      </div>

      {isScheduleVisitModalOpen && property && (
        <ScheduleVisitModal
          isOpen={isScheduleVisitModalOpen}
          onClose={() => setIsScheduleVisitModalOpen(false)}
          propertyName={property.name}
          propertyId={property._id} // or property.id
          sellerEmail={property.seller?.email}
        />
      )}

      {user?.userRole === "manager" && (
        <RequestMaintenanceModal
          isOpen={isMaintenanceModalOpen}
          onClose={() => setIsMaintenanceModalOpen(false)}
          propertyName={property.name}
          propertyId={property._id} // or property.id
        />
      )}

      {isFinancialServicesModalOpen && property && (
        <RequestFinancialServicesModal
          isOpen={isFinancialServicesModalOpen}
          onClose={() => setIsFinancialServicesModalOpen(false)}
          propertyName={property.name}
          propertyId={property._id} // or property.id
        />
      )}

    </div>
  );
};

export default MarketplacePropertyDetailsPage;
