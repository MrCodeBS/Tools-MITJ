// Vercel Middleware - Protects premium content at the edge
// The page is NEVER sent to unpaid users

export const config = {
  matcher: '/formelsammlung-rechner/:path*',
};

export default async function middleware(request) {
  // Get Clerk session token from cookie
  const sessionToken = request.cookies.get('__session')?.value;
  
  if (!sessionToken) {
    // No session - redirect to login page
    return Response.redirect(new URL('/formelsammlung-rechner/login', request.url));
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  
  if (!clerkSecretKey) {
    return new Response('Server configuration error', { status: 500 });
  }

  try {
    // Verify the JWT and get claims
    // Clerk JWTs contain the session ID in the 'sid' claim
    const payload = JSON.parse(atob(sessionToken.split('.')[1]));
    const sessionId = payload.sid;

    if (!sessionId) {
      return Response.redirect(new URL('/formelsammlung-rechner/login', request.url));
    }

    // Verify session with Clerk API
    const sessionResponse = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!sessionResponse.ok) {
      return Response.redirect(new URL('/formelsammlung-rechner/login', request.url));
    }

    const sessionData = await sessionResponse.json();
    
    if (sessionData.status !== 'active') {
      return Response.redirect(new URL('/formelsammlung-rechner/login', request.url));
    }

    // Get user data to check paid status
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${sessionData.user_id}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!userResponse.ok) {
      return Response.redirect(new URL('/formelsammlung-rechner/login', request.url));
    }

    const userData = await userResponse.json();
    const isPaid = userData.public_metadata?.paid === true;

    if (!isPaid) {
      // User is logged in but not paid - show paywall
      return Response.redirect(new URL('/formelsammlung-rechner/paywall', request.url));
    }

    // User is authenticated AND paid - allow access
    return;

  } catch (error) {
    console.error('Middleware error:', error);
    return Response.redirect(new URL('/formelsammlung-rechner/login', request.url));
  }
}
