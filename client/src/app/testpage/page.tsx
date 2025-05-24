// src/app/test-applications/page.tsx
"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import {
  useGetApplicationsQuery,
  useCreateApplicationMutation,
  useUpdateApplicationStatusMutation,
} from '@/state/api'; // Adjust path if your api.ts is elsewhere
import { ApplicationFromAPI } from '@/types/apiReturnTypes'; // Adjust path

const styles = { /* ... Same styles object as previous test pages ... */
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' },
  section: { marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' },
  heading: { borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 },
  input: { marginRight: '10px', padding: '8px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '3px', width: 'calc(100% - 22px)' },
  button: { padding: '8px 15px', cursor: 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '3px', marginRight: '5px', marginBottom: '5px'},
  select: { marginRight: '10px', padding: '8px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '3px' },
  textarea: { width: 'calc(100% - 22px)', padding: '8px', border: '1px solid #ddd', borderRadius: '3px', minHeight: '80px'},
  pre: { backgroundColor: '#f5f5f5', padding: '10px', border: '1px solid #eee', borderRadius: '3px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '400px', overflowY: 'auto' },
  error: { color: 'red', fontSize: '0.9em' },
  notice: { fontStyle: 'italic', color: '#555', fontSize: '0.9em', marginBottom: '10px'},
  formGroup: { marginBottom: '10px'}
};

const APPLICATION_STATUSES = ['Pending', 'Approved', 'Denied'] as const;
type AppStatus = typeof APPLICATION_STATUSES[number];

export default function TestApplicationsPage() {
  // --- State for Inputs ---
  const [filterUserId, setFilterUserId] = useState<string>(''); // Cognito ID for filtering
  const [filterUserType, setFilterUserType] = useState<'tenant' | 'manager' | ''>('');

  // For creating an application
  const [createAppPropertyId, setCreateAppPropertyId] = useState<string>('');
  const [createAppTenantCognitoId, setCreateAppTenantCognitoId] = useState<string>('');
  const [createAppName, setCreateAppName] = useState<string>('');
  const [createAppEmail, setCreateAppEmail] = useState<string>('');
  const [createAppPhone, setCreateAppPhone] = useState<string>('');
  const [createAppMessage, setCreateAppMessage] = useState<string>('');
  const [createAppStatus, setCreateAppStatus] = useState<AppStatus>('Pending');


  // For updating application status
  const [updateAppId, setUpdateAppId] = useState<string>('');
  const [updateAppNewStatus, setUpdateAppNewStatus] = useState<AppStatus>('Approved');


  // --- RTK Query Hooks ---
  const { data: applications, error: getAppsError, isLoading: getAppsLoading, isFetching: getAppsFetching, refetch: refetchApplications } =
    useGetApplicationsQuery(
        { userId: filterUserId || undefined, userType: filterUserType || undefined },
        { skip: !filterUserId && !filterUserType } // Skip if no filters, or modify to fetch all if desired
    );
    // To fetch ALL applications initially, remove the skip or change condition:
    // useGetApplicationsQuery({});

  const [createApplication, { isLoading: createApplicationLoading }] = useCreateApplicationMutation();
  const [updateApplicationStatus, { isLoading: updateStatusLoading }] = useUpdateApplicationStatusMutation();


  const handleCreateApplication = async (e: FormEvent) => {
    e.preventDefault();
    if (!createAppPropertyId || !createAppTenantCognitoId || !createAppName || !createAppEmail || !createAppPhone) {
      alert('Please fill all required fields for new application.');
      return;
    }
    try {
      const payload = {
        propertyId: Number(createAppPropertyId),
        tenantCognitoId: createAppTenantCognitoId,
        name: createAppName,
        email: createAppEmail,
        phoneNumber: createAppPhone,
        message: createAppMessage,
        status: createAppStatus, // Initial status
        // applicationDate is set by backend
      };
      console.log("Creating application with payload:", payload);
      await createApplication(payload).unwrap();
      alert('Application created successfully! Refetching applications list...');
      refetchApplications();
      // Clear form
      setCreateAppPropertyId(''); setCreateAppTenantCognitoId(''); /* ... and other create fields */
    } catch (err: any) {
      const errorMsg = err?.data?.message || err?.message || 'Failed to create application.';
      alert(errorMsg);
      console.error("Create Application Error:", err);
    }
  };

  const handleUpdateStatus = async (e: FormEvent) => {
    e.preventDefault();
    if (!updateAppId || !updateAppNewStatus) {
      alert('Application ID and new status are required.');
      return;
    }
    try {
      await updateApplicationStatus({ id: Number(updateAppId), status: updateAppNewStatus }).unwrap();
      alert('Application status updated successfully! Refetching applications list...');
      refetchApplications();
    } catch (err: any)      {
      const errorMsg = err?.data?.message || err?.message || 'Failed to update application status.';
      alert(errorMsg);
      console.error("Update Application Status Error:", err);
    }
  };

  const renderError = (error: any, context: string) => { /* ... Same as in previous test pages ... */
    if (!error) return null;
    let errorMessage = `Unknown error in ${context}.`;
     if (typeof error === 'object' && error !== null) {
        if ('status' in error && 'data' in error) {
            const errorData = (error as any).data as { message?: string; error?: string; errors?: any };
            errorMessage = `Error ${error.status} in ${context}: ${errorData?.message || errorData?.error || JSON.stringify(errorData)}`;
        } else if ('message' in error) {
            errorMessage = `Error in ${context}: ${(error as Error).message}`;
        }
    }
    return <p style={styles.error}>{errorMessage}</p>;
  };


  return (
    <div style={styles.container}>
      <h1>Application API Test Page</h1>

      {/* Section 1: Get Applications */}
      <div style={styles.section}>
        <h2 style={styles.heading}>1. Get Applications</h2>
        <div style={styles.formGroup}>
          <label htmlFor="filterUserId">Filter by User ID (Cognito ID):</label>
          <input id="filterUserId" type="text" style={styles.input} placeholder="Tenant or Manager Cognito ID" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="filterUserType">Filter by User Type:</label>
          <select id="filterUserType" style={styles.select} value={filterUserType} onChange={(e) => setFilterUserType(e.target.value as any)}>
            <option value="">All Types / No Type Filter</option>
            <option value="tenant">Tenant</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <button style={styles.button} onClick={() => refetchApplications()} disabled={getAppsLoading || getAppsFetching}>
          {getAppsLoading || getAppsFetching ? 'Refreshing Applications...' : 'Fetch/Refresh Applications'}
        </button>
        {(getAppsLoading && !getAppsFetching) && <p>Loading applications...</p>}
        {renderError(getAppsError, "fetching applications")}
        {applications && <pre style={styles.pre}>{JSON.stringify(applications, null, 2)}</pre>}
        {(!applications && !getAppsLoading && !getAppsError) && <p>No applications found for current filters or data is being fetched.</p>}
      </div>

      {/* Section 2: Create Application */}
      <div style={styles.section}>
        <h2 style={styles.heading}>2. Create New Application</h2>
        <form onSubmit={handleCreateApplication}>
          <div style={styles.formGroup}><label>Property ID (numeric): <input type="text" style={styles.input} value={createAppPropertyId} onChange={e => setCreateAppPropertyId(e.target.value)} required /></label></div>
          <div style={styles.formGroup}><label>Tenant Cognito ID: <input type="text" style={styles.input} value={createAppTenantCognitoId} onChange={e => setCreateAppTenantCognitoId(e.target.value)} required /></label></div>
          <div style={styles.formGroup}><label>Applicant Name: <input type="text" style={styles.input} value={createAppName} onChange={e => setCreateAppName(e.target.value)} required /></label></div>
          <div style={styles.formGroup}><label>Applicant Email: <input type="email" style={styles.input} value={createAppEmail} onChange={e => setCreateAppEmail(e.target.value)} required /></label></div>
          <div style={styles.formGroup}><label>Applicant Phone: <input type="tel" style={styles.input} value={createAppPhone} onChange={e => setCreateAppPhone(e.target.value)} required /></label></div>
          <div style={styles.formGroup}><label>Initial Status:
            <select style={styles.select} value={createAppStatus} onChange={e => setCreateAppStatus(e.target.value as AppStatus)}>
                {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label></div>
          <div style={styles.formGroup}><label>Message (optional): <textarea style={styles.textarea} value={createAppMessage} onChange={e => setCreateAppMessage(e.target.value)} /></label></div>
          <button type="submit" style={styles.button} disabled={createApplicationLoading}>
            {createApplicationLoading ? 'Creating...' : 'Create Application'}
          </button>
        </form>
      </div>

      {/* Section 3: Update Application Status */}
      <div style={styles.section}>
        <h2 style={styles.heading}>3. Update Application Status</h2>
        <form onSubmit={handleUpdateStatus}>
          <div style={styles.formGroup}><label>Application ID (numeric): <input type="text" style={styles.input} value={updateAppId} onChange={e => setUpdateAppId(e.target.value)} required /></label></div>
          <div style={styles.formGroup}><label>New Status:
            <select style={styles.select} value={updateAppNewStatus} onChange={e => setUpdateAppNewStatus(e.target.value as AppStatus)} required>
                 {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label></div>
          <button type="submit" style={styles.button} disabled={updateStatusLoading}>
            {updateStatusLoading ? 'Updating Status...' : 'Update Status'}
          </button>
        </form>
      </div>
    </div>
  );
}