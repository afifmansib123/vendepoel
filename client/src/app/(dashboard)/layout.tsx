"use client";

import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar"; // Assuming this is generic
import Sidebar from "@/components/AppSidebar"; // Assuming this can handle new user types
import { NAVBAR_HEIGHT } from "@/lib/constants";
import React, { useEffect, useState } from "react";
import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter } from "next/navigation";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: authUser, isLoading: authLoading, isError: authError } = useGetAuthUserQuery(); // Added isError
  const router = useRouter();
  const pathname = usePathname();
  const [isRouteValidated, setIsRouteValidated] = useState(false); // Renamed for clarity

  useEffect(() => {
    if (authLoading) return; // Don't do anything until auth status is known

    if (!authUser || !authUser.userRole) {
      // If no authUser or role after loading, might be an issue or user is not logged in.
      // The Authenticator HOC should ideally handle redirection to login if not authenticated.
      // If this layout is *always* for authenticated users, and we reach here without authUser,
      // it could indicate a problem or a race condition.
      // For now, we'll assume Auth HOC handles unauthenticated redirects.
      // If authUser is truly missing for an expected authenticated route, redirecting to home or login might be an option.
      // router.replace("/signin"); // Or "/"
      setIsRouteValidated(true); // Allow rendering to proceed, Auth HOC should kick in if needed
      return;
    }

    const userRole = authUser.userRole.toLowerCase();
    let isAccessAllowed = true;
    let redirectTo = "";

    // --- MODIFICATION START: Redirection and Access Logic ---
    switch (userRole) {
      case "manager":
        if (!pathname.startsWith("/managers")) {
          isAccessAllowed = false;
          redirectTo = "/managers/properties";
        }
        break;
      case "tenant":
        if (!pathname.startsWith("/tenants")) {
          isAccessAllowed = false;
          redirectTo = "/tenants/favorites"; // Or tenant dashboard
        }
        break;
      case "landlord":
        if (!pathname.startsWith("/landlords")) {
          isAccessAllowed = false;
          redirectTo = "/landlords/properties"; // Default landlord dashboard
        }
        break;
      case "buyer":
        if (!pathname.startsWith("/buyers")) {
          isAccessAllowed = false;
          redirectTo = "/buyer/settings"; // Example: default buyer dashboard (e.g., search or favorites)
        }
        break;
      default:
        // Unknown role, perhaps redirect to a generic page or error page
        isAccessAllowed = false;
        redirectTo = "/"; // Or an error page
        break;
    }

    if (!isAccessAllowed && redirectTo) {
      router.replace(redirectTo, { scroll: false }); // Using replace to avoid cluttering history
    } else {
      setIsRouteValidated(true); // Access is allowed or no redirection needed for this role/path
    }
    // --- MODIFICATION END ---

  }, [authUser, authLoading, router, pathname]);

  // Show loading until authentication check and route validation are complete
  if (authLoading || !isRouteValidated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading... {/* Or your <Loading /> component */}
      </div>
    );
  }

  // If after loading, still no authUser or role, it might mean the user is not logged in
  // and the Auth HOC/Authenticator should have redirected.
  // This check is a safeguard.
  if (!authUser?.userRole) {
    // This state should ideally be handled by the Authenticator redirecting to signin.
    // If we reach here, it's an unexpected state for a protected dashboard layout.
    // console.warn("DashboardLayout: authUser or userRole is missing after loading.");
    // Returning null or a redirect here can prevent rendering child components with missing auth context.
    // router.replace('/signin'); // Consider this if Authenticator isn't catching it
    return null; 
  }
  
  // If there was an error fetching the authenticated user
  if (authError) {
    console.error("DashboardLayout: Error fetching authenticated user", authError);
    // You might want to redirect to an error page or show a message
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <p>Could not load your user information.</p>
            <button onClick={() => router.push("/signin")} className="mt-4 text-blue-500">Try logging in again</button>
        </div>
    );
  }


  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-primary-100">
        <Navbar /> {/* Assuming Navbar is generic or adapts based on authUser */}
        <div style={{ marginTop: `${NAVBAR_HEIGHT}px` }}>
          <main className="flex">
            {/* Pass the userRole to Sidebar, assuming it uses it for conditional rendering */}
            <Sidebar userType={authUser.userRole.toLowerCase()} />
            <div className="flex-grow transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;