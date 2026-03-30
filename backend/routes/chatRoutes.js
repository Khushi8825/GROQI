import express from "express";
import {
  handleChat,
  getHistory,
  getAnalytics,
} from "../controller/chatController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", handleChat);
router.get("/history/:user_id", authMiddleware, getHistory);
router.get("/analytics/:user_id", authMiddleware, getAnalytics);

export default router;