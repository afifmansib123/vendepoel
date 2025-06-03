"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Banknote, 
  Landmark, 
  Users, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Calendar, 
  Mail, 
  Phone,
  Briefcase,
  UserCheck,
  DollarSign,
  Hourglass,
  CheckCircle,
  XCircle
} from "lucide-react";
import React, { useState } from "react";

// Dummy Data for Financial Panel
const mockFinancialData = {
  partnerInstitutions: [
    {
      id: 701,
      name: "City National Bank",
      branchName: "Downtown Financial Center",
      address: "789 Finance Ave, Metropolis, NY 10007",
      contactEmail: "partners@cnb.com",
      contactPhone: "+1-555-0701",
      servicesOffered: ["Mortgages", "Home Equity Loans", "Business Loans"],
      partnerSince: "2022-03-15T00:00:00Z",
      status: "active", // active, inactive, pending_review
      logoUrl: "https://via.placeholder.com/150/007bff/FFFFFF?Text=CNB", // Placeholder logo
      relationshipManager: "Jessica Miller"
    },
    {
      id: 702,
      name: "SecureTrust Mortgage Co.",
      address: "101 Loan Street, Suburbia, NY 11550",
      contactEmail: "apply@securetrust.com",
      contactPhone: "+1-555-0702",
      servicesOffered: ["Fixed-Rate Mortgages", "Adjustable-Rate Mortgages", "Refinancing"],
      partnerSince: "2023-08-01T00:00:00Z",
      status: "active",
      logoUrl: "https://via.placeholder.com/150/28a745/FFFFFF?Text=STM",
      averageApprovalTime: "15 days"
    },
    {
      id: 703,
      name: "FutureInvest Capital",
      address: "202 Investment Plaza, TechPark, NY 11201",
      contactEmail: "info@futureinvest.co",
      contactPhone: "+1-555-0703",
      servicesOffered: ["Venture Capital", "Bridge Loans", "Development Financing"],
      partnerSince: "2024-01-20T00:00:00Z",
      status: "pending_review",
      logoUrl: "https://via.placeholder.com/150/ffc107/000000?Text=FIC",
      notes: "New partner, review process ongoing."
    }
  ],
  loanApplications: [
    {
      applicationId: 801,
      userId: 301,
      userName: "Jennifer Martinez",
      propertyId: 1, // Optional, if tied to a specific property purchase
      propertyAddress: "123 Park Avenue, Manhattan, NY 10016",
      productType: "Mortgage Application",
      amountRequested: 650000,
      status: "under_review", // submitted, under_review, approved, rejected, docs_pending
      submittedDate: "2024-07-01T10:00:00Z",
      bankId: 701,
      bankName: "City National Bank",
      assignedLoanOfficer: "John Doe (CNB)"
    },
    {
      applicationId: 802,
      userId: 102, // A landlord applying for refinancing
      userName: "Sarah Williams",
      propertyId: null, // General refinancing not tied to a new purchase
      productType: "Refinancing",
      amountRequested: 300000,
      status: "approved",
      submittedDate: "2024-06-15T14:30:00Z",
      approvedDate: "2024-07-05T11:00:00Z",
      bankId: 702,
      bankName: "SecureTrust Mortgage Co.",
      assignedLoanOfficer: "Alice Brown (STM)"
    },
    {
      applicationId: 803,
      userId: 302,
      userName: "David Thompson",
      productType: "Pre-approval Request",
      amountRequested: 900000,
      status: "docs_pending",
      submittedDate: "2024-07-08T09:15:00Z",
      bankId: null, // Not yet assigned to a specific bank for processing
      assignedLoanOfficer: null,
      notes: "Awaiting income verification documents."
    }
  ],
  stats: {
    totalFinancialPartners: 12,
    activeLoanApplications: 28,
    totalLoanVolumeThisQuarter: 15750000,
    averageApprovalRate: "78%"
  }
};

