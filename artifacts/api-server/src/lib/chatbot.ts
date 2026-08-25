export type ChatbotIntent =
  | "greeting"
  | "deposits"
  | "withdrawals"
  | "kyc"
  | "fees"
  | "risk"
  | "forex"
  | "investments"
  | "copy_trading"
  | "p2p"
  | "wallets"
  | "security"
  | "technical_support"
  | "demo_trading"
  | "account"
  | "general";

export interface ChatbotResponse {
  content: string;
  intent: ChatbotIntent;
  shouldEscalate: boolean;
}

function keywordEscalation(content: string): boolean {
  return /\b(human|agent|real person|supervisor|manager|escalat(?:e|ion|ed)?|fraud|hack(?:ed)?|stolen|emergency|unauthori[sz]ed)\b/i.test(content);
}

function greetingFor(userName: string): string {
  return userName && userName !== "User" ? `Hi ${userName.split(/\s+/)[0]}! ` : "Hi! ";
}

export function getChatbotResponse(content: string, userName = "User"): ChatbotResponse {
  const message = content.trim().toLowerCase();
  const greeting = greetingFor(userName);

  if (keywordEscalation(content)) {
    return {
      intent: "general",
      shouldEscalate: true,
      content: `${greeting}I understand this needs human support. I have sent your conversation to our support team so an available representative can take over here. Please do not share passwords, one-time codes, recovery phrases, or private keys.`,
    };
  }
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(message)) {
    return { intent: "greeting", shouldEscalate: false, content: `${greeting}How can I help today? I can guide you through account access, wallets, deposits, withdrawals, KYC, demo trading, forex, investments, P2P, or security.` };
  }
  if (/(deposit|fund|add money|cash in|top up)/.test(message)) {
    return { intent: "deposits", shouldEscalate: false, content: `${greeting}Open Wallets and choose Deposit to see the available funding methods, fees, destination details, and confirmation steps. For a transaction-specific issue, share only the public reference and I can send it to support.` };
  }
  if (/(withdraw|cash out|withdrawal|payout)/.test(message)) {
    return { intent: "withdrawals", shouldEscalate: false, content: `${greeting}Withdrawals are managed from Wallets. Confirm the destination details and complete any required verification before submitting. Tell me whether you need help with a crypto, bank, or card withdrawal.` };
  }
  if (/(security|2fa|two.?factor|otp|code|phish|private key|seed|recovery phrase|hack|stolen)/.test(message)) {
    return { intent: "security", shouldEscalate: false, content: `${greeting}Keep passwords, one-time codes, recovery phrases, and private keys private. XpressPro FX support will never ask for them. If you suspect unauthorized access, secure your email, change your password, stop sharing information, and request a human review.` };
  }
  if (/(account|login|sign in|password recovery|forgot password|sign up|register|profile|email verification)/.test(message)) {
    return { intent: "account", shouldEscalate: false, content: `${greeting}I can help with account access, signup, email verification, password recovery, and profile settings. Tell me what is preventing access without sharing your password or verification code.` };
  }
  if (/(kyc|aml|verify|verification|identity|document|proof of address)/.test(message)) {
    return { intent: "kyc", shouldEscalate: false, content: `${greeting}Start from the KYC page and submit clear, valid documents that match your account details. You can monitor the review status there. I can explain the process, but only an authorized reviewer can make an account decision.` };
  }
  if (/(fee|fees|commission|spread|cost|charge|pricing)/.test(message)) {
    return { intent: "fees", shouldEscalate: false, content: `${greeting}Fees and spreads vary by product, payment method, currency, and account conditions. Review the fee breakdown shown before confirming an action; chat cannot change or disclose account-specific charges.` };
  }
  if (/(leverage|margin|liquidat|stop.?loss|take.?profit|risk|loss)/.test(message)) {
    return { intent: "risk", shouldEscalate: false, content: `${greeting}Leverage increases both potential gains and losses. Adverse price movement can reduce margin, and stop-loss or take-profit orders do not guarantee a fill at the requested price. Use Demo Trading to practise and never risk money you cannot afford to lose.` };
  }
  if (/(forex|currency pair|pip|lot|spread|stock|share|commodity|market order|limit order)/.test(message)) {
    return { intent: "forex", shouldEscalate: false, content: `${greeting}The Trading desk supports available forex pairs, stocks, and commodities. Review the instrument details, market status, spread, margin, leverage limit, and order type before submitting an order.` };
  }
  if (/(invest|smartvest|portfolio|return|profit|yield|plan)/.test(message)) {
    return { intent: "investments", shouldEscalate: false, content: `${greeting}Investment and SmartVest products carry market risk and do not guarantee returns. Review each product's objective, fees, risk level, redemption terms, and suitability information before subscribing. I can explain platform mechanics, not provide personalized investment advice.` };
  }
  if (/(copy.?trad|follow trader|strategy|signal)/.test(message)) {
    return { intent: "copy_trading", shouldEscalate: false, content: `${greeting}Before using copy trading, review the strategy history, allocation, drawdown, fees, and stop-copy controls. Copying another trader does not remove market risk, and past performance is not a guarantee of future results.` };
  }
  if (/(p2p|peer.?to.?peer|merchant|escrow)/.test(message)) {
    return { intent: "p2p", shouldEscalate: false, content: `${greeting}P2P trades are managed in the marketplace. Check the merchant profile, price, limits, payment instructions, and escrow status, keep communication on-platform, and never release assets until payment is verified in your account.` };
  }
  if (/(wallet|balance|transaction|transfer|pending|status|receipt)/.test(message)) {
    return { intent: "wallets", shouldEscalate: false, content: `${greeting}Wallets shows balances, transfers, deposits, withdrawals, and transaction status. Chat cannot expose private account data or alter a transaction. Share only a public reference with support, never passwords, OTPs, recovery phrases, or private keys.` };
  }
  if (/(error|bug|broken|not work|unable|can't|cannot|technical|crash|loading)/.test(message)) {
    return { intent: "technical_support", shouldEscalate: false, content: `${greeting}Tell me which page or action failed, the exact non-sensitive error text, and whether you are using the website or app. Do not include passwords, OTPs, recovery phrases, or private keys; I can send a persistent issue to a human representative.` };
  }
  if (/(demo|paper|practice|trade|trading|order)/.test(message)) {
    return { intent: "demo_trading", shouldEscalate: false, content: `${greeting}Demo Trading uses simulated funds and practice-market updates. Select an instrument, choose Buy or Sell, enter a position size, and submit the order. No real funds move in demo mode.` };
  }
  return { intent: "general", shouldEscalate: false, content: `${greeting}How can I help today? Ask about accounts, wallets, deposits, withdrawals, KYC, demo trading, markets, investments, P2P, or security. Type "agent" whenever you need a human support representative.` };
}

export { keywordEscalation };