# XpressPro FX — Product Requirements Document (PRD)

**Version**: 1.0.0  
**Last Updated**: 2026-08-13  
**Status**: Enterprise Production

---

## Executive Summary

**XpressPro FX** is a production-ready, enterprise-grade hybrid fintech platform combining forex trading, investment management, and peer-to-peer (P2P) financial services. It provides users with a complete ecosystem for trading, wealth management, and financial transactions.

### Key Market Position
- **Primary Market**: Retail and institutional forex/crypto traders
- **Geographic Scope**: Global (with regional compliance support)
- **Regulatory Model**: Broker + fintech platform hybrid
- **Revenue Model**: Transaction fees, account tier subscriptions, premium features

---

## Product Vision

### Core Mission
Enable users to trade forex, crypto assets, and participate in managed investment accounts with institutional-grade tools, security, and compliance integrated seamlessly into a modern web application.

### Key Pillars
1. **Trading Platform** - Real-time forex & crypto trading with demo accounts
2. **Wallet Management** - Multi-currency, multi-blockchain support with cold/hot wallet integration
3. **Investment Management** - Managed accounts with professional fund managers
4. **Admin Governance** - Multi-level admin approval workflows for critical operations
5. **P2P Trading** - User-to-user trading and peer lending
6. **KYC/Compliance** - Document verification and regulatory compliance
7. **Financial Services** - Bank deposits, withdrawals, debit cards, payment processors

---

## Product Features (By Module)

### 1. Trading Engine
- **Spot Trading**: Buy/sell forex pairs and crypto assets
- **Demo Trading**: Risk-free practice accounts with simulated funds
- **Asset Catalog**: Dynamic pricing, 24-hour change tracking
- **Real-Time Quotes**: WebSocket-based price feeds
- **Order Management**: Market, limit, and conditional orders
- **Trade History**: Full audit trail with settlement tracking
- **Performance Metrics**: Win rate, ROI, drawdown calculations

### 2. Wallet Management
- **Multi-Currency Support**: USD, EUR, GBP, crypto (ETH, BTC, etc.)
- **Connected Wallets**: Import external blockchain wallets
- **Wallet Encryption**: AES-256 encryption for sensitive keys
- **Fiat Balances**: Bank account linked balances
- **Default Account**: Primary wallet for transactions
- **Balance Tracking**: Real-time portfolio valuation

### 3. Account & User Management
- **User Registration**: Email-based signup with OTP verification
- **Authentication**: Password + PIN dual-factor authentication
- **Session Management**: Secure cookie-based sessions
- **User Profiles**: Personal information, KYC status, account tier
- **Referral Program**: Earn rewards for successful referrals ($500 default)
- **Account Tiers**: Different trading limits and features by tier

### 4. Investment Management
- **Manager Directory**: Curated list of investment managers
- **Manager Profiles**: Performance, specialization, client count
- **Managed Accounts**: Delegate trading to professional managers
- **Smart Vest**: Automated investment strategies
- **Mentorship**: Live coaching and market analysis
- **Performance Tracking**: ROI, win rate, historical returns

### 5. Admin & Governance
- **Multi-Admin Support**: Email-based admin roles
- **OTP Authentication**: Secure admin login with time-limited codes
- **Approval Workflows**:
  - Withdrawal approvals (mandatory)
  - KYC document reviews
  - Account tier upgrades
  - P2P transaction disputes
- **Admin Notifications**: Real-time alerts for critical events
- **Platform Configuration**: Feature flags, asset management
- **User Management**: View, disable, or manage user accounts

### 6. KYC/Identity Verification
- **Document Upload**: ID, proof of address, proof of income
- **Document Status Tracking**: Pending → Under Review → Approved/Rejected
- **Compliance Rules**: Tier-based limits on transactions
- **Admin Review Panel**: Document verification interface
- **Regulatory Reports**: Export data for compliance audits

### 7. Payment & Settlement
- **Deposits**: Bank transfers, credit card (via Moonpay)
- **Withdrawals**: Bank account transfers with admin approval
- **Gas Fees**: Blockchain transaction cost estimation
- **Debit Cards**: Virtual and physical card requests
- **Billing**: Invoice generation, payment tracking
- **Multiple Processors**:
  - Paystack (Africa-focused)
  - Moonpay (On-ramp provider)
  - Coinbase Commerce (Crypto payments)

### 8. P2P & Social Trading
- **P2P Messaging**: Chat between traders
- **P2P Disputes**: Escalation to admin for resolution
- **Live Chat Support**: Customer service channel
- **Mailbox System**: Persistent message history
- **Social Features**: Follow managers, share strategies

### 9. Educational & Support
- **Education Module**: Market analysis, trading education
- **Support Tickets**: Help desk and ticket management
- **Live Chat**: Real-time customer support
- **Notifications**: Alerts for trade fills, withdrawals, KYC updates

### 10. Demo & Onboarding
- **Demo Accounts**: Trading with simulated $10,000 USD
- **Demo Configuration**: Feature toggles, demo limits
- **Onboarding Flow**: Guided first-time user experience
- **Platform Configuration**: Customizable platform settings

---

## User Personas

### 1. Retail Trader
- **Goal**: Learn and trade forex/crypto with real and demo accounts
- **Needs**: Easy-to-use interface, real-time quotes, fast order execution
- **Pain Points**: Complex UX, fees, market volatility
- **Features Used**: Trading, wallets, education, support

### 2. Institutional Trader
- **Goal**: High-volume trading with API access and compliance tools
- **Needs**: Advanced order types, reporting, audit trails
- **Pain Points**: Regulatory compliance, settlement delays
- **Features Used**: Trading, admin approvals, billing, statements

