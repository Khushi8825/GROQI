// ============================================================
// GoogleCallback.jsx  —  NEW PAGE (add to your pages/ folder)
// ============================================================
// In your LEARNING project, this logic was inside Homepage.jsx.
// The idea is IDENTICAL — we just put it in its own clean page.
//
// What this page does:
//   1. Google redirects the user here after they approve login
//   2. The URL contains a "code" parameter  (?code=4/abc123...)
//   3. We extract that code and send it to our backend
//   4. Backend verifies it with Google and returns a JWT token
//   5. We store the token in localStorage and go to the chat
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in with Google..."); // show a message while loading

  useEffect(() => {
    // This runs once when the page loads (same as your learning project's useEffect)
    handleGoogleCallback();
  }, []);

  const handleGoogleCallback = async () => {
    try {
      // STEP 1: Extract the "code" from the URL
      // When Google redirects here, the URL looks like:
      //   http://localhost:5173/auth/google/callback?code=4/abc123&scope=...
      // We use URLSearchParams to read the "code" query parameter
      const code = new URLSearchParams(window.location.search).get("code");
      console.log("📨 Got auth code from Google URL");

      if (!code) {
        setStatus("❌ No code found. Please try logging in again.");
        return;
      }

      // STEP 2: Send the code to our backend
      // Our backend will talk to Google, verify the code, and return a JWT
      // This is IDENTICAL to your learning project's sendCodeToBackend()
      setStatus("Verifying with Google...");

      const response = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }), // send { code: "4/abc123..." }
      });

      const data = await response.json();

      if (!data.success || !data.token) {
        setStatus("❌ Google login failed. Please try again.");
        return;
      }

      // STEP 3: Store the JWT token — SAME as your email/password login does
      // Now this user is "logged in" and all protected routes will work
      localStorage.setItem("token", data.token);
      localStorage.setItem("user_id", String(data.user.id));
      localStorage.setItem("user_name", data.user.name);
      localStorage.setItem("user_avatar", data.user.avatar || ""); // Google profile pic

      console.log("✅ Google login success:", data.user.email);
      setStatus("✅ Login successful! Redirecting...");

      // STEP 4: Go to the chat page
      navigate("/");

    } catch (error) {
      console.error("Google Callback Error:", error);
      setStatus("❌ Something went wrong. Please try again.");
    }
  };

  // Show a loading screen while we process the login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center w-80">
        {/* Spinning loader */}
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">{status}</p>
      </div>
    </div>
  );
}
