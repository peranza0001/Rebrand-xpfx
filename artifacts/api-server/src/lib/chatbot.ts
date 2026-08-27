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

export const FAQ_COMMANDS = [
  { command: "help", label: "Show FAQ topics" },
  { command: "account", label: "Account access" },
  { command: "funding", label: "Deposits and withdrawals" },
  { command: "trading", label: "Forex and demo trading" },
  { command: "investing", label: "Investments and copy trading" },
  { command: "security", label: "Security and KYC" },
] as const;

function keywordEscalation(content: string): boolean {
  return /\b(human|agent|real person|supervisor|manager|escalat(?:e|ion|ed)?|fraud|hack(?:ed)?|stolen|emergency|unauthori[sz]ed|withdrawal (?:status|dispute)|account funds?|kyc status|aml status|regulatory|regulator|guarante(?:e|ed|es|ing)|guaranteed returns?|personalized (?:trade|investment)|should I (?:buy|sell)|buy .*(?:now|today)|sell .*(?:now|today))\b/i.test(content);
}

function greetingFor(userName: string): string {
  return userName && userName !== "User" ? `Hi ${userName.split(/\s+/)[0]}! ` : "Hi! ";
}

function faqMenu(greeting: string): ChatbotResponse {
  return {
    intent: "general",
    shouldEscalate: false,
    content: `${greeting}Choose a topic or type one of these commands: /faq account, /faq funding, /faq trading, /faq investing, /faq security. Type agent at any time for a human support representative.`,
  };
}

function commandTopic(message: string): string | null {
  const match = message.match(/^\/(?:faq|help)(?:\s+(.+))?$/i);
  return match?.[1]?.trim().toLowerCase() ?? (match ? "help" : null);
}

export function getChatbotResponse(content: string, userName = "User"): ChatbotResponse {
  const message = content.trim().toLowerCase();
  const greeting = greetingFor(userName);
  const command = commandTopic(message);

  if (command === "help" || command === "topics" || command === "menu") return faqMenu(greeting);
  if (command && /^(account|login|signup|access)$/.test(command)) {
    return { intent: "account", shouldEscalate: false, content: `${greeting}For signup or login, use your email and complete the one-time verification step. Use Forgot password if needed. Never share your password or verification code in chat. If access still fails, type agent for a representative.` };
  }
  if (command && /^(funding|deposit|deposits|withdrawal|withdrawals|payments?)$/.test(command)) {
    return { intent: "deposits", shouldEscalate: false, content: `${greeting}Use Wallets to open Deposit or Withdrawals and follow the displayed instructions. Check the destination, network, fees, and status before confirming. Never send funds to an address supplied in chat or repeat a transaction because a page is delayed.` };
  }
  if (command && /^(trading|forex|markets?|demo|orders?)$/.test(command)) {
    return { intent: "forex", shouldEscalate: false, content: `${greeting}Trading supports available forex, stock, commodity, and demo instruments. Review bid/ask, spread, margin, leverage, market status, and order type before submitting. Demo Trading uses simulated funds; practise position sizing and risk controls there first.` };
  }
  if (command && /^(investing|investments?|smartvest|copy|copy-trading)$/.test(command)) {
    return { intent: "investments", shouldEscalate: false, content: `${greeting}Review each investment or copy-trading product's objective, fees, risk, drawdown, allocation, and withdrawal terms before proceeding. Past or simulated performance is not a guarantee, and this chat cannot provide personalized investment advice.` };
  }
  if (command && /^(security|kyc|aml|verification)$/.test(command)) {
    return { intent: command === "security" ? "security" : "kyc", shouldEscalate: false, content: `${greeting}KYC and AML reviews require accurate account details and clear documents in the verification area. Support will never ask for your password, OTP, PIN, CVV, recovery phrase, or private key. Type agent immediately if you suspect fraud or unauthorized access.` };
  }

  if (keywordEscalation(content)) {
    return {
      intent: "general",
      shouldEscalate: true,
      content: `${greeting}I cannot provide guaranteed returns, personalized trade recommendations, or account-specific decisions. I am connecting you to human support so a representative can take over here. Trading involves risk of loss. Please do not share passwords, one-time codes, recovery phrases, or private keys.`,
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
  return faqMenu(greeting);
}

export { commandTopic, keywordEscalation };