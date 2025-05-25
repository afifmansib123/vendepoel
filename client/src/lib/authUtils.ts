// src/lib/authUtils.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface DecodedToken extends JwtPayload {
  sub: string;
  'custom:role'?: string;
  // Potentially other claims like 'token_use'
}

export interface AuthenticatedUser {
  id: string; // cognito sub (userId)
  role: string;
}

export async function authenticateAndAuthorize(
  request: NextRequest,
  allowedRoles: string[] // e.g., ['manager'], or empty array to just check for authentication
): Promise<AuthenticatedUser | NextResponse> {
  const authorizationHeader = request.headers.get('Authorization');
  console.log('[AuthUtil] Authorization Header:', authorizationHeader);

  if (!authorizationHeader) {
    console.warn('[AuthUtil] Missing Authorization header.');
    return NextResponse.json({ message: 'Unauthorized: Missing Authorization header' }, { status: 401 });
  }

  const tokenParts = authorizationHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer' || !tokenParts[1]) {
    console.warn('[AuthUtil] Invalid Authorization header format.');
    return NextResponse.json({ message: 'Unauthorized: Invalid Authorization header format' }, { status: 401 });
  }
  const token = tokenParts[1];
  console.log('[AuthUtil] Token extracted.');

  try {
    // IMPORTANT: For production, VERIFY the token signature using JWKS.
    // jwt.decode() DOES NOT VERIFY. This is for simplicity matching your old code.
    // Consider using 'aws-jwt-verify' or 'jsonwebtoken' with a proper JWKS verifier.
    const decoded = jwt.decode(token) as DecodedToken | null;
    console.log('[AuthUtil] Decoded token payload:', decoded);

    if (!decoded || !decoded.sub /* || decoded.token_use !== 'id' */) { // If it's an ID token, check token_use
      console.warn('[AuthUtil] Token is invalid, malformed, or not an ID token / sub missing.');
      return NextResponse.json({ message: 'Invalid or malformed token' }, { status: 400 });
    }

    const userRole = (decoded['custom:role'] || '').toLowerCase();
    console.log(`[AuthUtil] User Sub (ID): ${decoded.sub}, Role from token: '${userRole}'`);

    if (allowedRoles.length > 0) { // Only check roles if allowedRoles is not empty
        if (!userRole) {
            console.warn(`[AuthUtil] Access Denied: User ${decoded.sub} has no role, but roles ${allowedRoles.join(', ')} are required.`);
            return NextResponse.json({ message: 'Access Denied: User role not found in token' }, { status: 403 });
        }
        if (!allowedRoles.includes(userRole)) {
          console.warn(`[AuthUtil] Access Denied: User ${decoded.sub} with role '${userRole}' not in allowed roles [${allowedRoles.join(', ')}].`);
          return NextResponse.json({ message: 'Access Denied: Insufficient permissions' }, { status: 403 });
        }
        console.log(`[AuthUtil] Role check passed for user ${decoded.sub} with role '${userRole}'.`);
    } else {
        console.log(`[AuthUtil] No specific roles required, authentication check passed for user ${decoded.sub}.`);
    }


    return {
      id: decoded.sub,
      role: userRole,
    };
  } catch (err: any) {
    console.error('[AuthUtil] Error during token processing:', err);
    return NextResponse.json({ message: 'Invalid token or processing error' }, { status: 400 });
  }
}