### 3. Fund Manager
- **Goal**: Attract clients and manage their capital
- **Needs**: Performance tracking, asset management interface, risk metrics
- **Pain Points**: Client acquisition, fee management
- **Features Used**: Manager profiles, mentorship, managed accounts

### 4. Platform Admin
- **Goal**: Operate the platform securely and compliantly
- **Needs**: Admin approval workflows, KYC verification, user management
- **Pain Points**: High-risk transactions, regulatory requirements
- **Features Used**: Admin panel, user management, KYC review, withdrawal approvals

### 5. Support Agent
- **Goal**: Help users and resolve issues quickly
- **Needs**: Ticket system, user context, escalation paths
- **Pain Points**: Volume of tickets, complex user issues
- **Features Used**: Support tickets, live chat, admin panel

---

## Business Rules & Constraints

### Trading Rules
- Demo accounts start with $10,000 USD simulated balance
- Real trading requires account tier approval
- Withdrawal limits based on KYC tier and account age
- Open orders auto-close on account suspension
- Maximum leverage: 30:1 (configurable per tier)

### Admin Rules (MANDATORY)
- **All withdrawals require admin approval** (core compliance requirement)
- KYC documents must be reviewed within 7 days
- Account tier upgrades require evidence of identity
- Disputes must be escalated within 48 hours
- Failed admin OTPs expire after 10 minutes

### Wallet Rules
- Minimum balance: $1 USD equivalent
- Maximum holdings: Account tier dependent
- Crypto deposits require address verification
- Wallet encryption uses AES-256
- Seed phrases stored encrypted in database

### P2P Rules
- Trades must be completed within agreed timeframe
- Disputes default to 72-hour resolution window
- Both parties must acknowledge transaction
- Platform takes 2-5% transaction fee
- Repeat disputes can result in account suspension

### Referral Rules
- Referrer earns $500 USD per successful signup
- Referee must complete KYC and deposit minimum
- Referral rewards credited upon milestone completion
- Referrals tracked by unique code per user

---

## Platform Configuration

### Configurable Settings (Environment)
| Setting | Default | Type | Purpose |
|---------|---------|------|---------|
| `ALLOWED_ORIGINS` | `*` (dev), unset (prod) | String | CORS origins |
| `ENABLE_DEMO_AUTH` | `true` | Boolean | Demo mode access |
| `LOG_LEVEL` | `info` | String | Logging verbosity |
| `REFERRAL_REWARD_USD` | `500` | Number | Referral bonus amount |
| `SALT_ROUNDS` | `12` | Number | Bcrypt password hashing |
| `AI_PROVIDER` | `openai` | String | AI service provider |

### Feature Flags (Database)
- Trading enabled/disabled per asset
- Account tier restrictions per feature
- Demo mode toggle
- P2P trading enabled/disabled
- KYC requirement level
- Withdrawal approval workflow

---

## Success Metrics

### Business KPIs
- **User Growth**: Target 10,000+ active monthly users (AMU)
- **Trading Volume**: $100M+ monthly trading volume
- **Conversion Rate**: 5%+ demo-to-real trading conversion
- **Retention**: 60%+ 3-month retention rate
- **Support Resolution**: 95%+ resolved in <24 hours

### Technical SLAs
- **Uptime**: 99.95% availability (30 minutes downtime/month max)
- **API Response Time**: <200ms p95 latency
- **Trade Execution**: <100ms order-to-fill
- **WebSocket Reliability**: 99.9% message delivery

### Security Metrics
- **Incident Response**: <15 minute mean time to detect (MTTD)
- **Zero Breaches**: 100% secure transaction history
- **Compliance**: 100% KYC completion within SLA
- **Encryption**: 100% of sensitive data encrypted at rest

---

## Compliance & Regulatory

### Geographic Compliance
- GDPR compliant (EU users)
- SOC 2 Type II audited
- KYC/AML requirements enforced
- Sanctions screening on user registration
- Data residency per jurisdiction

### Security Standards
- OWASP Top 10 hardened
- CSRF protection on all forms
- Rate limiting on auth endpoints
- SSL/TLS encryption in transit
- Secrets management via platform vaults

### Audit & Monitoring
- All transactions logged with audit trail
- Admin actions tracked and timestamped
- User activity monitoring
- Real-time alerts for suspicious behavior
- Monthly compliance reports

---

## Roadmap (Future Phases)

### Phase 2 (Q3 2026)
- Mobile app (iOS/Android)
- Advanced charting and technical analysis
- API for third-party integrations
- Algorithmic trading support

### Phase 3 (Q4 2026)
- Staking & yield farming
- Options trading
- Futures trading
- Lending protocol integration

### Phase 4 (2027)
- Regulated brokerage license (select jurisdictions)
- Hedge fund services
- Enterprise API tier
- White-label platform

---

## Appendix

### Definitions
- **Tier**: Account access level (Basic, Standard, Pro, Enterprise)
- **Managed Account**: User delegates trading authority to a manager
- **Demo Account**: Practice trading with simulated funds
- **Admin Approval**: Platform admin must explicitly approve action
- **OTP**: One-Time Password (time-limited, single-use auth code)
- **P2P**: Peer-to-peer transaction between two users
- **KYC**: Know Your Customer (identity verification)
- **AML**: Anti-Money Laundering (transaction monitoring)
- **CSRF**: Cross-Site Request Forgery (web security attack)

### References
- [COPILOT-INSTRUCTIONS.md](/COPILOT-INSTRUCTIONS.md) - Development guidelines
- [QUICKSTART.md](/QUICKSTART.md) - Local setup
- [PRODUCTION_CHECKLIST.md](/PRODUCTION_CHECKLIST.md) - Deployment
- [API OpenAPI Spec](/openapi.yaml) - API documentation
