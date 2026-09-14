/**
 * /users routes — current user profile.
 */
import { Router, type IRouter } from "express";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/users/me", requireAuth, (req, res) => {
  const data = GetCurrentUserResponse.parse({
    ...req.storedUser!.user,
    role: req.storedUser!.role,
  });
  res.json(data);
});

export default router;
