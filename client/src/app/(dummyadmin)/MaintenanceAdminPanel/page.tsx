"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  UserCog, 
  ClipboardList, 
  ShieldCheck, 
  Building, 
  Clock, 
  Calendar, 
  Mail, 
  Phone,
  Star,
  ListChecks,
  CheckCircle,
  XCircle,
  Hourglass
} from "lucide-react";
import React, { useState } from "react";

// Dummy Data for Maintenance Panel
const mockMaintenanceData = {
  serviceProviders: [
    {
      id: 501,
      name: "QuickFix Pros",
      contactPerson: "Mike Thompson",
      email: "contact@quickfixpros.com",
      phone: "+1-555-0501",
      specialties: ["Plumbing", "Electrical", "HVAC Repair"],
      availabilityStatus: "available",
      rating: 4.8,
      jobsCompleted: 125,
      memberSince: "2023-01-10T00:00:00Z",
      avatar: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=150" // Generic team/company
    },
    {
      id: 502,
      name: "HomeShine Cleaners",
      contactPerson: "Laura Davis",
      email: "info@homeshine.com",
      phone: "+1-555-0502",
      specialties: ["Deep Cleaning", "Pool Maintenance", "Landscaping"],
      availabilityStatus: "busy",
      rating: 4.5,
      jobsCompleted: 88,
      memberSince: "2023-05-20T00:00:00Z",
      avatar: "https://images.unsplash.com/photo-1542044012-779319977511?w=150" // Generic cleaning
    },
    {
      id: 503,
      name: "Appliance Gurus",
      contactPerson: "Kevin Lee",
      email: "support@appliancegurus.net",
      phone: "+1-555-0503",
      specialties: ["Refrigerator Repair", "Washer/Dryer Fix", "Oven Service"],
      availabilityStatus: "available",
      rating: 4.9,
      jobsCompleted: 210,
      memberSince: "2022-11-01T00:00:00Z",
      avatar: "https://images.unsplash.com/photo-1601987077677-5346c1d84c70?w=150" // Generic technician
    }
  ],
  maintenanceRequests: [
    {
      id: 601,
      propertyId: 1,
      propertyTitle: "Luxury Downtown Penthouse",
      propertyAddress: "123 Park Avenue, Manhattan, NY 10016",
      issueDescription: "Leaky faucet in master bathroom and AC unit not cooling effectively.",
      reportedDate: "2024-07-10T09:00:00Z",
      status: "pending_assignment", // pending_assignment, assigned, in_progress, completed, cancelled
      priority: "high", // low, medium, high
      assignedServiceProviderId: null,
      images: ["https://images.unsplash.com/photo-1560448204-e02f50939451?w=200"] // Example issue image
    },
    {
      id: 602,
      propertyId: 2,
      propertyTitle: "Cozy Brooklyn Apartment",
      propertyAddress: "456 Oak Street, Brooklyn, NY 11201",
      issueDescription: "Pool filter needs cleaning and backyard gate latch is broken.",
      reportedDate: "2024-07-08T14:30:00Z",
      status: "assigned",
      priority: "medium",
      assignedServiceProviderId: 502,
      assignedServiceProviderName: "HomeShine Cleaners",
      scheduledDate: "2024-07-12T10:00:00Z"
    },
    {
      id: 603,
      propertyId: 4,
      propertyTitle: "Studio Loft in SoHo",
      propertyAddress: "321 Broadway, SoHo, NY 10012",
      issueDescription: "Routine pest control service requested.",
      reportedDate: "2024-07-05T11:00:00Z",
      status: "completed",
      priority: "low",
      assignedServiceProviderId: 501,
      assignedServiceProviderName: "QuickFix Pros",
      completionDate: "2024-07-07T16:00:00Z",
      notes: "Pest control completed. No issues found."
    }
  ],
  stats: {
    totalServiceProviders: 18,
    openMaintenanceRequests: 7,
    completedJobsThisMonth: 23,
    averageJobCompletionTime: "2.5 days"
  }
};

