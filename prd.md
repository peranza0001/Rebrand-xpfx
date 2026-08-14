# prd.md — Product Requirements Document

**→ Full documentation is in [/docs/PRD.md](/docs/PRD.md)**

This is a quick link file. For the complete PRD, see the main file above.

---

## Quick Summary

**XpressPro FX** is an enterprise-grade forex trading platform with:

- ✅ Real-time trading engine (forex, crypto, commodities)
- ✅ Multi-currency wallet management
- ✅ Investment management (managed accounts, fund managers)
- ✅ Admin governance with approval workflows
- ✅ KYC/AML compliance
- ✅ Payment processing (Moonpay, Paystack, Coinbase)
- ✅ P2P trading and messaging
- ✅ Demo trading with simulated funds
- ✅ Production-safe defaults for local, VPS, Railway, Vercel, and custom-domain deployments

### Secure Production Defaults

```bash
NODE_ENV=production
PORT=8080
ENABLE_DEMO_AUTH=false
ALLOWED_ORIGINS=https://xpressprofx.com,https://www.xpressprofx.com,https://rebrand-xpfx-production-1988.up.railway.app,http://localhost:3000,http://localhost:5173,http://localhost:5174
```

These values are the default bootstrap set used to keep the app stable when a platform does not yet expose the real production secrets.

### Key Features
1. **Trading** - Spot trading, demo accounts, order management
2. **Wallets** - Multi-currency, encrypted storage, blockchain integration
3. **Investments** - Managed accounts, performance tracking
4. **Admin** - Approval workflows, user management, compliance
5. **KYC** - Document verification, tier-based limits
6. **Payments** - Deposits, withdrawals, debit cards
7. **P2P** - User-to-user trading, messaging, disputes
8. **Education** - Market analysis, support, onboarding

### Business Rules (CRITICAL)
- ✅ **All withdrawals require admin approval** (mandatory)
- ✅ Demo accounts: $10K simulated balance
- ✅ KYC reviews: 7-day SLA
- ✅ Admin OTPs: 10-minute expiry
- ✅ Referral rewards: $500 USD per signup

---

## 📖 Read the Full PRD

[→ See /docs/PRD.md for complete product requirements](/docs/PRD.md)
