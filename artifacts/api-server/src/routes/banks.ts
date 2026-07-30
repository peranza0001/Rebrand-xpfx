/**
 * /banks routes — list, link, and self-update bank accounts.
 */
import { Router, type IRouter } from "express";
import {
  LinkBankAccountBody,
  UpdateOwnBankAccountBody,
  type BankAccount,
} from "@workspace/api-zod";
import { getUserData, logActivity, newId, NOW } from "../lib/store";
import { persistBankAccount } from "../lib/db-persist";
import { requireAuth } from "../lib/session";

const router: IRouter = Router();

router.get("/banks", requireAuth, (req, res) => {
  return res.json(getUserData(req.userId!).bankAccounts);
});

router.post("/banks", requireAuth, (req, res) => {
  const parsed = LinkBankAccountBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid bank link", details: parsed.error.issues });
  }
  const u = req.storedUser!.user;
  const data = getUserData(req.userId!);
  const last4 = parsed.data.accountNumber.slice(-4).padStart(4, "0");
  const bank: BankAccount = {
    id: newId("bank"),
    userId: u.id,
    bankName: parsed.data.bankName,
    accountHolder: parsed.data.accountHolder,
    last4,
    currency: parsed.data.currency,
    verified: false,
    isDefault: false,
    fiatBalance: 0,
    fiatCurrency: parsed.data.currency,
    createdAt: NOW(),
  };
  data.bankAccounts.unshift(bank);
  void persistBankAccount(bank.id, u.id, {
    accountName: bank.accountHolder,
    bankName: bank.bankName,
    accountNumber: parsed.data.accountNumber,
    routingNumber: null,
    iban: null,
    swiftCode: null,
    debitCardLast4: null,
    debitCardExpiry: null,
    country: u.country,
    currency: bank.currency,
    isDefault: bank.isDefault ?? false,
    fiatBalance: bank.fiatBalance,
    fiatCurrency: bank.fiatCurrency,
  });
  logActivity({
    actorId: u.id,
    actorName: u.fullName,
    action: "bank.link",
    detail: `Linked bank ${parsed.data.bankName} ****${last4}`,
  });
  return res.json(bank);
});

router.patch("/banks/:bankId", requireAuth, (req, res) => {
  const bankId = req.params["bankId"] as string;
  const data = getUserData(req.userId!);
  const bank = data.bankAccounts.find((b) => b.id === bankId);
  if (!bank) return res.status(404).json({ error: "Bank account not found" });

  const parsed = UpdateOwnBankAccountBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.issues });
  }
  if (parsed.data.fiatBalance !== undefined) {
    if (parsed.data.fiatBalance < 0) {
      return res.status(400).json({ error: "fiatBalance cannot be negative" });
    }
    bank.fiatBalance = parsed.data.fiatBalance;
  }
  if (parsed.data.fiatCurrency !== undefined && parsed.data.fiatCurrency.length > 0) {
    bank.fiatCurrency = parsed.data.fiatCurrency.toUpperCase();
  }

  const u = req.storedUser!.user;
  void persistBankAccount(bank.id, u.id, {
    accountName: bank.accountHolder,
    bankName: bank.bankName,
    accountNumber: undefined,
    routingNumber: undefined,
    iban: undefined,
    swiftCode: undefined,
    debitCardLast4: undefined,
    debitCardExpiry: undefined,
    country: u.country,
    currency: bank.currency,
    isDefault: bank.isDefault ?? false,
    fiatBalance: bank.fiatBalance,
    fiatCurrency: bank.fiatCurrency,
  });
  logActivity({
    actorId: u.id,
    actorName: u.fullName,
    action: "bank.update_balance",
    detail: `Updated fiat balance on ${bank.bankName} ****${bank.last4} to ${bank.fiatBalance} ${bank.fiatCurrency}.`,
  });
  return res.json(bank);
});

export default router;
