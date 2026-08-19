/**
 * /kyc routes — get and submit KYC.
 */
import { Router, type IRouter } from "express";
import { SubmitKycBody } from "@workspace/api-zod";
import { getUserData, logActivity, newUuid, NOW } from "../lib/store";
import { persistKyc } from "../lib/db-persist";
import { requireAuth } from "../lib/session";
import { pushAdminAlert } from "../lib/notify";

const router: IRouter = Router();

router.get("/kyc", requireAuth, (req, res) => {
  return res.json(getUserData(req.userId!).kyc);
});

router.post("/kyc", requireAuth, async (req, res) => {
  const parsed = SubmitKycBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid KYC submission", details: parsed.error.issues });
  }
  const data = getUserData(req.userId!);
  data.kyc = {
    ...data.kyc,
    status: "pending",
    idType: parsed.data.idType,
    idNumber: parsed.data.idNumber,
    addressLine1: parsed.data.addressLine1,
    city: parsed.data.city,
    country: parsed.data.country,
    rejectionReason: null,
    submittedAt: NOW(),
    decidedAt: null,
  };
  const kycId = newUuid();
  await persistKyc(kycId, req.userId!, {
    documentType: parsed.data.idType,
    status: "pending",
  });
  logActivity({
    actorId: req.userId!,
    actorName: req.storedUser!.user.fullName,
    action: "kyc.submit",
    detail: `Submitted KYC (${parsed.data.idType})`,
  });
  pushAdminAlert({
    kind: "kyc.submitted",
    title: "KYC submitted",
    body: `${req.storedUser!.user.email} submitted KYC (${parsed.data.idType}, ${parsed.data.country}). Pending review.`,
    userId: req.userId!,
    userEmail: req.storedUser!.user.email,
    severity: "info",
    linkUrl: `/users/${req.userId}`,
    email: true,
  });
  return res.json(data.kyc);
});

export default router;
