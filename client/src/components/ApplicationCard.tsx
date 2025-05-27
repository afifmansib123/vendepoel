import { Mail, MapPin, PhoneCall } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

// Define interfaces for better type safety (assuming these structures)
interface ContactDetails {
  name: string;
  phoneNumber: string;
  email: string;
  profileImageUrl?: string; // Optional profile image URL
}

interface PropertyLocation {
  city: string;
  country: string;
  address?: string; // Optional
}

interface PropertyDetails {
  id: string | number; // For keys or links
  name: string;
  photoUrls?: string[];
  location: PropertyLocation;
  pricePerMonth: number | string;
}

interface LeaseDetails {
  startDate?: string | Date;
  endDate?: string | Date;
  nextPaymentDate?: string | Date;
}

interface ApplicationData {
  id: string | number;
  property: PropertyDetails;
  status: "Approved" | "Denied" | "Pending" | string; // Allow for other statuses
  tenant: ContactDetails;      // Details of the applicant/tenant
  manager?: ContactDetails;     // Details of the property manager/landlord representative
  // landlord?: ContactDetails; // If you have a distinct landlord entity on the application
  lease?: LeaseDetails;
  applicationDate?: string | Date; // Assuming this might exist from previous context
}

export interface ApplicationCardProps {
  application: ApplicationData;
  userType: "manager" | "landlord" | "tenant" | "buyer" | "masteradmin" | string;
  children?: React.ReactNode;
}

const ApplicationCard = ({
  application,
  userType,
  children,
}: ApplicationCardProps) => {
  const [imgSrc, setImgSrc] = useState(
    application.property.photoUrls?.[0] || "/placeholder.jpg"
  );

  const statusColor =
    application.status === "Approved"
      ? "bg-green-500"
      : application.status === "Denied"
      ? "bg-red-500"
      : application.status === "Pending" // Assuming 'Pending' is also a primary status
      ? "bg-yellow-500"
      : "bg-gray-500"; // Default for other statuses

  const fallbackContact: ContactDetails = {
    name: "N/A",
    phoneNumber: "N/A",
    email: "N/A",
    profileImageUrl: "/placeholder-avatar.png", // A generic avatar placeholder
  };

  let primaryContact: ContactDetails = fallbackContact;
  let primaryContactLabel: string = "";
  let secondaryContact: ContactDetails | null = null;
  let secondaryContactLabel: string = "";

  if (userType === "manager" || userType === "landlord") {
    primaryContact = application.tenant || fallbackContact;
    primaryContactLabel = "Tenant";
  } else if (userType === "tenant" || userType === "buyer") {
    primaryContact = application.manager || fallbackContact; // Assuming manager has landlord/property owner info
    primaryContactLabel = "Manager / Property Contact";
  } else if (userType === "masteradmin") {
    primaryContact = application.tenant || fallbackContact;
    primaryContactLabel = "Tenant";
    secondaryContact = application.manager || fallbackContact;
    secondaryContactLabel = "Manager / Property Contact";
  } else {
    // Default behavior for unknown user types (e.g., show property contact)
    primaryContact = application.manager || fallbackContact;
    primaryContactLabel = "Manager / Property Contact";
    console.warn(`ApplicationCard: Unknown userType "${userType}"`);
  }

  const formatDate = (dateInput?: string | Date): string => {
    if (!dateInput) return "N/A";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "N/A"; // Check for Invalid Date
    return date.toLocaleDateString();
  };

  const ContactSection = ({ contact, label }: { contact: ContactDetails, label: string }) => (
    <div className="flex flex-col justify-start gap-5 w-full lg:basis-3/12 lg:h-48 py-2">
      <div>
        <div className="text-lg font-semibold">{label}</div>
        <hr className="mt-3" />
      </div>
      <div className="flex gap-4 items-start">
        <Image
          src={contact.profileImageUrl || "/landing-i1.png"} // Use contact-specific image or fallback
          alt={contact.name}
          width={40}
          height={40}
          className="rounded-full mr-2 min-w-[40px] min-h-[40px] object-cover"
        />
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{contact.name}</div>
          {contact.phoneNumber && contact.phoneNumber !== "N/A" && (
            <div className="text-sm flex items-center text-primary-600">
              <PhoneCall className="w-5 h-5 mr-2 flex-shrink-0" />
              {contact.phoneNumber}
            </div>
          )}
          {contact.email && contact.email !== "N/A" && (
            <div className="text-sm flex items-center text-primary-600">
              <Mail className="w-5 h-5 mr-2 flex-shrink-0" />
              {contact.email}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm bg-white mb-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between px-6 md:px-4 py-6 gap-6 lg:gap-4">
        {/* Property Info Section */}
        <div className="flex flex-col lg:flex-row gap-5 w-full lg:w-auto">
          <Image
            src={imgSrc}
            alt={application.property.name}
            width={200}
            height={150}
            className="rounded-xl object-cover w-full lg:w-[200px] h-[150px]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgSrc("/placeholder.jpg")}
          />
          <div className="flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold my-2">
                {application.property.name}
              </h2>
              <div className="flex items-center mb-2 text-gray-600">
                <MapPin className="w-5 h-5 mr-1 flex-shrink-0" />
                <span>{`${application.property.location.city}, ${application.property.location.country}`}</span>
              </div>
            </div>
            <div className="text-xl font-semibold">
              ${application.property.pricePerMonth}{" "}
              <span className="text-sm font-normal text-gray-600">/ month</span>
            </div>
          </div>
        </div>

        {/* Divider - visible only on desktop */}
        <div className="hidden lg:block border-[0.5px] border-primary-200 h-48" />

        {/* Status Section */}
        <div className="flex flex-col justify-between w-full lg:basis-2/12 lg:h-48 py-2 gap-3 lg:gap-0">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status:</span>
              <span
                className={`px-2 py-1 ${statusColor} text-white rounded-full text-sm font-medium`}
              >
                {application.status}
              </span>
            </div>
            <hr className="my-3" /> {/* Consistent margin */}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Start Date:</span>{" "}
            {formatDate(application.lease?.startDate)}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">End Date:</span>{" "}
            {formatDate(application.lease?.endDate)}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Next Payment:</span>{" "}
            {formatDate(application.lease?.nextPaymentDate)}
          </div>
        </div>

        {/* Divider - visible only on desktop */}
        <div className="hidden lg:block border-[0.5px] border-primary-200 h-48" />

        {/* Primary Contact Person Section */}
        <ContactSection contact={primaryContact} label={primaryContactLabel} />

        {/* Secondary Contact Person Section (for Master Admin) */}
        {userType === "masteradmin" && secondaryContact && (
          <>
            {/* Divider - visible only on desktop */}
            <div className="hidden lg:block border-[0.5px] border-primary-200 h-48" />
            <ContactSection contact={secondaryContact} label={secondaryContactLabel} />
          </>
        )}
      </div>

      {/* Children prop for additional actions/buttons */}
      {children && <hr className="my-4" />}
      {children}
    </div>
  );
};

export default ApplicationCard;