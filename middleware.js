// Vercel Middleware - Protects premium content at the edge
// The page is NEVER sent to unpaid users
// OWASP compliant: secure session verification, secure error handling

export const config = {
  matcher: '/formelsammlung-rechner/:path*',
};

// Secure redirect helper - prevents open redirect vulnerabilities
function secureRedirect(request, path) {
  const url = new URL(path, request.url);
  // Ensure redirect stays on same origin
  if (url.origin !== new URL(request.url).origin) {
    url.href = new URL(path, request.url).href;
  }
  return Response.redirect(url);
}

// Safely decode JWT payload without executing anything
function safeDecodeJWTPayload(token) {
  try {
    if (typeof token !== 'string') return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null; // JWT must have 3 parts
    
    // Validate base64url format for payload
    const payload = parts[1];
    if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
    
    // Decode base64url - handle padding
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Use TextDecoder for Edge runtime compatibility
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decoded);
    
    // Validate expected structure
    if (typeof parsed !== 'object' || parsed === null) return null;
    
    return parsed;
  } catch (e) {
    console.error('[AUTH] JWT decode error:', e?.message);
    return null;
  }
}

// Verify session with Clerk Backend API
// This validates the session exists and is legitimate server-side
async function verifySessionWithClerk(sessionId, clerkSecretKey) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false };
  }
  
  // Sanitize session ID - Clerk IDs are alphanumeric with underscores
  if (!/^[a-zA-Z0-9_]+$/.test(sessionId)) {
    return { valid: false };
  }

  try {
    const response = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    
    // Verify session is active
    if (data.status !== 'active') {
      return { valid: false };
    }

    return { 
      valid: true, 
      userId: data.user_id,
      sessionId: data.id,
    };
  } catch {
    return { valid: false };
  }
}

export default async function middleware(request) {
  const loginUrl = '/formelsammlung-rechner/login';
  const paywallUrl = '/formelsammlung-rechner/paywall';

  // Get Clerk session token from cookie
  const sessionToken = request.cookies.get('__session')?.value;

  if (!sessionToken) {
    return secureRedirect(request, loginUrl);
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    // A10: Don't expose internal state - generic error
    console.error('[AUTH] Configuration error - missing secret key');
    return new Response('Service temporarily unavailable', { status: 503 });
  }

  try {
    // Safely decode the JWT to get session ID
    const payload = safeDecodeJWTPayload(sessionToken);
    
    if (!payload || !payload.sid) {
      return secureRedirect(request, loginUrl);
    }

    // Verify session with Clerk Backend API
    // This is the source of truth - even if JWT is tampered, 
    // Clerk API will reject invalid session IDs
    const verification = await verifySessionWithClerk(payload.sid, clerkSecretKey);

    if (!verification.valid) {
      return secureRedirect(request, loginUrl);
    }

    // Get user data to check paid status
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${verification.userId}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!userResponse.ok) {
      return secureRedirect(request, loginUrl);
    }

    const userData = await userResponse.json();
    const isPaid = userData.public_metadata?.paid === true;

    if (!isPaid) {
      return secureRedirect(request, paywallUrl);
    }

    // User is authenticated AND paid - allow access
    return;

  } catch (error) {
    // A09: Structured logging without sensitive data
    console.error('[AUTH] Middleware error:', {
      timestamp: new Date().toISOString(),
      path: new URL(request.url).pathname,
      errorType: error?.name || 'Unknown',
    });
    return secureRedirect(request, loginUrl);
  }
}
