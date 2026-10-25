// Vercel Edge Function - Server-side access validation
// This runs on Vercel's servers, not in the browser

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { sessionToken } = await request.json();

    if (!sessionToken) {
      return new Response(JSON.stringify({ access: false, error: 'No session token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify session with Clerk Backend API
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      console.error('CLERK_SECRET_KEY not configured');
      return new Response(JSON.stringify({ access: false, error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the session token and get user data
    const verifyResponse = await fetch('https://api.clerk.com/v1/sessions/' + sessionToken + '/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      // Try getting session directly
      const sessionResponse = await fetch(`https://api.clerk.com/v1/sessions/${sessionToken}`, {
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
        },
      });

      if (!sessionResponse.ok) {
        return new Response(JSON.stringify({ access: false, error: 'Invalid session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sessionData = await sessionResponse.json();
      const userId = sessionData.user_id;

      // Get user data to check paid status
      const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
        },
      });

      if (!userResponse.ok) {
        return new Response(JSON.stringify({ access: false, error: 'User not found' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userData = await userResponse.json();
      const isPaid = userData.public_metadata?.paid === true;

      return new Response(JSON.stringify({ 
        access: isPaid,
        userId: userId,
        email: userData.email_addresses?.[0]?.email_address,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await verifyResponse.json();
    const userId = sessionData.user_id;

    // Get user data to check paid status
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ access: false, error: 'User not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userData = await userResponse.json();
    const isPaid = userData.public_metadata?.paid === true;

    return new Response(JSON.stringify({ 
      access: isPaid,
      userId: userId,
      email: userData.email_addresses?.[0]?.email_address,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Verify access error:', error);
    return new Response(JSON.stringify({ access: false, error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
