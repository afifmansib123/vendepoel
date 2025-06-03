"use client";

import React, { useEffect } from "react";
import { Amplify } from "aws-amplify";
import {
  Authenticator,
  Heading,
  Radio,
  RadioGroupField,
  useAuthenticator,
  View,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useRouter, usePathname } from "next/navigation";

// https://docs.amplify.aws/gen1/javascript/tools/libraries/configure-categories/
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!,
      userPoolClientId:
        process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID!,
      // CRUCIAL: Ensure your Cognito User Pool has a custom attribute named 'custom:role'
      // and your App Client has write permissions for it.
    },
  },
});

const components = {
  Header() { // Original Header
    return (
      <View className="mt-4 mb-7">
        <Heading level={3} className="!text-2xl !font-bold">
          Vande
          <span className="text-secondary-500 font-light hover:!text-primary-300">
            Poel
          </span>
        </Heading>
        <p className="text-muted-foreground mt-2">
          <span className="font-bold">Welcome!</span> Please sign in to continue
        </p>
      </View>
    );
  },
  SignIn: { // Original SignIn Footer
    Footer() {
      const { toSignUp } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <button
              onClick={toSignUp}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Sign up here
            </button>
          </p>
        </View>
      );
    },
  },
  SignUp: {
    FormFields() {
      const { validationErrors } = useAuthenticator();

      return (
        <>
          {/* Original Amplify Sign Up Fields */}
          <Authenticator.SignUp.FormFields /> 
          {/* --- MODIFICATION START --- */}
          <RadioGroupField
            legend="Role" // Kept original legend
            name="custom:role" // MUST match your Cognito custom attribute
            errorMessage={validationErrors?.["custom:role"]}
            hasError={!!validationErrors?.["custom:role"]}
            isRequired // Kept original isRequired
          >
            <Radio value="tenant">Tenant</Radio>
            <Radio value="manager">Manager</Radio>
            <Radio value="landlord">Landlord</Radio> {/* ADDED Landlord */}
            <Radio value="buyer">Buyer</Radio>     {/* ADDED Buyer */}
          </RadioGroupField>
          {/* --- MODIFICATION END --- */}
        </>
      );
    },

    Footer() { // Original SignUp Footer
      const { toSignIn } = useAuthenticator();
      return (
        <View className="text-center mt-4">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={toSignIn}
              className="text-primary hover:underline bg-transparent border-none p-0"
            >
              Sign in
            </button>
          </p>
        </View>
      );
    },
  },
};

const formFields = { // Original formFields
  signIn: {
    username: {
      placeholder: "Enter your email",
      label: "Email",
      isRequired: true,
    },
    password: {
      placeholder: "Enter your password",
      label: "Password",
      isRequired: true,
    },
  },
  signUp: {
    username: {
      order: 1,
      placeholder: "Choose a username",
      label: "Username",
      isRequired: true,
    },
    email: {
      order: 2,
      placeholder: "Enter your email address",
      label: "Email",
      isRequired: true,
    },
    password: {
      order: 3,
      placeholder: "Create a password",
      label: "Password",
      isRequired: true,
    },
    confirm_password: {
      order: 4,
      placeholder: "Confirm your password",
      label: "Confirm Password",
      isRequired: true,
    },
    // 'custom:role' will be handled by the RadioGroupField in components.SignUp.FormFields
    // No need to add 'custom:role' here unless you want to change its order or specific props
    // not covered by RadioGroupField directly.
  },
};

const Auth = ({ children }: { children: React.ReactNode }) => {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]); // Added authStatus for more robust checks
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === "/signin" || pathname === "/signup"; // Original check, slightly simplified from regex

  // --- MODIFICATION START ---
  const dashboardPrefixes = ["/manager", "/tenants", "/landlords", "/buyers"]; // ADDED landlord and buyer prefixes
  const isDashboardPage = dashboardPrefixes.some(prefix => pathname.startsWith(prefix));
  // --- MODIFICATION END ---


  // Redirect authenticated users away from auth pages
  useEffect(() => {
    // Original logic: if (user && isAuthPage) { router.push("/"); }
    // Using authStatus for more reliability:
    if (authStatus === 'authenticated' && isAuthPage) {
      router.replace("/"); // Using replace to avoid adding to history stack
    }
  }, [authStatus, isAuthPage, router]);  

  // Allow access to public pages without authentication
  if (!isAuthPage && !isDashboardPage) {
    return <>{children}</>;
  }

  // If the user is NOT authenticated and tries to access a dashboard page,
  // Authenticator wrapper will handle showing the sign-in form.
  // If the user IS authenticated, Authenticator will render its children (our page's children).

  return (
    <div className="h-full"> {/* Original wrapper div */}
      <Authenticator
        initialState={pathname.includes("signup") ? "signUp" : "signIn"}
        components={components}
        formFields={formFields}
        // loginMechanisms={['email']} // Add if you want to explicitly set this
        // signUpAttributes={['email', 'custom:role']} // 'custom:role' is handled by RadioGroupField
      >
        {/* This function is called when authenticated */}
        {({ signOut, user }) => <>{children}</>}
      </Authenticator>
    </div>
  );
};

export default Auth;