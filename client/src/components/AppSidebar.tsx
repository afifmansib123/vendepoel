"use client";

import { usePathname } from "next/navigation";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar"; // Assuming these are your custom UI components
import {
  Building,      // For Properties (Manager/Landlord)
  FileText,      // For Applications
  Heart,         // For Favorites (Tenant/Buyer)
  Home,          // For Residences (Tenant), Dashboard (Buyer)
  Menu,          // Hamburger menu icon
  Settings,      // For Settings
  X,             // Close icon
  Search,        // For Property Search (Buyer)
  Briefcase,     // For My Listings/Portfolio (Landlord) - example
  UserCircle,    // For Profile/Account (generic or specific if needed)
  ShieldCheck,   // Example for Admin/MasterAdmin if you add that later
} from "lucide-react";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Define the props for AppSidebar
interface AppSidebarProps {
  userType: "manager" | "tenant" | "landlord" | "buyer" | string; // Allow string for future roles
}

const AppSidebar = ({ userType }: AppSidebarProps) => {
  const pathname = usePathname();
  const { toggleSidebar, open } = useSidebar(); // Assuming useSidebar hook provides these

  // --- MODIFICATION START: Define navLinks based on userType ---
  let navLinks = [];
  let sidebarTitle = "Dashboard"; // Default title

  switch (userType) {
    case "manager":
      sidebarTitle = "Manager View";
      navLinks = [
        { icon: Building, label: "Properties", href: "/managers/properties" },
        {
          icon: FileText,
          label: "Applications",
          href: "/managers/applications",
        },
        { icon: Settings, label: "Settings", href: "/managers/settings" },
      ];
      break;
    case "tenant":
      sidebarTitle = "Renter View";
      navLinks = [
        { icon: Heart, label: "Favorites", href: "/tenants/favorites" },
        {
          icon: FileText,
          label: "Applications",
          href: "/tenants/applications",
        },
        { icon: Home, label: "Residences", href: "/tenants/residences" },
        { icon: Settings, label: "Settings", href: "/tenants/settings" },
      ];
      break;
    case "landlord":
      sidebarTitle = "Landlord View";
      navLinks = [
        { icon: Briefcase, label: "My Properties", href: "/landlords/properties" },
        // Example: Link to add a new property
        // { icon: PlusCircle, label: "Add Property", href: "/landlords/properties/new" }, 
        {
          icon: FileText, // Assuming landlords also see applications for their properties
          label: "Applications",
          href: "/landlords/applications", 
        },
        // Example: Link to view tenants of all properties or manage them
        // { icon: Users, label: "My Tenants", href: "/landlords/tenants" }, 
        { icon: Settings, label: "Settings", href: "/landlords/settings" },
      ];
      break;
    case "buyer":
      sidebarTitle = "Buyer View";
      navLinks = [
        { icon: Search, label: "Search Properties", href: "/buyers/search" }, // Or just "/properties" if search is public but this is buyer dashboard
        { icon: Heart, label: "My Favorites", href: "/buyers/favorites" },
        // Example: Saved searches or alerts
        // { icon: Bell, label: "Saved Searches", href: "/buyers/saved-searches" },
        { 
          icon: UserCircle, // Or Settings icon
          label: "Profile Settings", 
          href: "/buyers/settings" 
        },
      ];
      break;
    default:
      // Fallback or links for an unknown role (should ideally not happen if roles are managed)
      sidebarTitle = "My Account";
      navLinks = [
        { icon: Home, label: "Dashboard", href: "/" },
        { icon: Settings, label: "Settings", href: "/settings" }, // Generic settings link
      ];
      break;
  }
  // --- MODIFICATION END ---

  return (
    <Sidebar
      collapsible="icon" // Props from your UI library
      className="fixed left-0 bg-white shadow-lg z-40" // Added z-index
      style={{
        top: `${NAVBAR_HEIGHT}px`,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem> {/* This seems to be a wrapper, ensure it's used correctly by your UI lib */}
            <div
              className={cn(
                "flex min-h-[56px] w-full items-center pt-3 mb-3", // Original styling
                open ? "justify-between px-6" : "justify-center"
              )}
            >
              {open ? (
                <>
                  {/* --- MODIFICATION: Use dynamic sidebarTitle --- */}
                  <h1 className="text-xl font-bold text-gray-800">
                    {sidebarTitle}
                  </h1>
                  <button
                    className="hover:bg-gray-100 p-2 rounded-md"
                    onClick={toggleSidebar} // Corrected: directly call toggleSidebar
                    aria-label="Close sidebar"
                  >
                    <X className="h-6 w-6 text-gray-600" />
                  </button>
                </>
              ) : (
                <button
                  className="hover:bg-gray-100 p-2 rounded-md"
                  onClick={toggleSidebar} // Corrected: directly call toggleSidebar
                  aria-label="Open sidebar"
                >
                  <Menu className="h-6 w-6 text-gray-600" />
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto"> {/* Added overflow for scrollable content */}
        <SidebarMenu>
          {navLinks.map((link) => {
            // Determine if the current link is active.
            // For nested routes, you might want `pathname.startsWith(link.href)`
            // For exact matches: `pathname === link.href`
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href) && link.href.split('/').length > 2);


            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild // Important if Link is the direct child for proper behavior
                  className={cn(
                    "flex items-center w-full text-left", // Ensure full width for click area
                    // Conditional styling based on 'open' state and 'isActive'
                    open ? "px-6 py-3" : "justify-center py-3 px-2 mx-1", // Adjust padding when collapsed
                    isActive
                      ? "bg-primary-100 text-primary-700 font-semibold" // Active link styling
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800", // Inactive link styling
                    "rounded-md transition-colors duration-150" // General styling
                  )}
                >
                  <Link href={link.href} className="w-full" scroll={false}>
                    <div className={cn(
                        "flex items-center gap-3",
                        !open && "justify-center" // Center icon when collapsed
                        )}>
                      <link.icon // Lucide icon component
                        className={cn(
                            "h-5 w-5 flex-shrink-0", // Icon size
                            isActive ? "text-primary-600" : "text-gray-500" // Icon color
                        )}
                        aria-hidden="true"
                      />
                      {open && ( // Only show label if sidebar is open
                        <span
                          className={cn(
                              "font-medium text-sm", // Label styling
                              // isActive ? "text-primary-700" : "text-gray-700" // Text color already handled by parent
                          )}
                        >
                          {link.label}
                        </span>
                      )}
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      {/* SidebarFooter can be added here if needed */}
    </Sidebar>
  );
};

export default AppSidebar;