import express from "express";
import {
  register,
  login,
  getProfile,
  createAnonymousUser,
} from "../controller/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/anonymous", createAnonymousUser);
router.get("/me", authMiddleware, getProfile);

export default router;