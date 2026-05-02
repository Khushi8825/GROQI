import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// console.log("HF_TOKEN:", process.env.HF_API_KEY);
app.listen(5000, () => {
  console.log("🚀 Backend running on http://localhost:5000");
});