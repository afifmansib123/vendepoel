"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import exp from "constants";
import { 
  Building, 
  Users, 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Home,
  UserCheck,
  Shield,
  TrendingUp,
  Clock
} from "lucide-react";
import React, { useState } from "react";

// Dummy Data
const mockData = {
  properties: [
    {
      id: 1,
      title: "Luxury Downtown Penthouse",
      address: "123 Park Avenue, Manhattan, NY 10016",
      type: "Penthouse",
      bedrooms: 4,
      bathrooms: 3,
      price: 3500000,
      priceType: "sale",
      status: "pending_approval",
      owner: {
        id: 101,
        name: "Robert Chen",
        email: "robert.chen@email.com",
        type: "landlord"
      },
      manager: {
        id: 201,
        name: "Premium Realty Group",
        email: "contact@premiumrealty.com",
        type: "agent"
      },
      submittedDate: "2024-06-01T10:30:00Z",
      images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400"],
      description: "Stunning penthouse with panoramic city views, modern amenities, and luxury finishes throughout."
    },
    {
      id: 2,
      title: "Cozy Brooklyn Apartment",
      address: "456 Oak Street, Brooklyn, NY 11201",
      type: "Apartment",
      bedrooms: 2,
      bathrooms: 1,
      price: 2800,
      priceType: "rent",
      status: "approved",
      owner: {
        id: 102,
        name: "Sarah Williams",
        email: "sarah.williams@email.com",
        type: "landlord"
      },
      manager: {
        id: 202,
        name: "Brooklyn Rentals Inc",
        email: "info@brooklynrentals.com",
        type: "agent"
      },
      submittedDate: "2024-05-28T14:15:00Z",
      approvedDate: "2024-05-30T09:20:00Z",
      images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400"],
      description: "Charming 2-bedroom apartment in trendy Brooklyn neighborhood with great transportation links."
    },
    {
      id: 3,
      title: "Modern Family Home",
      address: "789 Maple Drive, Queens, NY 11375",
      type: "Single Family Home",
      bedrooms: 4,
      bathrooms: 3,
      price: 1850000,
      priceType: "sale",
      status: "rejected",
      owner: {
        id: 103,
        name: "Michael Johnson",
        email: "michael.johnson@email.com",
        type: "landlord"
      },
      submittedDate: "2024-05-25T11:45:00Z",
      rejectedDate: "2024-05-27T16:30:00Z",
      rejectionReason: "Property documentation incomplete - missing recent inspection reports",
      images: ["https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400"],
      description: "Spacious family home with modern updates, large backyard, and excellent school district."
    },
    {
      id: 4,
      title: "Studio Loft in SoHo",
      address: "321 Broadway, SoHo, NY 10012",
      type: "Studio",
      bedrooms: 0,
      bathrooms: 1,
      price: 3500,
      priceType: "rent",
      status: "pending_approval",
      owner: {
        id: 104,
        name: "Emma Davis",
        email: "emma.davis@email.com",
        type: "landlord"
      },
      manager: {
        id: 203,
        name: "Manhattan Living LLC",
        email: "leasing@manhattanliving.com",
        type: "agent"
      },
      submittedDate: "2024-06-02T08:00:00Z",
      images: ["https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400"],
      description: "Artistic studio loft in the heart of SoHo with high ceilings and exposed brick walls."
    }
  ],
  users: [
    // Landlords
    {
      id: 101,
      name: "Robert Chen",
      email: "robert.chen@email.com",
      phone: "+1-555-0101",
      type: "landlord",
      status: "active",
      joinDate: "2024-01-15T00:00:00Z",
      propertiesOwned: 3,
      totalRevenue: 125000,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      verification: "verified"
    },
    {
      id: 102,
      name: "Sarah Williams",
      email: "sarah.williams@email.com",
      phone: "+1-555-0102",
      type: "landlord",
      status: "active",
      joinDate: "2024-02-20T00:00:00Z",
      propertiesOwned: 2,
      totalRevenue: 68000,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
      verification: "verified"
    },
    {
      id: 103,
      name: "Michael Johnson",
      email: "michael.johnson@email.com",
      phone: "+1-555-0103",
      type: "landlord",
      status: "suspended",
      joinDate: "2024-03-10T00:00:00Z",
      propertiesOwned: 1,
      totalRevenue: 0,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      verification: "pending",
      suspensionReason: "Multiple property documentation violations"
    },
    // Agents/Managers
    {
      id: 201,
      name: "Premium Realty Group",
      email: "contact@premiumrealty.com",
      phone: "+1-555-0201",
      type: "agent",
      status: "active",
      joinDate: "2023-11-01T00:00:00Z",
      propertiesManaged: 15,
      totalCommissions: 89000,
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150",
      verification: "verified",
      licenseNumber: "RE-789456"
    },
    {
      id: 202,
      name: "Brooklyn Rentals Inc",
      email: "info@brooklynrentals.com",
      phone: "+1-555-0202",
      type: "agent",
      status: "active",
      joinDate: "2024-01-05T00:00:00Z",
      propertiesManaged: 8,
      totalCommissions: 34000,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      verification: "verified",
      licenseNumber: "RE-654321"
    },
    // Buyers
    {
      id: 301,
      name: "Jennifer Martinez",
      email: "jennifer.martinez@email.com",
      phone: "+1-555-0301",
      type: "buyer",
      status: "active",
      joinDate: "2024-05-15T00:00:00Z",
      inquiriesMade: 12,
      viewingsScheduled: 5,
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      verification: "verified",
      preApprovalAmount: 750000
    },
    {
      id: 302,
      name: "David Thompson",
      email: "david.thompson@email.com",
      phone: "+1-555-0302",
      type: "buyer",
      status: "active",
      joinDate: "2024-04-20T00:00:00Z",
      inquiriesMade: 8,
      viewingsScheduled: 3,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      verification: "pending",
      preApprovalAmount: 950000
    },
    // Tenants
    {
      id: 401,
      name: "Lisa Anderson",
      email: "lisa.anderson@email.com",
      phone: "+1-555-0401",
      type: "tenant",
      status: "active",
      joinDate: "2024-03-01T00:00:00Z",
      currentRent: 2800,
      leaseEndDate: "2025-02-28T00:00:00Z",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150",
      verification: "verified",
      paymentHistory: "excellent"
    },
    {
      id: 402,
      name: "James Wilson",
      email: "james.wilson@email.com",
      phone: "+1-555-0402",
      type: "tenant",
      status: "active",
      joinDate: "2024-01-15T00:00:00Z",
      currentRent: 3200,
      leaseEndDate: "2024-12-31T00:00:00Z",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      verification: "verified",
      paymentHistory: "good"
    }
  ],
  stats: {
    totalProperties: 47,
    pendingApprovals: 8,
    totalUsers: 156,
    activeListings: 32,
    monthlyRevenue: 245000,
    approvalRate: 87
  }
};

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const handlePropertyAction = (propertyId, action) => {
    console.log(`${action} property ${propertyId}`);
    // In real app, this would call your API
  };

  const handleUserAction = (userId, action) => {
    console.log(`${action} user ${userId}`);
    // In real app, this would call your API
  };

  const formatPrice = (price, type = "sale") => {
    if (type === "rent") {
      return `$${price.toLocaleString()}/month`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      verified: "bg-blue-100 text-blue-800",
      pending: "bg-yellow-100 text-yellow-800"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage properties, users, and platform operations</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Building className="w-10 h-10 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">{mockData.stats.totalProperties}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Clock className="w-10 h-10 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{mockData.stats.pendingApprovals}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Users className="w-10 h-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{mockData.stats.totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <TrendingUp className="w-10 h-10 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${mockData.stats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="landlords">Landlords</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="buyers">Buyers & Tenants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Properties */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Property Submissions</h3>
              <div className="space-y-4">
                {mockData.properties.slice(0, 3).map(property => (
                  <div key={property.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <img src={property.images[0]} alt={property.title} className="w-12 h-12 rounded object-cover" />
                    <div className="flex-1">
                      <p className="font-medium">{property.title}</p>
                      <p className="text-sm text-gray-600">{property.owner.name}</p>
                    </div>
                    {getStatusBadge(property.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Recent User Registrations</h3>
              <div className="space-y-4">
                {mockData.users.slice(0, 3).map(user => (
                  <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{user.type}</p>
                    </div>
                    {getStatusBadge(user.verification)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="mt-6">
          <div className="space-y-6">
            {mockData.properties.map(property => (
              <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <img src={property.images[0]} alt={property.title} className="w-20 h-20 rounded-lg object-cover" />
                      <div>
                        <h3 className="text-lg font-semibold">{property.title}</h3>
                        <p className="text-gray-600 flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {property.address}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>{property.bedrooms} bed</span>
                          <span>{property.bathrooms} bath</span>
                          <span className="font-semibold text-gray-900">
                            {formatPrice(property.price, property.priceType)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(property.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium text-gray-700">Owner:</span>
                      <p className="text-gray-600">{property.owner.name}</p>
                    </div>
                    {property.manager && (
                      <div>
                        <span className="font-medium text-gray-700">Manager:</span>
                        <p className="text-gray-600">{property.manager.name}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Submitted:</span>
                      <p className="text-gray-600">{new Date(property.submittedDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Property Type:</span>
                      <p className="text-gray-600">{property.type}</p>
                    </div>
                  </div>

                  {property.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {property.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                    
                    {property.status === "pending_approval" && (
                      <>
                        <button 
                          onClick={() => handlePropertyAction(property.id, "approve")}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 flex items-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handlePropertyAction(property.id, "reject")}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500 flex items-center"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Landlords Tab */}
        <TabsContent value="landlords" className="mt-6">
          <div className="space-y-6">
            {mockData.users.filter(user => user.type === 'landlord').map(landlord => (
              <div key={landlord.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <img src={landlord.avatar} alt={landlord.name} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <h3 className="text-lg font-semibold">{landlord.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {landlord.email}
                        </span>
                        <span className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {landlord.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        {getStatusBadge(landlord.status)}
                        {getStatusBadge(landlord.verification)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-lg font-semibold text-green-600">${landlord.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Join Date:</span>
                    <p className="text-gray-600">{new Date(landlord.joinDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Properties Owned:</span>
                    <p className="text-gray-600">{landlord.propertiesOwned}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Account Status:</span>
                    <p className="text-gray-600 capitalize">{landlord.status}</p>
                  </div>
                </div>

                {landlord.suspensionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
                    <p className="text-sm text-red-800">
                      <strong>Suspension Reason:</strong> {landlord.suspensionReason}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
                    View Profile
                  </button>
                  {landlord.status === "active" ? (
                    <button 
                      onClick={() => handleUserAction(landlord.id, "suspend")}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUserAction(landlord.id, "activate")}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="mt-6">
          <div className="space-y-6">
            {mockData.users.filter(user => user.type === 'agent').map(agent => (
              <div key={agent.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <img src={agent.avatar} alt={agent.name} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <h3 className="text-lg font-semibold">{agent.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {agent.email}
                        </span>
                        <span className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {agent.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        {getStatusBadge(agent.status)}
                        {getStatusBadge(agent.verification)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Commissions</p>
                    <p className="text-lg font-semibold text-green-600">${agent.totalCommissions.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Join Date:</span>
                    <p className="text-gray-600">{new Date(agent.joinDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Properties Managed:</span>
                    <p className="text-gray-600">{agent.propertiesManaged}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">License Number:</span>
                    <p className="text-gray-600">{agent.licenseNumber}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Account Status:</span>
                    <p className="text-gray-600 capitalize">{agent.status}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
                    View Profile
                  </button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500">
                    View Properties
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Buyers & Tenants Tab */}
        <TabsContent value="buyers" className="mt-6">
          <div className="space-y-6">
            {mockData.users.filter(user => user.type === 'buyer' || user.type === 'tenant').map(user => (
              <div key={user.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
                    <div>
                      <h3 className="text-lg font-semibold">{user.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{user.type}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {user.email}
                        </span>
                        <span className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {user.phone}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        {getStatusBadge(user.status)}
                        {getStatusBadge(user.verification)}
                      </div>
                    </div>
                  </div>
                  {user.type === 'buyer' && user.preApprovalAmount && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Pre-approval</p>
                      <p className="text-lg font-semibold text-blue-600">${user.preApprovalAmount.toLocaleString()}</p>
</div>
)}
</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Join Date:</span>
                <p className="text-gray-600">{new Date(user.joinDate).toLocaleDateString()}</p>
              </div>
              {user.type === 'buyer' && (
                <>
                  <div>
                    <span className="font-medium text-gray-700">Inquiries Made:</span>
                    <p className="text-gray-600">{user.inquiriesMade}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Viewings Scheduled:</span>
                    <p className="text-gray-600">{user.viewingsScheduled}</p>
                  </div>
                </>
              )}
              {user.type === 'tenant' && (
                <>
                  <div>
                    <span className="font-medium text-gray-700">Current Rent:</span>
                    <p className="text-gray-600">{formatPrice(user.currentRent, 'rent')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Lease End Date:</span>
                    <p className="text-gray-600">{new Date(user.leaseEndDate).toLocaleDateString()}</p>
                  </div>
                  {user.paymentHistory && (
                     <div>
                        <span className="font-medium text-gray-700">Payment History:</span>
                        <p className="text-gray-600 capitalize">{user.paymentHistory}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">
                View Profile
              </button>
              {user.status === "active" ? (
                <button 
                  onClick={() => handleUserAction(user.id, "suspend")}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                >
                  Suspend
                </button>
              ) : user.status === "suspended" ? ( // Assuming suspended users can be reactivated
                <button 
                  onClick={() => handleUserAction(user.id, "activate")}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                >
                  Activate
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </TabsContent>
  </Tabs>
</div>
);
};  

export default AdminPanel;