const FinancialAdminPanel = () => {
  const [activeTab, setActiveTab] = useState("applications");

  const handleFinancialAction = (itemId, action, type) => {
    console.log(`${action} ${type} ${itemId}`);
    // In a real app, this would call your API
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      // Application statuses
      submitted: "bg-gray-100 text-gray-800",
      under_review: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      docs_pending: "bg-orange-100 text-orange-800",
      // Partner statuses
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      pending_review: "bg-blue-100 text-blue-800"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-200 text-gray-700'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Services Panel</h1>
        <p className="text-gray-600 mt-2">Manage partner institutions and loan applications</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <Landmark className="w-10 h-10 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Financial Partners</p>
              <p className="text-2xl font-bold text-gray-900">{mockFinancialData.stats.totalFinancialPartners}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <FileText className="w-10 h-10 text-cyan-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Applications</p>
              <p className="text-2xl font-bold text-gray-900">{mockFinancialData.stats.activeLoanApplications}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <DollarSign className="w-10 h-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Loan Volume (QTR)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockFinancialData.stats.totalLoanVolumeThisQuarter)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <TrendingUp className="w-10 h-10 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approval Rate</p>
              <p className="text-2xl font-bold text-gray-900">{mockFinancialData.stats.averageApprovalRate}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-2">
          <TabsTrigger value="applications">Loan Applications</TabsTrigger>
          <TabsTrigger value="institutions">Partner Institutions</TabsTrigger>
        </TabsList>

        {/* Loan Applications Tab */}
        <TabsContent value="applications" className="mt-6">
          <div className="space-y-6">
            {mockFinancialData.loanApplications.map(app => (
              <div key={app.applicationId} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{app.productType} - {app.userName}</h3>
                      <p className="text-gray-600 text-sm">Application ID: {app.applicationId}</p>
                      {app.propertyAddress && <p className="text-gray-500 text-xs mt-1">Property: {app.propertyAddress}</p>}
                    </div>
                    <div className="mt-3 md:mt-0 md:text-right">
                        {getStatusBadge(app.status)}
                        <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(app.amountRequested)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4 border-t pt-4 mt-4">
                    <div>
                      <span className="font-medium text-gray-700">Submitted:</span>
                      <p className="text-gray-600">{new Date(app.submittedDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Assigned Bank:</span>
                      <p className="text-gray-600">{app.bankName || <span className="italic text-gray-400">N/A</span>}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Loan Officer:</span>
                      <p className="text-gray-600">{app.assignedLoanOfficer || <span className="italic text-gray-400">N/A</span>}</p>
                    </div>
                    {app.approvedDate && (
                         <div>
                            <span className="font-medium text-gray-700">Approved On:</span>
                            <p className="text-gray-600">{new Date(app.approvedDate).toLocaleDateString()}</p>
                        </div>
                    )}
                  </div>

                  {app.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Notes:</strong> {app.notes}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      View Application
                    </button>
                    {app.status !== "approved" && app.status !== "rejected" && (
                      <button 
                        onClick={() => handleFinancialAction(app.applicationId, "update_status", "application")}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 text-sm flex items-center"
                      >
                        <Hourglass className="w-4 h-4 mr-2" />
                        Update Status
                      </button>
                    )}
                     {app.status === "under_review" || app.status === "docs_pending" ? (
                        <>
                        <button 
                          onClick={() => handleFinancialAction(app.applicationId, "approve_app", "application")}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-500 text-sm flex items-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleFinancialAction(app.applicationId, "reject_app", "application")}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-500 text-sm flex items-center"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                        </>
                     ) : null }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Partner Institutions Tab */}
        <TabsContent value="institutions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockFinancialData.partnerInstitutions.map(inst => (
              <div key={inst.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                <div className="flex items-start mb-3">
                    <img src={inst.logoUrl} alt={inst.name} className="w-16 h-16 rounded-md object-contain mr-4 border p-1" />
                    <div>
                        <h3 className="text-lg font-semibold">{inst.name}</h3>
                        <p className="text-sm text-gray-500">{inst.branchName || inst.address.split(',')[0]}</p>
                    </div>
                     <div className="ml-auto">{getStatusBadge(inst.status)}</div>
                </div>
                
                <div className="text-sm space-y-1 mb-3">
                    <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-gray-500" /> {inst.contactEmail}</p>
                    <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-500" /> {inst.contactPhone}</p>
                    {inst.relationshipManager && <p className="flex items-center"><UserCheck className="w-4 h-4 mr-2 text-gray-500" /> RM: {inst.relationshipManager}</p>}
                </div>

                <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Services Offered</h4>
                    <div className="flex flex-wrap gap-1">
                        {inst.servicesOffered.map(service => (
                            <span key={service} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{service}</span>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 text-sm mb-3">
                    <div>
                        <span className="font-medium text-gray-700">Partner Since:</span>
                        <p className="text-gray-600">{new Date(inst.partnerSince).toLocaleDateString()}</p>
                    </div>
                    {inst.averageApprovalTime && (
                         <div>
                            <span className="font-medium text-gray-700">Avg. Approval:</span>
                            <p className="text-gray-600">{inst.averageApprovalTime}</p>
                        </div>
                    )}
                </div>

                 {inst.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3 text-xs">
                        <p className="text-blue-800"><strong>Note:</strong> {inst.notes}</p>
                    </div>
                  )}

                <div className="flex gap-2 mt-auto pt-4 border-t">
                  <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm w-full">
                    View Details
                  </button>
                  {inst.status === "active" ? (
                     <button 
                        onClick={() => handleFinancialAction(inst.id, "deactivate", "institution")}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-400 text-sm w-full"
                    >
                        Deactivate
                    </button>
                  ) : inst.status === "pending_review" ? (
                     <button 
                        onClick={() => handleFinancialAction(inst.id, "approve_partner", "institution")}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-400 text-sm w-full"
                    >
                        Approve Partner
                    </button>
                  ) : (
                     <button 
                        onClick={() => handleFinancialAction(inst.id, "activate", "institution")}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-400 text-sm w-full"
                    >
                        Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAdminPanel;