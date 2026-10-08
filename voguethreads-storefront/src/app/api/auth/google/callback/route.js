import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  if (error || !code) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error || "Authorization cancelled")}`);
  }

  // 1. Validate state parameter to mitigate CSRF attacks
  const expectedState = req.cookies.get("vt_oauth_state")?.value;
  if (!state || !expectedState || state !== expectedState) {
    console.error("Google OAuth state mismatch. Possible CSRF attack.");
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Google OAuth credentials missing from environment");
      return NextResponse.redirect(`${appUrl}/login?error=configuration_error`);
    }

    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // 2. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${appUrl}/login?error=token_exchange_failed`);
    }

    // 3. Fetch user profile from Google UserInfo
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await userRes.json();

    if (!profile?.email) {
      return NextResponse.redirect(`${appUrl}/login?error=no_email_provided`);
    }

    // 4. Connect to MongoDB and find or create customer
    await connectToDatabase();

    const cleanEmail = profile.email.toLowerCase().trim();
    let customer = await Customer.findOne({ email: cleanEmail });

    if (!customer) {
      customer = await Customer.create({
        name: profile.name || cleanEmail.split("@")[0],
        email: cleanEmail,
        avatar: profile.picture,
        authProvider: "google",
        googleId: profile.sub,
        emailVerified: true,
        status: "ACTIVE",
      });
    } else {
      if (profile.picture && !customer.avatar) {
        customer.avatar = profile.picture;
      }
      if (!customer.googleId) {
        customer.googleId = profile.sub;
      }
      customer.emailVerified = true;
      await customer.save();
    }

    const userPayload = {
      userId: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      avatar: customer.avatar || "",
      provider: "google",
    };

    // 5. Create signed JWT session token
    const token = await createSessionToken(userPayload);

    const clientUserData = {
      id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      avatar: customer.avatar,
      provider: "google",
      tier: "Member",
    };

    // 6. Return response that sets HttpOnly cookie and synchronizes client cache
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
        </head>
        <body style="background:#E8E4DC;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h2 style="font-size:18px;color:#141414;">Signed in with Google</h2>
            <p style="font-size:13px;color:#666;">Redirecting to your account...</p>
          </div>
          <script>
            try {
              localStorage.setItem("vt_user", JSON.stringify(${JSON.stringify(clientUserData)}));
              window.dispatchEvent(new Event("vt_auth_changed"));
            } catch (e) {
              console.error(e);
            }
            window.location.href = "/account";
          </script>
        </body>
      </html>
    `;

    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });

    // Attach signed session cookie and clear state cookie
    setSessionCookie(response, token);
    response.cookies.set({
      name: "vt_oauth_state",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Google OAuth server error:", err);
    return NextResponse.redirect(`${appUrl}/login?error=server_error`);
  }
}

