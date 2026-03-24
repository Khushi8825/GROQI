import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contact_no: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      alert("Registered successfully ✅");

      navigate("/login"); // back to login
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-80">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            name="name"
            placeholder="Name"
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />

          <input
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />

          <input
            name="contact_no"
            placeholder="Phone"
            onChange={handleChange}
            className="p-2 border rounded"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            className="p-2 border rounded"
            required
          />

          <button className="bg-green-500 text-white p-2 rounded hover:bg-green-600 transition">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}