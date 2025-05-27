"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetPaymentsQuery,
  useGetPropertyLeasesQuery,
  useGetPropertyQuery,
} from "@/state/api"; // These hooks are generic for the property
import { ArrowDownToLine, ArrowLeft, Check, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

// Component name can remain PropertyTenants as it's descriptive of the content
const PropertyTenants = () => {
  const params = useParams();
  const id = params.id as string;
  const propertyId = Number(id);

  const { data: property, isLoading: propertyLoading, isError: propertyError } =
    useGetPropertyQuery(propertyId, { skip: !propertyId });
  
  const { data: leases, isLoading: leasesLoading, isError: leasesError } =
    useGetPropertyLeasesQuery(propertyId, { skip: !propertyId });
  
  // Assuming useGetPaymentsQuery fetches payments related to the propertyId's leases
  const { data: payments, isLoading: paymentsLoading, isError: paymentsError } =
    useGetPaymentsQuery(propertyId, { skip: !propertyId }); 

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;

  if (propertyError || leasesError || paymentsError) {
    return (
      <div className="dashboard-container text-center py-10">
        <p className="text-red-500">Error loading property or tenant data. Please try again.</p>
        <Link
          href="/landlords/properties" // LANDLORD SPECIFIC: Back link
          className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to My Properties</span>
        </Link>
      </div>
    );
  }

  const getCurrentMonthPaymentStatus = (leaseId: number) => {
    const currentDate = new Date();
    const currentMonthPayment = payments?.find(
      (payment) =>
        payment.leaseId === leaseId &&
        new Date(payment.paymentDate || payment.dueDate).getMonth() === currentDate.getMonth() &&
        new Date(payment.paymentDate || payment.dueDate).getFullYear() === currentDate.getFullYear()
    );
    return currentMonthPayment?.paymentStatus || "Pending";
  };

  return (
    <div className="dashboard-container">
      {/* LANDLORD SPECIFIC: Back to properties page for landlords */}
      <Link
        href="/landlords/properties" // <<<--- THIS IS THE KEY CHANGE FOR LANDLORDS
        className="flex items-center mb-4 text-gray-600 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to My Properties</span> 
      </Link>

      <Header
        title={property?.name || "Property Tenants"}
        // Subtitle is generic enough for landlords or managers
        subtitle="Manage tenants and leases for this property" 
      />

      <div className="w-full space-y-6">
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tenants Overview</h2>
              <p className="text-sm text-gray-500">
                Manage and view all tenants for this property.
              </p>
            </div>
            <div>
              <button
                className={`bg-white border border-gray-300 text-gray-700 py-2
              px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50 transition-colors duration-150`}
              >
                <Download className="w-5 h-5 mr-2" />
                <span>Download All</span>
              </button>
            </div>
          </div>
          <hr className="mt-4 mb-1" />
          {(!leases || leases.length === 0) ? (
            <p className="text-center text-gray-500 py-8">No tenants found for this property.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Tenant</TableHead>
                    <TableHead className="min-w-[150px]">Lease Period</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Current Month Status</TableHead>
                    <TableHead className="min-w-[150px]">Contact</TableHead>
                    <TableHead className="min-w-[200px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases?.map((lease) => (
                    <TableRow key={lease.id} className="h-24 hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Image
                            src={lease.tenant.profileImageUrl || "/placeholder-avatar.png"}
                            alt={lease.tenant.name || "Tenant"}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold">
                              {lease.tenant.name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lease.tenant.email || "N/A"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {lease.startDate ? new Date(lease.startDate).toLocaleDateString() : "N/A"} -
                        </div>
                        <div>{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : "N/A"}</div>
                      </TableCell>
                      <TableCell>${lease.rent?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                            getCurrentMonthPaymentStatus(lease.id) === "Paid"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : getCurrentMonthPaymentStatus(lease.id) === "Pending"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : "bg-red-100 text-red-700 border-red-300"
                          }`}
                        >
                          {getCurrentMonthPaymentStatus(lease.id) === "Paid" && (
                            <Check className="w-3 h-3 inline-block mr-1" />
                          )}
                          {getCurrentMonthPaymentStatus(lease.id)}
                        </span>
                      </TableCell>
                      <TableCell>{lease.tenant.phoneNumber || "N/A"}</TableCell>
                      <TableCell>
                        <button
                          className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex 
                        items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50 transition-colors duration-150`}
                        >
                          <ArrowDownToLine className="w-4 h-4 mr-1" />
                          Download Agreement
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyTenants;