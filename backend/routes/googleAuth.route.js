// ============================================================
// googleAuth.route.js  —  One route, same as learning project
// ============================================================
// Your learning project had:   router.post("/google", googleController)
// This is IDENTICAL — no changes needed here
// ============================================================

import express from "express";
import googleController from "../controller/google.controller.js";

const router = express.Router();

// POST /api/auth/google
// Frontend sends { code } → controller exchanges it with Google → returns JWT
router.post("/google", googleController);

export default router;