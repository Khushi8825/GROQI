import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import googleAuthRoute from "./routes/googleAuth.route.js"; // ← NEW IMPORT

const app = express();

// app.use(cors());
 
// Allow requests from your React frontend
app.use(cors({ origin: "http://localhost:5173" })); // ← locked down (not open *)

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Because we mount it on "/api/auth", the full URL becomes:
//   POST http://localhost:5000/api/auth/google
app.use("/api/auth", googleAuthRoute); // ← ONE NEW LINE

// console.log("HF_TOKEN:", process.env.HF_API_KEY);
app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});