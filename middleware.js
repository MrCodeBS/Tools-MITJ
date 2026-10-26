// Vercel Edge Middleware - Server-side protection for premium content
// Protects /formelsammlung-rechner/Formelsammlung_Rechner.html

export const config = {
  matcher: ['/formelsammlung-rechner/Formelsammlung_Rechner.html'],
};

// Edge-compatible base64url decode (no atob in Edge runtime!)
function base64UrlDecode(str) {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  
  // Decode using Uint8Array (Edge-compatible)
  const binaryString = Uint8Array.from(
    [...base64].reduce((acc, char, i) => {
      const charCode = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(char);
      if (charCode === -1) return acc;
      
      acc.buffer = (acc.buffer << 6) | charCode;
      acc.bits += 6;
      
      while (acc.bits >= 8) {
        acc.bits -= 8;
        acc.bytes.push((acc.buffer >> acc.bits) & 0xFF);
      }
      return acc;
    }, { buffer: 0, bits: 0, bytes: [] }).bytes
  );
  
  return new TextDecoder().decode(binaryString);
}

// Decode JWT payload without cryptographic verification
// We verify validity via Clerk API instead
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export default async function middleware(request) {
  const loginUrl = new URL('/formelsammlung-rechner/login.html', request.url);
  const paywallUrl = new URL('/formelsammlung-rechner/paywall.html', request.url);

  try {
    // Get session token from Clerk cookie
    const sessionToken = request.cookies.get('__session')?.value;

    if (!sessionToken) {
      return Response.redirect(loginUrl);
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error('[Middleware] CLERK_SECRET_KEY not configured');
      return new Response('Server configuration error', { status: 503 });
    }

    // Decode JWT to extract session ID
    const payload = decodeJWT(sessionToken);
    if (!payload || !payload.sid) {
      return Response.redirect(loginUrl);
    }

    // Verify session is active via Clerk API (source of truth)
    const sessionRes = await fetch(`https://api.clerk.com/v1/sessions/${payload.sid}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!sessionRes.ok) {
      return Response.redirect(loginUrl);
    }

    const session = await sessionRes.json();
    if (session.status !== 'active') {
      return Response.redirect(loginUrl);
    }

    // Check if user has paid status in metadata
    const userRes = await fetch(`https://api.clerk.com/v1/users/${session.user_id}`, {
      headers: { 'Authorization': `Bearer ${clerkSecretKey}` },
    });

    if (!userRes.ok) {
      return Response.redirect(loginUrl);
    }

    const user = await userRes.json();
    const isPaid = user.public_metadata?.paid === true;

    if (!isPaid) {
      return Response.redirect(paywallUrl);
    }

    // ✅ User is authenticated AND paid - serve the content
    return;

  } catch (error) {
    console.error('[Middleware] Error:', error?.message || error);
    return Response.redirect(loginUrl);
  }
}
