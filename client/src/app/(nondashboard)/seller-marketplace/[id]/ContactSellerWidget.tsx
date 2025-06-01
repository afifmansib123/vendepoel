// src/app/(nondashboard)/seller-marketplace/[id]/ContactSellerWidget.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGetAuthUserQuery } from '@/state/api'; // YOUR ACTUAL AUTH HOOK
import { Loader2, Send, UserCircle, ShieldCheck, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // For redirecting to signin

interface ContactSellerWidgetProps {
  sellerName?: string;
  sellerEmail?: string; // Placeholder, ideally fetched or passed
  propertyName: string;
  propertyId: string | number;
  allowBuyerApplications: boolean;
}

const ContactSellerWidget: React.FC<ContactSellerWidgetProps> = ({
  sellerName = "the Seller",
  sellerEmail = "seller-contact@example.com", // Replace with actual data later
  propertyName,
  propertyId,
  allowBuyerApplications,
}) => {
  const { data: authUser, isLoading: authLoading, isError: authError } = useGetAuthUserQuery();
  const router = useRouter();

  const [message, setMessage] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (authUser && authUser.cognitoInfo) { // Assuming name/email are in cognitoInfo or authUser directly
        setNameInput(authUser.cognitoInfo.name || authUser.name || ''); // Adjust based on your authUser structure
        setEmailInput(authUser.cognitoInfo.email || '');
    } else {
        setNameInput('');
        setEmailInput('');
    }
  }, [authUser]);

  if (!allowBuyerApplications) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 h-fit sticky top-28">
            <p className="text-gray-700 text-center">
                The seller is not currently accepting inquiries for this property.
            </p>
        </div>
    );
  }

  const handleSignInRedirect = () => {
    router.push(`/signin?redirect=/seller-marketplace/${propertyId}`); // Redirect back after sign-in
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authUser && (!nameInput.trim() || !emailInput.trim())) {
        setSubmitStatus({ type: 'error', message: 'Please provide your name and email to send a message.'});
        return;
    }
    if (!message.trim()){
        setSubmitStatus({ type: 'error', message: 'Please enter a message.'});
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const inquiryPayload = {
      buyerName: authUser ? (authUser.cognitoInfo.name || authUser.name) : nameInput,
      buyerEmail: authUser ? authUser.cognitoInfo.email : emailInput,
      buyerPhone: phoneInput,
      message,
      propertyName,
      propertyId,
      sellerTargetEmail: sellerEmail, // This would be used by your backend
      buyerCognitoId: authUser?.cognitoInfo?.userId, // Send if user is logged in
      // Add any other fields your backend expects for an inquiry
    };

    console.log("Submitting Inquiry:", inquiryPayload);

    // --- SIMULATE BACKEND API CALL ---
    // Replace this with your actual fetch/axios call to your backend endpoint
    // e.g., await fetch('/api/property-inquiries', { method: 'POST', body: JSON.stringify(inquiryPayload), headers: {'Content-Type': 'application/json'} });
    await new Promise(resolve => setTimeout(resolve, 1500));
    const success = Math.random() > 0.2; // Simulate success/failure
    // --- END SIMULATION ---

    if (success) {
      setSubmitStatus({ type: 'success', message: 'Your inquiry has been sent successfully!' });
      setMessage('');
      // Optionally clear phone if not logged in, name/email are prefilled or cleared via useEffect
      if (!authUser) setPhoneInput('');
    } else {
      setSubmitStatus({ type: 'error', message: 'Failed to send inquiry. Please try again later.' });
    }

    setIsSubmitting(false);
  };

  if (authLoading) {
    return <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 h-fit sticky top-28 flex justify-center items-center min-h-[200px]"><Loader2 className="animate-spin text-primary-500" size={32}/></div>;
  }

  if (authError) {
    // You might want to allow guests to send messages even if auth service fails
    console.error("Auth Error:", authError);
    // Or display an error message related to auth service problem
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200 h-fit sticky top-28">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Contact Seller</h3>
      <p className="text-sm text-gray-500 mb-4">
        Interested? Send a message to {sellerName}.
      </p>

      {submitStatus && (
        <div className={`p-3 rounded-md mb-4 text-sm ${submitStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!authUser ? ( // Guest form
            <>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name <span className="text-red-500">*</span></label>
                    <Input id="name" type="text" placeholder="John Doe" value={nameInput} onChange={e => setNameInput(e.target.value)} required disabled={isSubmitting}/>
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Your Email <span className="text-red-500">*</span></label>
                    <Input id="email" type="email" placeholder="you@example.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} required disabled={isSubmitting}/>
                </div>
            </>
        ) : ( // Logged-in user display
            <div className="p-3 bg-primary-50 border border-primary-200 rounded-md flex items-center">
                <UserCircle className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                    <p className="text-sm font-medium text-primary-700">{authUser.cognitoInfo.name || authUser.name || "Authenticated User"}</p>
                    <p className="text-xs text-primary-600">{authUser.cognitoInfo.email}</p>
                </div>
            </div>
        )}
        <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
            <Input id="phone" type="tel" placeholder="(555) 123-4567" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} disabled={isSubmitting}/>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Your Message <span className="text-red-500">*</span></label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`I'm interested in "${propertyName}"...`}
            rows={4}
            required
            disabled={isSubmitting}
          />
        </div>

        <Button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white" disabled={isSubmitting || authLoading}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Inquiry
        </Button>
      </form>

      {!authUser && !authLoading && ( // Show sign-in prompt only if not logged in and auth check is complete
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-2">Or</p>
            <Button variant="outline" className="w-full" onClick={handleSignInRedirect} disabled={isSubmitting}>
                <LogIn className="mr-2 h-4 w-4"/> Sign In to Send
            </Button>
          </div>
      )}
       <div className="mt-5 text-xs text-gray-400 flex items-center">
            <ShieldCheck size={14} className="mr-1.5"/> Your information is kept confidential.
       </div>
    </div>
  );
};

export default ContactSellerWidget;