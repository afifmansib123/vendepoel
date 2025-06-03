"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCheckBig, Download, File, Hospital, User, Building, Calendar, DollarSign, Phone, Mail, MapPin, Eye } from "lucide-react";
import React, { useState } from "react";

// Dummy data - in real app this would come from your API
const applicationsData = [
  {
    id: 1,
    applicationType: "viewing_request",
    status: "Pending",
    applicationDate: "2024-05-28T10:30:00Z",
    requester: {
      id: 101,
      type: "buyer",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1-555-0123",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
    },
    property: {
      id: 201,
      title: "Modern Downtown Condo",
      address: "1234 Main Street, Apt 5B, Downtown, NY 10001",
      type: "Condo",
      bedrooms: 2,
      bathrooms: 2,
      price: 850000,
      images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400"]
    },
    requestDetails: {
      preferredDates: ["2024-06-05", "2024-06-06", "2024-06-07"],
      timeSlots: ["10:00 AM - 12:00 PM", "2:00 PM - 4:00 PM"],
      message: "Hi, I'm very interested in this property. I'm available for viewing this week. I have pre-approval for up to $900k.",
      partySize: 2,
      preApprovalAmount: 900000
    }
  },
  {
    id: 2,
    applicationType: "agent_sale_request",
    status: "Approved",
    applicationDate: "2024-05-25T14:15:00Z",
    requester: {
      id: 102,
      type: "agent",
      name: "Michael Chen",
      email: "michael.chen@luxuryrealty.com",
      phone: "+1-555-0456",
      company: "Luxury Realty Group",
      licenseNumber: "RE-789456",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
    },
    property: {
      id: 202,
      title: "Luxury Penthouse Suite",
      address: "567 Park Avenue, Penthouse, Upper East Side, NY 10065",
      type: "Penthouse",
      bedrooms: 4,
      bathrooms: 3,
      price: 2500000,
      images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400"]
    },
    requestDetails: {
      serviceType: "exclusive_listing",
      proposedCommission: 5.5,
      marketingPlan: "Full digital marketing, professional photography, virtual tours, open houses",
      estimatedTimeframe: "3-6 months",
      message: "I specialize in luxury properties in this area. I have 3 similar properties sold in the past 6 months with average 95% of asking price."
    }
  },
  {
    id: 3,
    applicationType: "viewing_request",
    status: "Denied",
    applicationDate: "2024-05-20T09:45:00Z",
    requester: {
      id: 103,
      type: "buyer",
      name: "David Miller",
      email: "david.miller@email.com",
      phone: "+1-555-0789",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    },
    property: {
      id: 203,
      title: "Charming Brooklyn Townhouse",
      address: "789 Oak Street, Brooklyn, NY 11201",
      type: "Townhouse",
      bedrooms: 3,
      bathrooms: 2,
      price: 1200000,
      images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"]
    },
    requestDetails: {
      preferredDates: ["2024-05-25", "2024-05-26"],
      timeSlots: ["9:00 AM - 11:00 AM"],
      message: "Looking for a family home in Brooklyn. Can we schedule a viewing?",
      partySize: 4,
      preApprovalAmount: 1000000
    },
    denialReason: "Pre-approval amount below asking price range"
  },
  {
    id: 4,
    applicationType: "agent_rental_request",
    status: "Pending",
    applicationDate: "2024-05-30T16:20:00Z",
    requester: {
      id: 104,
      type: "agent",
      name: "Emily Rodriguez",
      email: "emily.rodriguez@metrorentals.com",
      phone: "+1-555-0321",
      company: "Metro Rentals NYC",
      licenseNumber: "RE-654321",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
    },
    property: {
      id: 204,
      title: "Spacious Midtown Apartment",
      address: "456 Broadway, Apt 12A, Midtown, NY 10018",
      type: "Apartment",
      bedrooms: 1,
      bathrooms: 1,
      price: 3200,
      priceType: "monthly_rent",
      images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400"]
    },
    requestDetails: {
      serviceType: "rental_management",
      proposedCommission: 12,
      commissionType: "percentage_annual_rent",
      services: ["Tenant screening", "Rent collection", "Maintenance coordination", "Legal compliance"],
      message: "I manage 50+ rental properties in Midtown. I can guarantee 95% occupancy rate and handle all tenant relations.",
      averageVacancyPeriod: "14 days"
    }
  },
  {
    id: 5,
    applicationType: "viewing_request",
    status: "Approved",
    applicationDate: "2024-05-29T11:00:00Z",
    requester: {
      id: 105,
      type: "buyer",
      name: "Jennifer Lee",
      email: "jennifer.lee@email.com",
      phone: "+1-555-0654",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
    },
    property: {
      id: 205,
      title: "Waterfront Studio Loft",
      address: "321 Riverside Drive, Studio 8, West Side, NY 10025",
      type: "Studio",
      bedrooms: 0,
      bathrooms: 1,
      price: 650000,
      images: ["https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400"]
    },
    requestDetails: {
      preferredDates: ["2024-06-03", "2024-06-04"],
      timeSlots: ["1:00 PM - 3:00 PM", "4:00 PM - 6:00 PM"],
      message: "I'm a first-time buyer looking for a studio with river views. This property looks perfect!",
      partySize: 1,
      preApprovalAmount: 700000,
      scheduledDateTime: "2024-06-03T13:00:00Z"
    }
  }
];

const LandlordApplications = () => {
  const [activeTab, setActiveTab] = useState("all");

  const handleStatusChange = async (id, status) => {
    // In real app, this would call your API
    console.log(`Updating application ${id} to status: ${status}`);
  };

  const formatPrice = (price, type = "sale") => {
    if (type === "monthly_rent") {
      return `$${price.toLocaleString()}/month`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getApplicationTypeLabel = (type) => {
    switch (type) {
      case "viewing_request": return "Property Viewing";
      case "agent_sale_request": return "Sale Listing";
      case "agent_rental_request": return "Rental Management";
      default: return "Application";
    }
  };

  const getApplicationIcon = (type) => {
    switch (type) {
      case "viewing_request": return <Eye className="w-5 h-5" />;
      case "agent_sale_request": return <DollarSign className="w-5 h-5" />;
      case "agent_rental_request": return <Building className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const ApplicationCard = ({ application, children }) => (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <img
              src={application.requester.avatar}
              alt={application.requester.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {application.requester.name}
              </h3>
              <p className="text-sm text-gray-600">
                {application.requester.type === "agent" ? application.requester.company : "Buyer"}
              </p>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                {getApplicationIcon(application.applicationType)}
                <span className="ml-1">{getApplicationTypeLabel(application.applicationType)}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              application.status === "Approved" 
                ? "bg-green-100 text-green-800"
                : application.status === "Denied"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {application.status}
            </span>
          </div>
        </div>
      </div>

      {/* Property Info */}
      <div className="p-6 bg-gray-50">
        <div className="flex items-start space-x-4">
          <img
            src={application.property.images[0]}
            alt={application.property.title}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{application.property.title}</h4>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {application.property.address}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>{application.property.bedrooms} bed</span>
              <span>{application.property.bathrooms} bath</span>
              <span className="font-semibold text-gray-900">
                {formatPrice(application.property.price, application.property.priceType)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="p-6">
        <div className="mb-4">
          <p className="text-gray-700">{application.requestDetails.message}</p>
        </div>

        {/* Specific details based on application type */}
        {application.applicationType === "viewing_request" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Preferred Dates:</span>
              <p className="text-gray-600">{application.requestDetails.preferredDates.join(", ")}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Party Size:</span>
              <p className="text-gray-600">{application.requestDetails.partySize} people</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Pre-approval:</span>
              <p className="text-gray-600">${application.requestDetails.preApprovalAmount.toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Time Slots:</span>
              <p className="text-gray-600">{application.requestDetails.timeSlots.join(", ")}</p>
            </div>
          </div>
        )}

        {application.applicationType === "agent_sale_request" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Service Type:</span>
              <p className="text-gray-600 capitalize">{application.requestDetails.serviceType.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Proposed Commission:</span>
              <p className="text-gray-600">{application.requestDetails.proposedCommission}%</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Estimated Timeframe:</span>
              <p className="text-gray-600">{application.requestDetails.estimatedTimeframe}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Marketing Plan:</span>
              <p className="text-gray-600">{application.requestDetails.marketingPlan}</p>
            </div>
          </div>
        )}

        {application.applicationType === "agent_rental_request" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Commission:</span>
              <p className="text-gray-600">{application.requestDetails.proposedCommission}% annual rent</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Avg. Vacancy Period:</span>
              <p className="text-gray-600">{application.requestDetails.averageVacancyPeriod}</p>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Services Included:</span>
              <p className="text-gray-600">{application.requestDetails.services.join(", ")}</p>
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <div className="flex items-center">
            <Phone className="w-4 h-4 mr-1" />
            {application.requester.phone}
          </div>
          <div className="flex items-center">
            <Mail className="w-4 h-4 mr-1" />
            {application.requester.email}
          </div>
        </div>
      </div>

      {children}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
        <p className="text-gray-600 mt-2">View and manage applications for your properties</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>

        {["all", "pending", "approved", "denied"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-6">
            {applicationsData
              .filter(application => 
                tabValue === "all" || application.status.toLowerCase() === tabValue
              )
              .map((application) => (
                <ApplicationCard key={application.id} application={application}>
                  <div className="flex justify-between gap-5 w-full pb-4 px-6">
                    {/* Status Section */}
                    <div className={`p-4 grow rounded-md ${
                      application.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : application.status === "Denied"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      <div className="flex flex-wrap items-center">
                        <File className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="mr-2">
                          Application submitted on{" "}
                          {new Date(application.applicationDate).toLocaleDateString()}
                        </span>
                        <CircleCheckBig className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className={`font-semibold ${
                          application.status === "Approved"
                            ? "text-green-800"
                            : application.status === "Denied"
                            ? "text-red-800"
                            : "text-yellow-800"
                        }`}>
                          {application.status === "Approved" && "This application has been approved."}
                          {application.status === "Denied" && (
                            application.denialReason 
                              ? `Denied: ${application.denialReason}`
                              : "This application has been denied."
                          )}
                          {application.status === "Pending" && "This application is pending review."}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-gray-50">
                        <Hospital className="w-5 h-5 mr-2" />
                        Property Details
                      </button>

                      {application.status === "Approved" && (
                        <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-gray-50">
                          <Download className="w-5 h-5 mr-2" />
                          Download Agreement
                        </button>
                      )}

                      {application.status === "Pending" && (
                        <>
                          <button
                            className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-500"
                            onClick={() => handleStatusChange(application.id, "Approved")}
                          >
                            Approve
                          </button>
                          <button
                            className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-500"
                            onClick={() => handleStatusChange(application.id, "Denied")}
                          >
                            Deny
                          </button>
                        </>
                      )}

                      {application.status === "Denied" && (
                        <button className="bg-gray-800 text-white py-2 px-4 rounded-md flex items-center justify-center hover:bg-gray-700">
                          <User className="w-5 h-5 mr-2" />
                          Contact User
                        </button>
                      )}
                    </div>
                  </div>
                </ApplicationCard>
              ))}

            {applicationsData.filter(application => 
              tabValue === "all" || application.status.toLowerCase() === tabValue
            ).length === 0 && (
              <div className="text-center p-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No {tabValue === "all" ? "" : tabValue + " "}applications found.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default LandlordApplications;