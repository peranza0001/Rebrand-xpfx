# PHASE 16: Full End-to-End Retest - Production Verification

## Deployment Endpoints
- **API Server**: Railway (xpressprofx-api-server on Railway)
- **Frontend**: Vercel (xpressprofx.com - pending deployment fix)
- **Database**: PostgreSQL on Railway
- **Real-time**: Socket.io on Railway API server

## Test Plan

### A. Core API Health Checks ✅

1. **API Server Health**
   ```
   GET /healthz
   Expected: 200, {"status":"ok","service":"XpressPro FX API",...}
   ```

2. **Database Connection**
   ```
   GET /healthz/db
   Expected: 200, {"status":"ok","database":"connected"}
   ```

3. **Metrics**
   ```
   GET /metrics
   Expected: 200, Prometheus metrics
   ```

### B. Authentication Flow

1. **Signup (Register)**
   - POST /api/auth/signup
   - Body: {email, password, fullName}
   - Expected: 201, new user created

2. **OTP Verification**
   - GET /api/auth/otp-code/verify (if OTP sent)
   - Expected: 200, OTP validated

3. **Login**
   - POST /api/auth/login
   - Body: {email, password}
   - Expected: 200, session cookie set (xpfx_sid)

4. **Logout**
   - POST /api/auth/logout
   - Expected: 200, session cleared

5. **Forgot Password**
   - POST /api/auth/forgot-password
   - Body: {email}
   - Expected: 200, reset email sent

### C. Account Management

1. **Get Profile**
   ```
   GET /api/account/me
   Expected: 200, user data with id, email, kyc_status
   ```

2. **Update Profile**
   ```
   PUT /api/account/me
   Expected: 200, profile updated
   ```

3. **Get Account Tier**
   ```
   GET /api/account/tier
   Expected: 200, tier info
   ```

### D. Wallet System (PHASE 4)

1. **Get Wallet Balance**
   ```
   GET /api/wallets/balance (auth required)
   Expected: 200, {available, locked, pending}
   ```

2. **Get Wallet Ledger**
   ```
   GET /api/wallets/ledger
   Expected: 200, [ledger_entries...]
   ```

3. **Get Financial Limits**
   ```
   GET /api/wallets/limits
   Expected: 200, {kyc_tier, daily_limit, monthly_limit, used}
   ```

4. **Initiate Deposit** (PHASE 4)
   ```
   POST /api/wallets/deposit
   Expected: 202, {status:"pending", requestId}
   ```

5. **Initiate Withdrawal** (PHASE 4)
   ```
   POST /api/wallets/withdraw
   Expected: 202, {status:"pending", requestId}
   ```

### E. SmartVest Plan (PHASE 5)

1. **Get Plans**
   ```
   GET /api/smartvest/plans
   Expected: 200, [conservative, balanced, growth]
   ```

2. **Create Plan**
   ```
   POST /api/smartvest
   Body: {plan:"balanced", disclaimerAcknowledged:true}
   Expected: 201, plan created
   ```

3. **Get Plan Details**
   ```
   GET /api/smartvest
   Expected: 200, plan details with simulatedBalance, portfolioValue
   ```

4. **Complete Plan & Get Payout** (PHASE 5)
   ```
   POST /api/smartvest/complete-plan
   Expected: 200, {payout, ledgerEntryCreated:true}
   Verify: Ledger shows smartvest_payout entry
   Verify: Trading wallet balance increased by payout
   ```

### F. Demo Trading (PHASE 7)

1. **Socket.io Connection**
   - Connect to /socket.io with xpfx_sid cookie
   - Expected: Connected message with userId

2. **Subscribe to Instrument**
   - Emit: demo-trading:subscribe-market {symbol:"EURUSD"}
   - Expected: Subscription confirmation

3. **Get Current Price**
   - Emit: demo-trading:get-price {symbol:"EURUSD"}
   - Expected: {status:"ok", price, bid, ask}

4. **Place Market Order**
   - Emit: demo-trading:place-order {symbol:"EURUSD", side:"buy", quantity:1.0, orderType:"market"}
   - Expected: {status:"ok", orderId, timestamp}
   - Verify: Ledger entry created for margin debit
   - Verify: Trade record created

5. **Monitor Order Fill via WebSocket**
   - Listen for: demo-trading:order-status
   - Expected: {status:"filled", orderId}

6. **Monitor Trade P&L**
   - Prices tick every 1.5s
   - Trade profit/loss updates in real-time
   - Expected: trade.profit value changes

7. **Trade Closure via Stop-Out**
   - Monitor for: demo-trading:trade-closed
   - Expected: Trade status="completed"
   - Verify: Ledger entry created for trade_profit or trading_fee
   - Verify: Funds credited back to wallet

### G. Live Chat (Optional - needs full implementation)

1. **Socket Connection to /live-chat**
   - Connect and join_conversation
   - Expected: Connected

2. **Send Message**
   - Emit: live-chat:send-message {message:"Hello admin"}
   - Expected: Message broadcast to conversation

3. **Admin Response**
   - Admin joins room and sends reply
   - Expected: User receives response

### H. Admin Wallet Management (PHASE 4)

1. **Admin: List Pending Deposits**
   ```
   GET /api/admin/wallets/pending-deposits (admin auth)
   Expected: 200, {count, deposits:[...]}
   ```

2. **Admin: Approve Deposit**
   ```
   POST /api/admin/wallets/approve-deposit
   Body: {depositId, transactionHash?}
   Expected: 200, funds credited to user wallet
   Verify: Ledger entry shows deposit_approved
   ```

3. **Admin: List Pending Withdrawals**
   ```
   GET /api/admin/wallets/pending-withdrawals (admin auth)
   Expected: 200, {count, withdrawals:[...]}
   ```

4. **Admin: Approve Withdrawal**
   ```
   POST /api/admin/wallets/approve-withdrawal
   Body: {withdrawalId, transactionHash?}
   Expected: 200, withdrawal processed
   Verify: Ledger entry shows withdrawal_approved
   ```

5. **Admin: View User Balance & Ledger**
   ```
   GET /api/admin/wallets/user/:userId/balance
   Expected: 200, {balance, limits, timestamp}
   
   GET /api/admin/wallets/user/:userId/ledger
   Expected: 200, {entries, count}
   ```

### I. Full Workflow Test

**Scenario: User deposits, trades, and withdraws**

1. User logs in → session created
2. User requests deposit → wallet/deposit endpoint returns 202
3. Admin approves deposit → ledger records deposit_approved, wallet credited
4. User places demo trade → ledger records margin debit, trade created
5. Trade fills at market price → WebSocket confirms fill
6. Trade P&L updates in real-time (prices tick)
7. Stop-out triggers → trade closes, profit/loss credited
8. Ledger shows complete trail: deposit → margin → profit/loss → withdrawal
9. User requests withdrawal → wallet/withdraw endpoint returns 202
10. Admin approves withdrawal → ledger records withdrawal_approved

**Verification Points**:
- ✅ HTTP responses correct status codes
- ✅ Session cookie (xpfx_sid) persists
- ✅ Ledger entries created for each transaction
- ✅ Wallet balances update correctly
- ✅ WebSocket real-time updates working
- ✅ Admin endpoints functional and authorized
- ✅ All financial limits enforced

## Test Execution

See PHASE_16_TEST_EXECUTION.md for detailed results.
