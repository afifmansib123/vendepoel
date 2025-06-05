"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetAuthUserQuery } from "@/state/api";
import React, { useState, useEffect } from "react";
import Image from "next/image";

// Interface for Landlord data structure
interface LandlordProfile {
  _id: string;
  cognitoId: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  description?: string;
  businessLicense?: string;
  profileImage?: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

const LandlordProfile = () => {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const [landlordData, setLandlordData] = useState<LandlordProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Fetch landlord profile data
  useEffect(() => {
    const fetchLandlordProfile = async () => {
      if (!authUser?.cognitoInfo.userId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/landlords/${authUser?.cognitoInfo.userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add any authentication headers if needed
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch landlord profile');
        }

        const data = await response.json();
        
        // Set dummy data for missing fields as requested
        const enhancedData: LandlordProfile = {
          ...data,
          status: 'approved',
          companyName: data.companyName || 'Premium Real Estate Thailand',
          description: data.description || 'Leading real estate agency in Thailand specializing in premium properties and exceptional customer service. With years of experience in the Thai property market, we provide comprehensive solutions for property investment, sales, and rentals.',
          phone: data.phone || '+66 2 123 4567',
          address: data.address || 'Bangkok, Thailand',
          profileImage: data.profileImage || '/api/placeholder/150/150',
          businessLicense: data.businessLicense || '/api/placeholder/300/200',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };

        setLandlordData(enhancedData);
      } catch (error) {
        console.error('Error fetching landlord profile:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (authUser && authUser?.userRole === 'landlord') {
      fetchLandlordProfile();
    } else if (authUser && authUser?.userRole !== 'landlord') {
      alert('You are not authorized to view this page. Please log in as a landlord.');
      setIsError(true);
      setIsLoading(false);
    }
  }, [authUser]);

  if (authLoading || isLoading) return <Loading />;
  
  if (isError || !landlordData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Error Loading Profile
          </h2>
          <p className="text-gray-700">
            We encountered an issue while trying to fetch your profile.
            Please check your connection and try again later.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="dashboard-container bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <Header
        title="My Profile"
        subtitle="Manage your landlord profile and business information"
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-100 to-purple-100 h-32"></div>
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-200">
                  <Image
                    src="/placeholder.jpg"
                    alt="Profile"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  {landlordData.status.toUpperCase()}
                </div>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {landlordData.name || 'Landlord Name'}
                </h1>
                <p className="text-lg text-gray-600 font-medium">
                  {landlordData.companyName}
                </p>
                <p className="text-gray-500">{landlordData.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <p className="text-gray-900">{landlordData.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                <p className="text-gray-900">{landlordData.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                <p className="text-gray-900">{landlordData.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{landlordData.address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Cognito ID</label>
                <p className="text-gray-900 font-mono text-sm">{landlordData.cognitoId}</p>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h4m0 4h6" />
              </svg>
              Business Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                <p className="text-gray-900">{landlordData.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Status</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  landlordData.status === 'approved' 
                    ? 'bg-green-100 text-green-800' 
                    : landlordData.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {landlordData.status.charAt(0).toUpperCase() + landlordData.status.slice(1)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
                <p className="text-gray-900">{formatDate(landlordData.createdAt || new Date().toISOString())}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                <p className="text-gray-900">{formatDate(landlordData.updatedAt || new Date().toISOString())}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Description */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            About Our Business
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {landlordData.description}
          </p>
        </div>

        {/* Business License */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Business License
          </h2>
          <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-shrink-0">
              <div className="w-64 h-40 border rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src="/lisence.jpg"
                  alt="Business License"
                  width={300}
                  height={200}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                Our business license is verified and up-to-date, ensuring all operations comply with Thai regulations for real estate services.
              </p>
              <div className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Verified & Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>


          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordProfile;