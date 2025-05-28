// ApplicationModal.tsx

import { CustomFormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ApplicationFormData, applicationSchema } from "@/lib/schemas";
// You'll need to import the Application type from your Mongoose types if you want better type safety for the payload
// For example, if you have a type like `ApplicationPostBodyFromFrontend`
// import { ApplicationPostBodyFromFrontend } from "@/types/yourApiTypes"; // Adjust path
import { useCreateApplicationMutation, useGetAuthUserQuery } from "@/state/api";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number; // Or string, depending on your property ID type
}

const ApplicationModal = ({
  isOpen,
  onClose,
  propertyId,
}: ApplicationModalProps) => {
  const [createApplication, { isLoading: isSubmitting }] = useCreateApplicationMutation(); // Removed mutationError as we handle errors below
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      message: "",
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (!authUser) {
      console.error("User not authenticated.");
      form.setError("root", { message: "Authentication required to submit an application." });
      return;
    }

    // userRole should be 'tenant' or 'buyer' as per your authUser structure
    const { userRole, cognitoInfo } = authUser;

    if (userRole !== "tenant" && userRole !== "buyer") {
      console.error(
        "You must be logged in as a tenant or buyer to submit an application. Current role:",
        userRole
      );
      form.setError("root", { message: "Your user role does not permit submitting applications." });
      return;
    }

    // Construct the payload according to the backend's expectations
    // (applicantCognitoId and applicantType)
    const applicationPayload = {
      ...data, // name, email, phoneNumber, message from the form
      // applicationDate is set by the backend Mongoose schema default
      status: "Pending", // Default status
      propertyId: propertyId,
      applicantCognitoId: cognitoInfo.userId, // Generic Cognito ID
      applicantType: userRole, // 'tenant' or 'buyer'
    };

    try {
      console.log("Submitting application payload:", applicationPayload);
      // The createApplication mutation expects a body that matches ApplicationPostBody from your API
      // If your RTK Query Application type is different, you might need a cast or ensure types align.
      // For now, assuming Partial<any> or a more specific frontend DTO type.
      await createApplication(applicationPayload as Partial<any> /* or YourApplicationPayloadType */).unwrap();
      form.reset();
      onClose();
    } catch (err: any) {
      console.error("Failed to submit application:", err);
      // Attempt to parse backend error message
      let errMsg = "An error occurred while submitting the application.";
      if (err.data) {
        if (typeof err.data.message === 'string') {
          errMsg = err.data.message;
        }
        if (err.data.errors) { // For Mongoose validation errors
          const validationErrors = Object.values(err.data.errors as Record<string, { message: string }>)
            .map(e => e.message)
            .join(", ");
          if (validationErrors) errMsg = `Validation failed: ${validationErrors}`;
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      form.setError("root", { message: errMsg });
    }
  };

  // Reset form errors if modal is closed externally
  React.useEffect(() => {
    if (!isOpen) {
      form.clearErrors();
    }
  }, [isOpen, form]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white">
        <DialogHeader className="mb-4">
          <DialogTitle>Submit Application for this Property</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {form.formState.errors.root && (
              <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
                {form.formState.errors.root.message}
              </p>
            )}
            <CustomFormField
              control={form.control}
              name="name"
              label="Name"
              type="text"
              placeholder="Enter your full name"
            />
            <CustomFormField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              placeholder="Enter your email address"
            />
            <CustomFormField
              control={form.control}
              name="phoneNumber"
              label="Phone Number"
              type="text"
              placeholder="Enter your phone number"
            />
            <CustomFormField
              control={form.control}
              name="message"
              label="Message (Optional)"
              type="textarea"
              placeholder="Enter any additional information"
            />
            <Button type="submit" className="bg-primary-700 text-white w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;