const MaintenanceAdminPanel = () => {
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedRequestToAssign, setSelectedRequestToAssign] = useState(null);

  const handleMaintenanceAction = (itemId, action, type) => {
    console.log(`${action} ${type} ${itemId}`);
    // In a real app, this would call your API
    if (action === 'assign_provider_modal') {
        setSelectedRequestToAssign(itemId);
    }
  };

  const handleAssignProvider = (requestId, providerId) => {
    console.log(`Assigning provider ${providerId} to request ${requestId}`);
    // API call to assign
    setSelectedRequestToAssign(null); // Close modal/dropdown
  };

  const getStatusBadge = (status, type = "request") => {
    const styles = {
      // Request statuses
      pending_assignment: "bg-orange-100 text-orange-800",
      assigned: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
      // Provider statuses
      available: "bg-green-100 text-green-800",
      busy: "bg-yellow-100 text-yellow-800",
      unavailable: "bg-red-100 text-red-800",
      // Priority
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Maintenance & Services Panel</h1>
        <p className="text-gray-600 mt-2">Manage service providers and maintenance requests</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <UserCog className="w-10 h-10 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Service Providers</p>
              <p className="text-2xl font-bold text-gray-900">{mockMaintenanceData.stats.totalServiceProviders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ClipboardList className="w-10 h-10 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Maintenance Requests</p>
              <p className="text-2xl font-bold text-gray-900">{mockMaintenanceData.stats.openMaintenanceRequests}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ShieldCheck className="w-10 h-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed This Month</p>
              <p className="text-2xl font-bold text-gray-900">{mockMaintenanceData.stats.completedJobsThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Clock className="w-10 h-10 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
              <p className="text-2xl font-bold text-gray-900">{mockMaintenanceData.stats.averageJobCompletionTime}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2">
          <TabsTrigger value="requests">Maintenance Requests</TabsTrigger>
          <TabsTrigger value="providers">Service Providers</TabsTrigger>
        </TabsList>

        {/* Maintenance Requests Tab */}
        <TabsContent value="requests" className="mt-6">
          <div className="space-y-6">
            {mockMaintenanceData.maintenanceRequests.map(request => (
              <div key={request.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      {request.images && request.images[0] && (
                        <img src={request.images[0]} alt="Issue" className="w-20 h-20 rounded-lg object-cover hidden md:block" />
                      )}
                       {!request.images &&  <Building className="w-16 h-16 text-gray-300 rounded-lg p-2 border" />}
                      <div>
                        <h3 className="text-lg font-semibold">{request.propertyTitle}</h3>
                        <p className="text-gray-500 text-sm">{request.propertyAddress}</p>
                        <p className="text-gray-700 mt-2 text-sm">{request.issueDescription}</p>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:text-right space-y-1">
                        {getStatusBadge(request.status, "request")}
                        {getStatusBadge(request.priority, "priority")}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4 border-t pt-4 mt-4">
                    <div>
                      <span className="font-medium text-gray-700">Reported:</span>
                      <p className="text-gray-600">{new Date(request.reportedDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Assigned To:</span>
                      <p className="text-gray-600">
                        {request.assignedServiceProviderName || <span className="italic text-gray-400">Not Assigned</span>}
                      </p>
                    </div>
                    {request.scheduledDate && (
                      <div>
                        <span className="font-medium text-gray-700">Scheduled:</span>
                        <p className="text-gray-600">{new Date(request.scheduledDate).toLocaleString()}</p>
                      </div>
                    )}
                    {request.completionDate && (
                      <div>
                        <span className="font-medium text-gray-700">Completed:</span>
                        <p className="text-gray-600">{new Date(request.completionDate).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {request.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm flex items-center">
                      <ListChecks className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                    {request.status === "pending_assignment" && (
                      <button 
                        onClick={() => handleMaintenanceAction(request.id, "assign_provider_modal", "request")}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 text-sm flex items-center"
                      >
                        <UserCog className="w-4 h-4 mr-2" />
                        Assign Provider
                      </button>
                    )}
                    {selectedRequestToAssign === request.id && (
                        <div className="w-full md:w-auto mt-2 md:mt-0 md:ml-2">
                            <select 
                                onChange={(e) => handleAssignProvider(request.id, e.target.value)}
                                className="p-2 border border-gray-300 rounded-md text-sm w-full"
                                defaultValue=""
                            >
                                <option value="" disabled>Select a provider...</option>
                                {mockMaintenanceData.serviceProviders.filter(p => p.availabilityStatus === 'available').map(provider => (
                                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    { (request.status === "assigned" || request.status === "in_progress") && (
                      <button 
                        onClick={() => handleMaintenanceAction(request.id, "mark_completed", "request")}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-500 text-sm flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Completed
                      </button>
                    )}
                     {request.status !== "completed" && request.status !== "cancelled" && (
                         <button 
                            onClick={() => handleMaintenanceAction(request.id, "cancel_request", "request")}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-500 text-sm flex items-center"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Request
                          </button>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Service Providers Tab */}
        <TabsContent value="providers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockMaintenanceData.serviceProviders.map(provider => (
              <div key={provider.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                <div className="flex items-center mb-4">
                    <img src={provider.avatar} alt={provider.name} className="w-16 h-16 rounded-full object-cover mr-4" />
                    <div>
                        <h3 className="text-lg font-semibold">{provider.name}</h3>
                        <p className="text-sm text-gray-500">{provider.contactPerson}</p>
                    </div>
                </div>
                
                <div className="text-sm space-y-2 mb-3">
                    <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-500" /> {provider.email}</p>
                    <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-500" /> {provider.phone}</p>
                </div>

                <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                        {provider.specialties.map(spec => (
                            <span key={spec} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">{spec}</span>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 text-sm mb-3">
                    <div>
                        <span className="font-medium text-gray-700">Rating:</span>
                        <p className="text-gray-600 flex items-center">{provider.rating} <Star className="w-3 h-3 ml-1 text-yellow-500 fill-yellow-500" /></p>
                    </div>
                    <div>
                        <span className="font-medium text-gray-700">Jobs Done:</span>
                        <p className="text-gray-600">{provider.jobsCompleted}</p>
                    </div>
                     <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <p>{getStatusBadge(provider.availabilityStatus, "provider")}</p>
                    </div>
                    <div>
                        <span className="font-medium text-gray-700">Member Since:</span>
                        <p className="text-gray-600">{new Date(provider.memberSince).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t">
                  <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm w-full">
                    View Profile
                  </button>
                  {provider.availabilityStatus === "available" ? (
                     <button 
                        onClick={() => handleMaintenanceAction(provider.id, "mark_busy", "provider")}
                        className="bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-400 text-sm w-full"
                    >
                        Mark Busy
                    </button>
                  ) : (
                    <button 
                        onClick={() => handleMaintenanceAction(provider.id, "mark_available", "provider")}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-400 text-sm w-full"
                    >
                        Mark Available
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Simple Modal Placeholder for Assign Provider - in a real app, use a proper modal component */}
      
      {selectedRequestToAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Assign Provider to Request #{selectedRequestToAssign}</h3>
            <select 
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
                // onChange handler and logic would go here
                defaultValue=""
            >
              <option value="" disabled>Select a provider...</option>
              {mockMaintenanceData.serviceProviders.filter(p => p.availabilityStatus === 'available').map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name} ({provider.specialties.join(', ')})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setSelectedRequestToAssign(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                // onClick={() => handleAssignProvider(selectedRequestToAssign, getSelectedProviderId )}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MaintenanceAdminPanel;