// Vercel Middleware - Protects premium content at the edge
// OWASP compliant: secure session verification

export const config = {
  matcher: '/formelsammlung-rechner/:path*',
};

export default async function middleware(request) {
  const loginUrl = new URL('/formelsammlung-rechner/login', request.url);
  const paywallUrl = new URL('/formelsammlung-rechner/paywall', request.url);

  // Get Clerk session token from cookie
  const sessionCookie = request.cookies.get('__session');
  const sessionToken = sessionCookie?.value;

  if (!sessionToken) {
    return Response.redirect(loginUrl);
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    console.error('[AUTH] Missing CLERK_SECRET_KEY');
    return new Response('Service temporarily unavailable', { status: 503 });
  }

  try {
    // Decode JWT payload to get session ID
    // JWT format: header.payload.signature
    const parts = sessionToken.split('.');
    if (parts.length !== 3) {
      return Response.redirect(loginUrl);
    }

    // Decode base64url payload
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    const sessionId = payload.sid;

    if (!sessionId) {
      return Response.redirect(loginUrl);
    }

    // Verify session with Clerk API
    const sessionResponse = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!sessionResponse.ok) {
      return Response.redirect(loginUrl);
    }

    const sessionData = await sessionResponse.json();
    
    if (sessionData.status !== 'active') {
      return Response.redirect(loginUrl);
    }

    // Get user data to check paid status
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${sessionData.user_id}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!userResponse.ok) {
      return Response.redirect(loginUrl);
    }

    const userData = await userResponse.json();
    const isPaid = userData.public_metadata?.paid === true;

    if (!isPaid) {
      return Response.redirect(paywallUrl);
    }

    // User is authenticated AND paid - allow access
    return;

  } catch (error) {
    console.error('[AUTH] Error:', error?.message || error);
    return Response.redirect(loginUrl);
  }
}
