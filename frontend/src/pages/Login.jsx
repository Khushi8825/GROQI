import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.token) {
        alert("Login failed");
        return;
      }

      // ✅ Save token + user_id
      localStorage.setItem("token", data.token);
      localStorage.setItem("user_id", data.user.id);

      alert("Login successful ✅");
            const userId = data.user.id;

      await fetch(`http://localhost:5000/api/chat/history/${userId}`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });
      navigate("/"); // go back to chat
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };
  // ── NEW: Google Login — same logic as your learning project ───────────────
  // This redirects the user to Google's login page.
  // After they approve, Google sends them back to /auth/google/callback with a code.
  const handleGoogleLogin = () => {
    const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, // from frontend .env
      redirect_uri: "http://localhost:5173/auth/google/callback", // must match Google Console
      response_type: "code",         // we want an auth code (not a token directly)
      scope: "openid profile email", // what info we want from Google
      access_type: "offline",        // allows refresh tokens
      prompt: "consent",             // always show Google's permission screen
    });

    // Redirect the browser to Google's OAuth login page
    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-80">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        {/* Existing email/password form (UNCHANGED) */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />
          <button className="bg-indigo-500 text-white p-2 rounded hover:bg-indigo-600 transition">
            Login
          </button>
        </form>

        {/* ── Divider ── */}
        <div className="flex items-center my-4">
          <hr className="flex-1 border-gray-300" />
          <span className="mx-3 text-gray-400 text-sm">or</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* ── NEW: Google Login Button ── */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 p-2 rounded hover:bg-gray-50 transition"
        >
          {/* Google's "G" logo using their official colors */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-gray-700 text-sm font-medium">Continue with Google</span>
        </button>

        <p className="mt-4 text-sm text-center">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-600 cursor-pointer font-semibold"
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}
