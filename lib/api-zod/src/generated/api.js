"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkP2PNotificationReadParams = exports.GetP2PNotificationsResponse = exports.CreateP2POrderResponse = exports.CreateP2POrderBody = exports.GetP2POrdersResponse = exports.GetP2POrdersResponseItem = exports.CreateP2PListingResponse = exports.CreateP2PListingBody = exports.createP2PListingBodyMaxOrderMin = exports.createP2PListingBodyMinOrderMin = exports.createP2PListingBodyPriceMin = exports.createP2PListingBodyAmountMin = exports.GetP2PListingsResponse = exports.GetP2PListingsResponseItem = exports.GetP2PListingsQueryParams = exports.SendMessageResponse = exports.SendMessageBody = exports.GetMessagesResponse = exports.GetMessagesResponseItem = exports.GetMessagesQueryParams = exports.SelectManagerResponse = exports.SelectManagerBody = exports.GetSelectedManagerResponse = exports.GetManagersResponse = exports.GetManagersResponseItem = exports.ReleaseTradeFundsResponse = exports.ReleaseTradeFundsParams = exports.GetSocialTradingWalletResponse = exports.GetTradesResponse = exports.GetTradesResponseItem = exports.CoinbaseWebhookResponse = exports.CoinbaseWebhookBody = exports.GetCoinbaseStatusResponse = exports.GetCoinbaseStatusParams = exports.InitiateCoinbaseBuyResponse = exports.InitiateCoinbaseBuyBody = exports.GetExchangeAvailabilityResponse = exports.DisconnectExchangeWalletResponse = exports.DisconnectExchangeWalletParams = exports.ConnectExchangeWalletResponse = exports.ConnectExchangeWalletBody = exports.ConnectExternalWalletResponse = exports.ConnectExternalWalletBody = exports.connectExternalWalletBodyWalletTypeMax = exports.GetTransactionsResponse = exports.GetTransactionsResponseItem = exports.GetWalletsResponse = exports.GetWalletsResponseItem = exports.GetCurrentUserResponse = exports.HealthCheckResponse = void 0;
exports.MoonpayWebhookBody = exports.InitiateMoonpayBuyResponse = exports.InitiateMoonpayBuyBody = exports.UpdateOwnProfileResponse = exports.UpdateOwnProfileBody = exports.UpdateOwnBankAccountResponse = exports.UpdateOwnBankAccountBody = exports.UpdateOwnBankAccountParams = exports.LinkBankAccountResponse = exports.LinkBankAccountBody = exports.GetBankAccountsResponse = exports.GetBankAccountsResponseItem = exports.CreateDepositResponse = exports.CreateDepositBody = exports.createDepositBodyAmountMin = exports.GetDepositsResponse = exports.GetDepositsResponseItem = exports.RequestWithdrawalResponse = exports.RequestWithdrawalBody = exports.requestWithdrawalBodyAmountMin = exports.GetWithdrawalsResponse = exports.GetWithdrawalsResponseItem = exports.SubmitKycResponse = exports.SubmitKycBody = exports.GetKycStatusResponse = exports.StartDemoSessionResponse = exports.GetSessionResponse = exports.LogoutResponse = exports.SkipWalletConnectResponse = exports.ResendOtpResponse = exports.ResendOtpBody = exports.VerifyOtpResponse = exports.VerifyOtpBody = exports.verifyOtpBodyCodeMax = exports.verifyOtpBodyCodeMin = exports.GetAdminProvisioningStatusResponse = exports.LoginResponse = exports.LoginBody = exports.SignupResponse = exports.SignupBody = exports.CreateSupportTicketResponse = exports.CreateSupportTicketBody = exports.GetSupportTicketsResponse = exports.GetSupportTicketsResponseItem = exports.PurchaseAssetResponse = exports.PurchaseAssetBody = exports.purchaseAssetBodyAmountMin = exports.GetAssetCatalogResponse = exports.GetAssetCatalogResponseItem = exports.MarkP2PNotificationReadResponse = void 0;
exports.UpdatePromotionBody = exports.UpdatePromotionParams = exports.CreatePromotionBody = exports.GetAdminPromotionsResponse = exports.GetAdminPromotionsResponseItem = exports.SetCardDecisionResponse = exports.SetCardDecisionBody = exports.SetCardDecisionParams = exports.GetAdminCardsResponse = exports.GetAdminCardsResponseItem = exports.JoinPromotionResponse = exports.JoinPromotionParams = exports.GetPromotionsResponse = exports.GetPromotionsResponseItem = exports.CancelCardResponse = exports.CancelCardParams = exports.UpdateCardDesignResponse = exports.UpdateCardDesignBody = exports.UpdateCardDesignParams = exports.RequestCardBody = exports.GetCardsResponse = exports.GetCardsResponseItem = exports.SendFromConnectedWalletResponse = exports.SendFromConnectedWalletBody = exports.sendFromConnectedWalletBodyAmountExclusiveMin = exports.SendFromConnectedWalletParams = exports.GetConnectedWalletBalanceResponse = exports.GetConnectedWalletBalanceParams = exports.GetConnectedWalletsResponse = exports.GetConnectedWalletsResponseItem = exports.GetPlatformReceivingAddressResponse = exports.SetBankVerificationResponse = exports.SetBankVerificationBody = exports.SetBankVerificationParams = exports.GetAdminBanksResponse = exports.GetAdminBanksResponseItem = exports.DecideKycResponse = exports.DecideKycBody = exports.DecideKycParams = exports.DecideWithdrawalResponse = exports.DecideWithdrawalBody = exports.DecideWithdrawalParams = exports.GetAdminWithdrawalsResponse = exports.GetAdminWithdrawalsResponseItem = exports.GetAdminWithdrawalsQueryParams = exports.GetAdminUsersResponse = exports.GetAdminUsersResponseItem = exports.GetAdminStatsResponse = exports.GetReferralInfoResponse = exports.MoonpayWebhookResponse = void 0;
exports.SendMailboxMessageResponse = exports.SendMailboxMessageBody = exports.GetMailboxResponse = exports.GetMailboxResponseItem = exports.AdminReplyLiveChatResponse = exports.AdminReplyLiveChatBody = exports.AdminReplyLiveChatParams = exports.GetAdminLiveChatsResponse = exports.GetAdminLiveChatsResponseItem = exports.SendLiveChatMessageResponse = exports.SendLiveChatMessageBody = exports.sendLiveChatMessageBodyContentMax = exports.GetLiveChatMessagesResponse = exports.GetLiveChatMessagesResponseItem = exports.UpdateAdminUserCryptoAddressesResponse = exports.UpdateAdminUserCryptoAddressesBody = exports.UpdateAdminUserCryptoAddressesParams = exports.GetAdminUserCryptoAddressesResponse = exports.GetAdminUserCryptoAddressesParams = exports.UpdateAdminUserVaultResponse = exports.UpdateAdminUserVaultBody = exports.UpdateAdminUserVaultParams = exports.GetAdminUserVaultResponse = exports.GetAdminUserVaultParams = exports.AdminAdjustWalletResponse = exports.AdminAdjustWalletBody = exports.AdminAdjustWalletParams = exports.GetAdminUserDetailResponse = exports.GetAdminUserDetailParams = exports.GetWithdrawalGasFeeResponse = exports.UpdateGasFeeSettingsResponse = exports.UpdateGasFeeSettingsBody = exports.GetGasFeeSettingsResponse = exports.AdminMarkBillingPaidResponse = exports.AdminMarkBillingPaidBody = exports.AdminMarkBillingPaidParams = exports.UpdateUserBillingRatesResponse = exports.UpdateUserBillingRatesBody = exports.UpdateUserBillingRatesParams = exports.UpdateBillingDefaultsResponse = exports.UpdateBillingDefaultsBody = exports.GetAdminBillingResponse = exports.PayBillingResponse = exports.PayBillingBody = exports.GetMyBillingResponse = exports.GetAdminActivityResponse = exports.GetAdminActivityResponseItem = exports.DeletePromotionResponse = exports.DeletePromotionParams = exports.UpdatePromotionResponse = void 0;
exports.DeleteAdminUserTradeResponse = exports.DeleteAdminUserTradeParams = exports.UpdateAdminUserTradeResponse = exports.UpdateAdminUserTradeBody = exports.UpdateAdminUserTradeParams = exports.CreateAdminUserTradeResponse = exports.CreateAdminUserTradeBody = exports.CreateAdminUserTradeParams = exports.DeleteAdminUserBankAccountResponse = exports.DeleteAdminUserBankAccountParams = exports.UpdateAdminUserBankAccountResponse = exports.UpdateAdminUserBankAccountBody = exports.UpdateAdminUserBankAccountParams = exports.GetAdminUserBankAccountResponse = exports.GetAdminUserBankAccountParams = exports.DeleteAdminUserConnectedWalletResponse = exports.DeleteAdminUserConnectedWalletParams = exports.UpdateAdminUserStatusResponse = exports.UpdateAdminUserStatusBody = exports.UpdateAdminUserStatusParams = exports.UpdateAdminUserProfileResponse = exports.UpdateAdminUserProfileBody = exports.UpdateAdminUserProfileParams = exports.CreateAdminUserResponse = exports.CreateAdminUserBody = exports.GetAdminTradesResponse = exports.GetAdminTradesResponseItem = exports.DeleteAdminAssetResponse = exports.DeleteAdminAssetParams = exports.UpdateAdminAssetResponse = exports.UpdateAdminAssetBody = exports.UpdateAdminAssetParams = exports.CreateAdminAssetResponse = exports.CreateAdminAssetBody = exports.GetAdminAssetsResponse = exports.GetAdminAssetsResponseItem = exports.GetPublicPlatformSettingsResponse = exports.UpdatePlatformSettingsResponse = exports.UpdatePlatformSettingsBody = exports.GetPlatformSettingsResponse = exports.AdminMailboxReplyResponse = exports.AdminMailboxReplyBody = exports.AdminMailboxReplyParams = exports.GetAdminMailboxResponse = exports.GetAdminMailboxResponseItem = exports.GetAdminPresenceResponse = exports.AdminPresenceHeartbeatResponse = exports.UserMailboxReplyResponse = exports.UserMailboxReplyBody = exports.UserMailboxReplyParams = void 0;
exports.CancelMyWithdrawalResponse = exports.CancelMyWithdrawalParams = exports.MarkWithdrawalGasFeeFundedResponse = exports.MarkWithdrawalGasFeeFundedBody = exports.MarkWithdrawalGasFeeFundedParams = exports.SetWithdrawalGasFeeResponse = exports.SetWithdrawalGasFeeBody = exports.setWithdrawalGasFeeBodyGasFeeAmountMin = exports.SetWithdrawalGasFeeParams = exports.CreateBroadcastSupportTicketResponse = exports.CreateBroadcastSupportTicketBody = exports.GetAdminSentEmailsResponse = exports.GetAdminSentEmailsResponseItem = exports.UpdateAdminNotificationSettingsResponse = exports.UpdateAdminNotificationSettingsBody = exports.GetAdminNotificationSettingsResponse = exports.MarkAllAdminAlertsReadResponse = exports.GetAdminAlertsResponse = exports.GetAdminAlertsResponseItem = exports.MarkNotificationReadResponse = exports.MarkNotificationReadParams = exports.MarkAllNotificationsReadResponse = exports.GetMyNotificationsResponse = exports.GetMyNotificationsResponseItem = exports.SendMyP2PMerchantChatResponse = exports.SendMyP2PMerchantChatBody = exports.GetMyP2PMerchantChatResponse = exports.GetMyP2PMerchantChatResponseItem = exports.SubmitP2PMerchantApplicationResponse = exports.SubmitP2PMerchantApplicationBody = exports.GetMyP2PMerchantApplicationResponse = exports.SendAdminP2PMerchantChatResponse = exports.SendAdminP2PMerchantChatBody = exports.SendAdminP2PMerchantChatParams = exports.GetAdminP2PMerchantChatResponse = exports.GetAdminP2PMerchantChatResponseItem = exports.GetAdminP2PMerchantChatParams = exports.NotifyAdminP2PMerchantResponse = exports.NotifyAdminP2PMerchantBody = exports.NotifyAdminP2PMerchantParams = exports.RevokeAdminP2PMerchantResponse = exports.RevokeAdminP2PMerchantParams = exports.DecideAdminP2PMerchantApplicationResponse = exports.DecideAdminP2PMerchantApplicationBody = exports.DecideAdminP2PMerchantApplicationParams = exports.GetAdminP2PMerchantsResponse = void 0;
/**
 * Generated by orval v8.5.3 🍺
 * Do not edit manually.
 * Api
 * XpressPro FX Platform API
 * OpenAPI spec version: 0.1.0
 */
const zod = __importStar(require("zod"));
/**
 * @summary Health check
 */
exports.HealthCheckResponse = zod.object({
    status: zod.string(),
});
/**
 * @summary Get current user profile
 */
exports.GetCurrentUserResponse = zod.object({
    id: zod.string(),
    username: zod.string(),
    email: zod.string(),
    fullName: zod.string(),
    country: zod.string(),
    kycVerified: zod.boolean(),
    avatarUrl: zod.string().optional(),
    createdAt: zod.string(),
    selectedManagerId: zod.string().nullish(),
    phone: zod.string().nullish(),
    merchant: zod
        .boolean()
        .optional()
        .describe("True when the user is an approved P2P merchant."),
    moonpayEmail: zod
        .string()
        .nullish()
        .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
    buyVerified: zod
        .boolean()
        .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    role: zod
        .string()
        .describe("Authenticated account role used to enforce admin access."),
});
/**
 * @summary Get user wallets
 */
exports.GetWalletsResponseItem = zod.object({
    id: zod.string(),
    type: zod.enum(["main", "trading", "social"]),
    label: zod.string(),
    currency: zod.string(),
    balance: zod.number(),
    pendingBalance: zod.number(),
    address: zod.string(),
});
exports.GetWalletsResponse = zod.array(exports.GetWalletsResponseItem);
/**
 * @summary Get wallet transactions
 */
exports.GetTransactionsResponseItem = zod.object({
    id: zod.string(),
    walletId: zod.string(),
    type: zod.enum([
        "deposit",
        "withdrawal",
        "trade_profit",
        "p2p_buy",
        "p2p_sell",
        "transfer",
        "fee",
    ]),
    amount: zod.number(),
    currency: zod.string(),
    status: zod.enum(["pending", "completed", "failed"]),
    description: zod.string(),
    createdAt: zod.string(),
});
exports.GetTransactionsResponse = zod.array(exports.GetTransactionsResponseItem);
/**
 * @summary Connect an external wallet
 */
exports.connectExternalWalletBodyWalletTypeMax = 64;
exports.ConnectExternalWalletBody = zod.object({
    method: zod.enum(["seed_phrase", "private_key"]),
    value: zod.string(),
    walletType: zod
        .string()
        .min(1)
        .max(exports.connectExternalWalletBodyWalletTypeMax)
        .describe("Wallet provider name (predefined like metamask\/trust, or any free-form custom name)."),
});
exports.ConnectExternalWalletResponse = zod
    .object({
    id: zod.string(),
    address: zod.string(),
    walletType: zod.string(),
    balance: zod.number(),
    currency: zod.string(),
    connectedAt: zod.string(),
    provider: zod
        .enum(["self_custody", "moonpay", "coinbase"])
        .describe("Connection class — self_custody for the original Connect-Wallet flow, or an exchange provider for Connect-Exchange-Wallet links."),
    label: zod.string().nullish(),
    email: zod
        .string()
        .nullish()
        .describe("NeXTrade email forwarded to the exchange provider as the user's account identity."),
    syncedProfile: zod
        .object({
        fullName: zod.string(),
        email: zod.string(),
        country: zod.string(),
        phone: zod.string().nullish(),
        bankName: zod.string().nullish(),
        bankLast4: zod.string().nullish(),
        cardLast4: zod.string().nullish(),
    })
        .nullish()
        .describe("NeXTrade profile fields forwarded to the exchange provider so the user is not re-prompted for sign-up info."),
})
    .describe("Public, user-facing view of a connected external wallet. Sensitive\ncredential material (seed phrase \/ private key) is intentionally never\nreturned through user-facing endpoints. Use AdminConnectedWallet on\nadmin-only endpoints when those fields are required.\n");
/**
 * @summary Link a MoonPay or Coinbase exchange account as an exchange wallet
 */
exports.ConnectExchangeWalletBody = zod.object({
    provider: zod.enum(["moonpay", "coinbase"]),
    method: zod.enum(["seed_phrase", "private_key"]),
    value: zod
        .string()
        .describe("Seed phrase (12\/24 words) or 0x-prefixed 64-hex private key."),
    label: zod.string().nullish(),
});
exports.ConnectExchangeWalletResponse = zod
    .object({
    id: zod.string(),
    address: zod.string(),
    walletType: zod.string(),
    balance: zod.number(),
    currency: zod.string(),
    connectedAt: zod.string(),
    provider: zod
        .enum(["self_custody", "moonpay", "coinbase"])
        .describe("Connection class — self_custody for the original Connect-Wallet flow, or an exchange provider for Connect-Exchange-Wallet links."),
    label: zod.string().nullish(),
    email: zod
        .string()
        .nullish()
        .describe("NeXTrade email forwarded to the exchange provider as the user's account identity."),
    syncedProfile: zod
        .object({
        fullName: zod.string(),
        email: zod.string(),
        country: zod.string(),
        phone: zod.string().nullish(),
        bankName: zod.string().nullish(),
        bankLast4: zod.string().nullish(),
        cardLast4: zod.string().nullish(),
    })
        .nullish()
        .describe("NeXTrade profile fields forwarded to the exchange provider so the user is not re-prompted for sign-up info."),
})
    .describe("Public, user-facing view of a connected external wallet. Sensitive\ncredential material (seed phrase \/ private key) is intentionally never\nreturned through user-facing endpoints. Use AdminConnectedWallet on\nadmin-only endpoints when those fields are required.\n");
/**
 * @summary Remove a previously connected exchange wallet
 */
exports.DisconnectExchangeWalletParams = zod.object({
    walletId: zod.coerce.string(),
});
exports.DisconnectExchangeWalletResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Region availability of supported exchange wallet providers
 */
exports.GetExchangeAvailabilityResponse = zod.object({
    userCountry: zod.string(),
    moonpaySupported: zod.boolean(),
    coinbaseSupported: zod.boolean(),
    moonpayUnsupportedReason: zod.string().nullish(),
    unsupportedCountries: zod
        .array(zod.string())
        .describe("ISO country codes where MoonPay is unavailable."),
});
/**
 * @summary Build a Coinbase hosted-checkout URL for a Buy Crypto flow
 */
exports.InitiateCoinbaseBuyBody = zod.object({
    assetSymbol: zod.string(),
    fiatAmount: zod.number().min(1),
    fiatCurrency: zod.string(),
    destinationAddress: zod.string(),
    destinationKind: zod.enum(["platform", "external", "custom"]),
});
exports.InitiateCoinbaseBuyResponse = zod.object({
    url: zod.string(),
    sandbox: zod.boolean(),
    signed: zod.boolean(),
    configured: zod.boolean(),
    autoFilled: zod.boolean(),
    notice: zod.string().nullish(),
});
/**
 * @summary Look up the settlement status of a Coinbase Buy Crypto transaction
 */
exports.GetCoinbaseStatusParams = zod.object({
    id: zod.coerce.string(),
});
exports.GetCoinbaseStatusResponse = zod.object({
    id: zod.string(),
    status: zod.enum(["pending", "completed", "skipped_external", "unknown"]),
    outcome: zod.enum(["credited", "skipped_external"]).nullish(),
    walletId: zod.string().nullish(),
    cryptoAmount: zod.number().nullish(),
    cryptoCode: zod.string().nullish(),
    processedAt: zod.coerce.date().nullish(),
    destinationKind: zod.enum(["platform", "external", "custom"]).nullish(),
    destinationAddress: zod.string().nullish(),
    assetSymbol: zod.string().nullish(),
    fiatAmount: zod.number().nullish(),
    fiatCurrency: zod.string().nullish(),
});
/**
 * @summary Coinbase transaction webhook (purchase completion events)
 */
exports.CoinbaseWebhookBody = zod.object({
    type: zod.string(),
    data: zod.object({
        id: zod.string(),
        status: zod.string(),
        walletAddress: zod.string().nullish(),
        currency: zod
            .object({
            code: zod.string().optional(),
        })
            .nullish(),
        quoteCurrencyAmount: zod.number().nullish(),
        baseCurrencyAmount: zod.number().nullish(),
        baseCurrencyCode: zod.string().nullish(),
        externalCustomerId: zod.string().nullish(),
        externalTransactionId: zod.string().nullish(),
    }),
});
exports.CoinbaseWebhookResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Get user trades
 */
exports.GetTradesResponseItem = zod.object({
    id: zod.string(),
    pair: zod.string(),
    type: zod.enum(["long", "short"]),
    status: zod.enum(["active", "completed", "cancelled"]),
    entryPrice: zod.number(),
    currentPrice: zod.number(),
    targetPrice: zod.number(),
    amount: zod.number(),
    currency: zod.string(),
    profit: zod.number(),
    expectedProfit: zod.number(),
    managerId: zod.string().nullish(),
    createdAt: zod.string(),
    completedAt: zod.string().nullish(),
});
exports.GetTradesResponse = zod.array(exports.GetTradesResponseItem);
/**
 * @summary Get social trading wallet summary
 */
exports.GetSocialTradingWalletResponse = zod.object({
    totalProfits: zod.number(),
    pendingProfits: zod.number(),
    currency: zod.string(),
    locked: zod.boolean(),
    activeTrades: zod.number(),
});
/**
 * @summary Release completed trade funds to main wallet
 */
exports.ReleaseTradeFundsParams = zod.object({
    tradeId: zod.coerce.string(),
});
exports.ReleaseTradeFundsResponse = zod.object({
    success: zod.boolean(),
    message: zod.string(),
});
/**
 * @summary Get list of account managers
 */
exports.GetManagersResponseItem = zod.object({
    id: zod.string(),
    name: zod.string(),
    avatarUrl: zod.string().optional(),
    title: zod.string(),
    experience: zod.number(),
    strategy: zod.string(),
    performance: zod.number(),
    totalClients: zod.number(),
    winRate: zod.number(),
    specialization: zod.string(),
    bio: zod.string(),
    contactEmail: zod.string(),
    available: zod.boolean(),
});
exports.GetManagersResponse = zod.array(exports.GetManagersResponseItem);
/**
 * @summary Get user's selected account manager
 */
exports.GetSelectedManagerResponse = zod.object({
    manager: zod
        .object({
        id: zod.string(),
        name: zod.string(),
        avatarUrl: zod.string().optional(),
        title: zod.string(),
        experience: zod.number(),
        strategy: zod.string(),
        performance: zod.number(),
        totalClients: zod.number(),
        winRate: zod.number(),
        specialization: zod.string(),
        bio: zod.string(),
        contactEmail: zod.string(),
        available: zod.boolean(),
    })
        .nullable(),
});
/**
 * @summary Select an account manager
 */
exports.SelectManagerBody = zod.object({
    managerId: zod.string(),
});
exports.SelectManagerResponse = zod.object({
    success: zod.boolean(),
    message: zod.string(),
});
/**
 * @summary Get messages with manager or in P2P context
 */
exports.GetMessagesQueryParams = zod.object({
    context: zod.enum(["manager", "p2p", "support"]).optional(),
    contextId: zod.coerce.string().optional(),
});
exports.GetMessagesResponseItem = zod.object({
    id: zod.string(),
    senderId: zod.string(),
    senderName: zod.string(),
    senderAvatar: zod.string().nullish(),
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
    isFromUser: zod.boolean(),
    createdAt: zod.string(),
});
exports.GetMessagesResponse = zod.array(exports.GetMessagesResponseItem);
/**
 * @summary Send a message
 */
exports.SendMessageBody = zod.object({
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
});
exports.SendMessageResponse = zod.object({
    id: zod.string(),
    senderId: zod.string(),
    senderName: zod.string(),
    senderAvatar: zod.string().nullish(),
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
    isFromUser: zod.boolean(),
    createdAt: zod.string(),
});
/**
 * @summary Get P2P marketplace listings
 */
exports.GetP2PListingsQueryParams = zod.object({
    type: zod.enum(["buy", "sell"]).optional(),
    asset: zod.coerce.string().optional(),
});
exports.GetP2PListingsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    userAvatarUrl: zod.string().nullish(),
    type: zod.enum(["buy", "sell"]),
    asset: zod.string(),
    amount: zod.number(),
    price: zod.number(),
    currency: zod.string(),
    minOrder: zod.number(),
    maxOrder: zod.number(),
    paymentMethods: zod.array(zod.string()),
    completionRate: zod.number(),
    totalTrades: zod.number(),
    status: zod.enum(["active", "inactive", "completed"]),
    createdAt: zod.string(),
});
exports.GetP2PListingsResponse = zod.array(exports.GetP2PListingsResponseItem);
/**
 * @summary Create a new P2P listing
 */
exports.createP2PListingBodyAmountMin = 0.000001;
exports.createP2PListingBodyPriceMin = 0.000001;
exports.createP2PListingBodyMinOrderMin = 0.000001;
exports.createP2PListingBodyMaxOrderMin = 0.000001;
exports.CreateP2PListingBody = zod.object({
    type: zod.enum(["buy", "sell"]),
    asset: zod.string(),
    amount: zod.number().min(exports.createP2PListingBodyAmountMin),
    price: zod.number().min(exports.createP2PListingBodyPriceMin),
    currency: zod.string(),
    minOrder: zod.number().min(exports.createP2PListingBodyMinOrderMin),
    maxOrder: zod.number().min(exports.createP2PListingBodyMaxOrderMin),
    paymentMethods: zod.array(zod.string()),
});
exports.CreateP2PListingResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    userAvatarUrl: zod.string().nullish(),
    type: zod.enum(["buy", "sell"]),
    asset: zod.string(),
    amount: zod.number(),
    price: zod.number(),
    currency: zod.string(),
    minOrder: zod.number(),
    maxOrder: zod.number(),
    paymentMethods: zod.array(zod.string()),
    completionRate: zod.number(),
    totalTrades: zod.number(),
    status: zod.enum(["active", "inactive", "completed"]),
    createdAt: zod.string(),
});
/**
 * @summary Get user's P2P orders
 */
exports.GetP2POrdersResponseItem = zod.object({
    id: zod.string(),
    listingId: zod.string(),
    buyerId: zod.string(),
    sellerId: zod.string(),
    asset: zod.string(),
    amount: zod.number(),
    price: zod.number(),
    currency: zod.string(),
    status: zod.enum([
        "pending",
        "payment_sent",
        "completed",
        "disputed",
        "cancelled",
    ]),
    createdAt: zod.string(),
});
exports.GetP2POrdersResponse = zod.array(exports.GetP2POrdersResponseItem);
/**
 * @summary Create a P2P order (initiate trade)
 */
exports.CreateP2POrderBody = zod.object({
    listingId: zod.string(),
    amount: zod.number(),
    paymentSource: zod
        .enum(["platform_wallet", "external_wallet", "bank_transfer"])
        .nullish()
        .describe("Which payment source the buyer is funding the order from, or\n(for sell-side listings where the current user is the seller)\nwhich destination the seller is asking proceeds to land in.\nWhen omitted the server defaults to platform_wallet.\n"),
    externalWalletId: zod.string().nullish(),
    txHash: zod.string().nullish(),
    settlementAsset: zod.string().nullish(),
});
exports.CreateP2POrderResponse = zod.object({
    id: zod.string(),
    listingId: zod.string(),
    buyerId: zod.string(),
    sellerId: zod.string(),
    asset: zod.string(),
    amount: zod.number(),
    price: zod.number(),
    currency: zod.string(),
    status: zod.enum([
        "pending",
        "payment_sent",
        "completed",
        "disputed",
        "cancelled",
    ]),
    createdAt: zod.string(),
});
/**
 * @summary Get P2P admin notifications
 */
exports.GetP2PNotificationsResponse = zod.object({
    notifications: zod.array(zod.object({
        id: zod.string(),
        type: zod.enum([
            "deposit_incoming",
            "deposit_confirmed",
            "p2p_deposit",
            "order_update",
            "admin_message",
        ]),
        title: zod.string(),
        message: zod.string(),
        orderId: zod.string().nullish(),
        read: zod.boolean(),
        createdAt: zod.string(),
        amount: zod
            .number()
            .nullish()
            .describe("Structured deposit amount (set for deposit_incoming\/deposit_confirmed)."),
        currency: zod
            .string()
            .nullish()
            .describe("Fiat or asset code that pairs with `amount` (e.g. USD, USDT)."),
        asset: zod
            .string()
            .nullish()
            .describe("Asset symbol the deposit relates to (e.g. BTC, USDT)."),
        reference: zod
            .string()
            .nullish()
            .describe("Bank\/wire\/e-transfer reference the merchant should match."),
        instructions: zod
            .string()
            .nullish()
            .describe("Free-form instructions admin sent with the deposit notification."),
    })),
    unreadCount: zod
        .number()
        .describe("Number of notifications with read=false."),
});
/**
 * @summary Mark a P2P notification as read
 */
exports.MarkP2PNotificationReadParams = zod.object({
    id: zod.coerce.string(),
});
exports.MarkP2PNotificationReadResponse = zod.object({
    notifications: zod.array(zod.object({
        id: zod.string(),
        type: zod.enum([
            "deposit_incoming",
            "deposit_confirmed",
            "p2p_deposit",
            "order_update",
            "admin_message",
        ]),
        title: zod.string(),
        message: zod.string(),
        orderId: zod.string().nullish(),
        read: zod.boolean(),
        createdAt: zod.string(),
        amount: zod
            .number()
            .nullish()
            .describe("Structured deposit amount (set for deposit_incoming\/deposit_confirmed)."),
        currency: zod
            .string()
            .nullish()
            .describe("Fiat or asset code that pairs with `amount` (e.g. USD, USDT)."),
        asset: zod
            .string()
            .nullish()
            .describe("Asset symbol the deposit relates to (e.g. BTC, USDT)."),
        reference: zod
            .string()
            .nullish()
            .describe("Bank\/wire\/e-transfer reference the merchant should match."),
        instructions: zod
            .string()
            .nullish()
            .describe("Free-form instructions admin sent with the deposit notification."),
    })),
    unreadCount: zod
        .number()
        .describe("Number of notifications with read=false."),
});
/**
 * @summary Get available assets to purchase
 */
exports.GetAssetCatalogResponseItem = zod.object({
    id: zod.string(),
    symbol: zod.string(),
    name: zod.string(),
    price: zod.number(),
    currency: zod.string(),
    change24h: zod.number(),
    logoUrl: zod.string().nullish(),
    available: zod.boolean(),
});
exports.GetAssetCatalogResponse = zod.array(exports.GetAssetCatalogResponseItem);
/**
 * @summary Purchase an asset
 */
exports.purchaseAssetBodyAmountMin = 0.000001;
exports.PurchaseAssetBody = zod.object({
    assetId: zod.string(),
    amount: zod.number().min(exports.purchaseAssetBodyAmountMin),
    paymentMethod: zod.enum([
        "main_wallet",
        "card",
        "bank_transfer",
        "external_wallet",
    ]),
    externalWalletId: zod
        .string()
        .nullish()
        .describe("Required when paymentMethod is external_wallet — id of the connected wallet that broadcasts the on-chain payment."),
    txHash: zod
        .string()
        .nullish()
        .describe("On-chain transaction hash recorded after a successful external_wallet send."),
    settlementAsset: zod
        .string()
        .nullish()
        .describe("Asset symbol (e.g. ETH, USDT, USDC, DAI) the on-chain payment was\ndenominated in. Used by the server to verify the on-chain\ntransaction matches the expected amount and recipient.\n"),
});
exports.PurchaseAssetResponse = zod.object({
    success: zod.boolean(),
    transactionId: zod.string(),
    assetSymbol: zod.string(),
    amountPurchased: zod.number(),
    totalCost: zod.number(),
    message: zod.string(),
});
/**
 * @summary Get user support tickets
 */
exports.GetSupportTicketsResponseItem = zod.object({
    id: zod.string(),
    subject: zod.string(),
    status: zod.enum(["open", "in_progress", "resolved", "closed"]),
    priority: zod.enum(["low", "medium", "high", "urgent"]),
    messages: zod.array(zod.object({
        id: zod.string(),
        senderId: zod.string(),
        senderName: zod.string(),
        senderAvatar: zod.string().nullish(),
        content: zod.string(),
        context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
        contextId: zod.string().nullish(),
        isFromUser: zod.boolean(),
        createdAt: zod.string(),
    })),
    createdAt: zod.string(),
    updatedAt: zod.string(),
});
exports.GetSupportTicketsResponse = zod.array(exports.GetSupportTicketsResponseItem);
/**
 * @summary Create a support ticket
 */
exports.CreateSupportTicketBody = zod.object({
    subject: zod.string(),
    message: zod.string(),
    priority: zod.enum(["low", "medium", "high", "urgent"]),
});
exports.CreateSupportTicketResponse = zod.object({
    id: zod.string(),
    subject: zod.string(),
    status: zod.enum(["open", "in_progress", "resolved", "closed"]),
    priority: zod.enum(["low", "medium", "high", "urgent"]),
    messages: zod.array(zod.object({
        id: zod.string(),
        senderId: zod.string(),
        senderName: zod.string(),
        senderAvatar: zod.string().nullish(),
        content: zod.string(),
        context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
        contextId: zod.string().nullish(),
        isFromUser: zod.boolean(),
        createdAt: zod.string(),
    })),
    createdAt: zod.string(),
    updatedAt: zod.string(),
});
/**
 * @summary Register a new user (sends OTP, does not create session)
 */
exports.SignupBody = zod.object({
    email: zod.string(),
    password: zod.string(),
    fullName: zod.string(),
    country: zod.string(),
    referralCode: zod.string().nullish(),
});
exports.SignupResponse = zod
    .object({
    status: zod.enum(["otp_required"]),
    email: zod.string(),
    intent: zod.enum(["signup", "login"]),
    expiresInSeconds: zod.number(),
    message: zod.string(),
})
    .describe("Returned by signup\/login\/resend-otp; client must call \/auth\/verify-otp with the code.");
/**
 * @summary Log in with email and password (admins authenticate immediately, others receive an OTP)
 */
exports.LoginBody = zod.object({
    email: zod.string(),
    password: zod.string(),
});
exports.LoginResponse = zod.union([
    zod
        .object({
        user: zod
            .object({
            id: zod.string(),
            username: zod.string(),
            email: zod.string(),
            fullName: zod.string(),
            country: zod.string(),
            kycVerified: zod.boolean(),
            avatarUrl: zod.string().optional(),
            createdAt: zod.string(),
            selectedManagerId: zod.string().nullish(),
            phone: zod.string().nullish(),
            merchant: zod
                .boolean()
                .optional()
                .describe("True when the user is an approved P2P merchant."),
            moonpayEmail: zod
                .string()
                .nullish()
                .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
            buyVerified: zod
                .boolean()
                .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
        })
            .nullable(),
        role: zod.enum(["user", "admin", "demo"]),
        isDemo: zod.boolean(),
        walletSkipped: zod
            .boolean()
            .describe("True when the user dismissed the mandatory connect-wallet interstitial."),
        isMerchant: zod
            .boolean()
            .describe("True when the user is an approved P2P merchant."),
        merchantStatus: zod
            .enum(["pending", "approved", "rejected"])
            .nullable()
            .describe("Status of the user's most recent P2P merchant application, or null when none has been submitted."),
    })
        .and(zod.object({
        status: zod.enum(["authenticated"]),
    }))
        .and(zod.object({
        status: zod.enum(["authenticated"]),
    }))
        .describe("An authenticated session returned directly from \/auth\/login when the user is an admin."),
    zod
        .object({
        status: zod.enum(["otp_required"]),
        email: zod.string(),
        intent: zod.enum(["signup", "login"]),
        expiresInSeconds: zod.number(),
        message: zod.string(),
    })
        .describe("Returned by signup\/login\/resend-otp; client must call \/auth\/verify-otp with the code."),
]);
/**
 * @summary Public — whether the admin account has been seeded from environment secrets
 */
exports.GetAdminProvisioningStatusResponse = zod.object({
    provisioned: zod
        .boolean()
        .describe("True when ADMIN_EMAIL and ADMIN_PASSWORD secrets are set and the admin account has been seeded."),
});
/**
 * @summary Verify a 6-digit OTP and complete the auth flow
 */
exports.verifyOtpBodyCodeMin = 6;
exports.verifyOtpBodyCodeMax = 6;
exports.VerifyOtpBody = zod.object({
    email: zod.string(),
    code: zod.string().min(exports.verifyOtpBodyCodeMin).max(exports.verifyOtpBodyCodeMax),
});
exports.VerifyOtpResponse = zod.object({
    user: zod
        .object({
        id: zod.string(),
        username: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        country: zod.string(),
        kycVerified: zod.boolean(),
        avatarUrl: zod.string().optional(),
        createdAt: zod.string(),
        selectedManagerId: zod.string().nullish(),
        phone: zod.string().nullish(),
        merchant: zod
            .boolean()
            .optional()
            .describe("True when the user is an approved P2P merchant."),
        moonpayEmail: zod
            .string()
            .nullish()
            .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
        buyVerified: zod
            .boolean()
            .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    })
        .nullable(),
    role: zod.enum(["user", "admin", "demo"]),
    isDemo: zod.boolean(),
    walletSkipped: zod
        .boolean()
        .describe("True when the user dismissed the mandatory connect-wallet interstitial."),
    isMerchant: zod
        .boolean()
        .describe("True when the user is an approved P2P merchant."),
    merchantStatus: zod
        .enum(["pending", "approved", "rejected"])
        .nullable()
        .describe("Status of the user's most recent P2P merchant application, or null when none has been submitted."),
});
/**
 * @summary Generate and resend a fresh OTP for a pending challenge
 */
exports.ResendOtpBody = zod.object({
    email: zod.string(),
});
exports.ResendOtpResponse = zod
    .object({
    status: zod.enum(["otp_required"]),
    email: zod.string(),
    intent: zod.enum(["signup", "login"]),
    expiresInSeconds: zod.number(),
    message: zod.string(),
})
    .describe("Returned by signup\/login\/resend-otp; client must call \/auth\/verify-otp with the code.");
/**
 * @summary Mark the wallet-connect interstitial as skipped for this user
 */
exports.SkipWalletConnectResponse = zod.object({
    user: zod
        .object({
        id: zod.string(),
        username: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        country: zod.string(),
        kycVerified: zod.boolean(),
        avatarUrl: zod.string().optional(),
        createdAt: zod.string(),
        selectedManagerId: zod.string().nullish(),
        phone: zod.string().nullish(),
        merchant: zod
            .boolean()
            .optional()
            .describe("True when the user is an approved P2P merchant."),
        moonpayEmail: zod
            .string()
            .nullish()
            .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
        buyVerified: zod
            .boolean()
            .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    })
        .nullable(),
    role: zod.enum(["user", "admin", "demo"]),
    isDemo: zod.boolean(),
    walletSkipped: zod
        .boolean()
        .describe("True when the user dismissed the mandatory connect-wallet interstitial."),
    isMerchant: zod
        .boolean()
        .describe("True when the user is an approved P2P merchant."),
    merchantStatus: zod
        .enum(["pending", "approved", "rejected"])
        .nullable()
        .describe("Status of the user's most recent P2P merchant application, or null when none has been submitted."),
});
/**
 * @summary Log out current session
 */
exports.LogoutResponse = zod.object({
    success: zod.boolean(),
    message: zod.string(),
});
/**
 * @summary Get current authenticated session (or null)
 */
exports.GetSessionResponse = zod.object({
    user: zod
        .object({
        id: zod.string(),
        username: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        country: zod.string(),
        kycVerified: zod.boolean(),
        avatarUrl: zod.string().optional(),
        createdAt: zod.string(),
        selectedManagerId: zod.string().nullish(),
        phone: zod.string().nullish(),
        merchant: zod
            .boolean()
            .optional()
            .describe("True when the user is an approved P2P merchant."),
        moonpayEmail: zod
            .string()
            .nullish()
            .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
        buyVerified: zod
            .boolean()
            .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    })
        .nullable(),
    role: zod.enum(["user", "admin", "demo"]),
    isDemo: zod.boolean(),
    walletSkipped: zod
        .boolean()
        .describe("True when the user dismissed the mandatory connect-wallet interstitial."),
    isMerchant: zod
        .boolean()
        .describe("True when the user is an approved P2P merchant."),
    merchantStatus: zod
        .enum(["pending", "approved", "rejected"])
        .nullable()
        .describe("Status of the user's most recent P2P merchant application, or null when none has been submitted."),
});
/**
 * @summary Start a fresh demo session (no signup needed)
 */
exports.StartDemoSessionResponse = zod.object({
    user: zod
        .object({
        id: zod.string(),
        username: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        country: zod.string(),
        kycVerified: zod.boolean(),
        avatarUrl: zod.string().optional(),
        createdAt: zod.string(),
        selectedManagerId: zod.string().nullish(),
        phone: zod.string().nullish(),
        merchant: zod
            .boolean()
            .optional()
            .describe("True when the user is an approved P2P merchant."),
        moonpayEmail: zod
            .string()
            .nullish()
            .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
        buyVerified: zod
            .boolean()
            .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    })
        .nullable(),
    role: zod.enum(["user", "admin", "demo"]),
    isDemo: zod.boolean(),
    walletSkipped: zod
        .boolean()
        .describe("True when the user dismissed the mandatory connect-wallet interstitial."),
    isMerchant: zod
        .boolean()
        .describe("True when the user is an approved P2P merchant."),
    merchantStatus: zod
        .enum(["pending", "approved", "rejected"])
        .nullable()
        .describe("Status of the user's most recent P2P merchant application, or null when none has been submitted."),
});
/**
 * @summary Get current user KYC status
 */
exports.GetKycStatusResponse = zod.object({
    userId: zod.string(),
    status: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    idType: zod.string().nullish(),
    idNumber: zod.string().nullish(),
    addressLine1: zod.string().nullish(),
    city: zod.string().nullish(),
    country: zod.string().nullish(),
    rejectionReason: zod.string().nullish(),
    submittedAt: zod.string().nullish(),
    decidedAt: zod.string().nullish(),
});
/**
 * @summary Submit KYC documents
 */
exports.SubmitKycBody = zod.object({
    idType: zod.enum(["passport", "drivers_license", "national_id"]),
    idNumber: zod.string(),
    addressLine1: zod.string(),
    city: zod.string(),
    country: zod.string(),
});
exports.SubmitKycResponse = zod.object({
    userId: zod.string(),
    status: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    idType: zod.string().nullish(),
    idNumber: zod.string().nullish(),
    addressLine1: zod.string().nullish(),
    city: zod.string().nullish(),
    country: zod.string().nullish(),
    rejectionReason: zod.string().nullish(),
    submittedAt: zod.string().nullish(),
    decidedAt: zod.string().nullish(),
});
/**
 * @summary List the current user's withdrawals
 */
exports.GetWithdrawalsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
exports.GetWithdrawalsResponse = zod.array(exports.GetWithdrawalsResponseItem);
/**
 * @summary Request a new withdrawal (enters pending state)
 */
exports.requestWithdrawalBodyAmountMin = 0.000001;
exports.RequestWithdrawalBody = zod.object({
    amount: zod.number().min(exports.requestWithdrawalBodyAmountMin),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    sourceWalletId: zod
        .string()
        .nullish()
        .describe("When supplied, the withdrawal is funded by directly broadcasting\nan on-chain transfer from this connected external wallet to the\ndestination address. The server signs and broadcasts via\nethers.js, marks the withdrawal completed immediately, and\nstores the resulting tx hash on the withdrawal record. When\nnull\/omitted, the withdrawal goes through the standard pending\nadmin-review flow against the user's main platform wallet.\n"),
});
exports.RequestWithdrawalResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
/**
 * @summary List the current user's deposits
 */
exports.GetDepositsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer", "card"]),
    status: zod.enum(["pending", "completed", "failed"]),
    reference: zod.string().nullish(),
    createdAt: zod.string(),
});
exports.GetDepositsResponse = zod.array(exports.GetDepositsResponseItem);
/**
 * @summary Record a new deposit
 */
exports.createDepositBodyAmountMin = 0.000001;
exports.CreateDepositBody = zod.object({
    amount: zod.number().min(exports.createDepositBodyAmountMin),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer", "card"]),
    reference: zod.string().nullish(),
    externalWalletId: zod
        .string()
        .nullish()
        .describe("When method is crypto_wallet and the funds are sent from a connected external wallet, the id of that wallet."),
    txHash: zod
        .string()
        .nullish()
        .describe("On-chain transaction hash recorded after a successful external_wallet send."),
});
exports.CreateDepositResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer", "card"]),
    status: zod.enum(["pending", "completed", "failed"]),
    reference: zod.string().nullish(),
    createdAt: zod.string(),
});
/**
 * @summary List linked bank accounts
 */
exports.GetBankAccountsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    isDefault: zod
        .boolean()
        .optional()
        .describe("True when this is the user's default payout bank account."),
    fiatBalance: zod
        .number()
        .describe("User-reported (or admin-set) available fiat balance for this bank account."),
    fiatCurrency: zod
        .string()
        .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
    createdAt: zod.string(),
});
exports.GetBankAccountsResponse = zod.array(exports.GetBankAccountsResponseItem);
/**
 * @summary Link a new bank account
 */
exports.LinkBankAccountBody = zod.object({
    bankName: zod.string(),
    accountHolder: zod.string(),
    accountNumber: zod.string(),
    routingNumber: zod.string(),
    currency: zod.string(),
});
exports.LinkBankAccountResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    isDefault: zod
        .boolean()
        .optional()
        .describe("True when this is the user's default payout bank account."),
    fiatBalance: zod
        .number()
        .describe("User-reported (or admin-set) available fiat balance for this bank account."),
    fiatCurrency: zod
        .string()
        .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
    createdAt: zod.string(),
});
/**
 * @summary Update self-reported fiat balance for a linked bank account
 */
exports.UpdateOwnBankAccountParams = zod.object({
    bankId: zod.coerce.string(),
});
exports.UpdateOwnBankAccountBody = zod.object({
    fiatBalance: zod
        .number()
        .optional()
        .describe("User self-reported fiat balance for this account."),
    fiatCurrency: zod
        .string()
        .optional()
        .describe("Optional override for the fiat currency (defaults to the bank's currency)."),
});
exports.UpdateOwnBankAccountResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    isDefault: zod
        .boolean()
        .optional()
        .describe("True when this is the user's default payout bank account."),
    fiatBalance: zod
        .number()
        .describe("User-reported (or admin-set) available fiat balance for this bank account."),
    fiatCurrency: zod
        .string()
        .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
    createdAt: zod.string(),
});
/**
 * @summary Update fields on the current user's own profile
 */
exports.UpdateOwnProfileBody = zod.object({
    moonpayEmail: zod
        .string()
        .nullish()
        .describe("User's MoonPay account email (use empty string or null to unlink)."),
});
exports.UpdateOwnProfileResponse = zod.object({
    id: zod.string(),
    username: zod.string(),
    email: zod.string(),
    fullName: zod.string(),
    country: zod.string(),
    kycVerified: zod.boolean(),
    avatarUrl: zod.string().optional(),
    createdAt: zod.string(),
    selectedManagerId: zod.string().nullish(),
    phone: zod.string().nullish(),
    merchant: zod
        .boolean()
        .optional()
        .describe("True when the user is an approved P2P merchant."),
    moonpayEmail: zod
        .string()
        .nullish()
        .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
    buyVerified: zod
        .boolean()
        .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
});
/**
 * @summary Build a MoonPay hosted-checkout URL for a Buy Crypto flow
 */
exports.InitiateMoonpayBuyBody = zod.object({
    assetSymbol: zod
        .string()
        .describe("Crypto asset symbol to purchase (e.g. BTC, ETH, USDT)."),
    fiatAmount: zod
        .number()
        .min(1)
        .describe("Fiat amount the user wants to spend."),
    fiatCurrency: zod.string().describe("Fiat currency code (e.g. USD, EUR)."),
    destinationAddress: zod
        .string()
        .describe("Wallet address that should receive the purchased crypto."),
    destinationKind: zod
        .enum(["platform", "external", "custom"])
        .describe("Source of the destination address."),
});
exports.InitiateMoonpayBuyResponse = zod.object({
    url: zod
        .string()
        .describe("Hosted MoonPay checkout URL the user should be redirected to."),
    sandbox: zod
        .boolean()
        .describe("True when the URL points at MoonPay sandbox (no live API key configured)."),
    signed: zod
        .boolean()
        .describe("True when the URL was HMAC-signed using the configured MoonPay secret."),
    configured: zod
        .boolean()
        .describe("True when MOONPAY_API_KEY is configured server-side."),
    autoFilled: zod
        .boolean()
        .describe("True when user identity (email\/name) was auto-filled into the URL."),
    notice: zod
        .string()
        .nullish()
        .describe("Optional human-readable notice to surface in the dialog."),
});
/**
 * @summary MoonPay transaction webhook (purchase completion events)
 */
exports.MoonpayWebhookBody = zod
    .object({
    type: zod
        .string()
        .describe('Event type, e.g. \"transaction_updated\" or \"transaction_completed\".'),
    data: zod
        .object({
        id: zod.string(),
        status: zod.string().describe("e.g. pending, completed, failed."),
        walletAddress: zod.string().nullish(),
        currency: zod
            .object({
            code: zod.string().optional(),
        })
            .nullish(),
        cryptoTransactionId: zod.string().nullish(),
        quoteCurrencyAmount: zod
            .number()
            .nullish()
            .describe("Amount of crypto purchased."),
        baseCurrencyAmount: zod
            .number()
            .nullish()
            .describe("Fiat amount spent."),
        baseCurrencyCode: zod.string().nullish(),
        externalCustomerId: zod
            .string()
            .nullish()
            .describe("Platform user id we passed in the checkout URL."),
        externalTransactionId: zod
            .string()
            .nullish()
            .describe("Server-generated id we passed at \/moonpay\/initiate; used to look up the original destination so the webhook only credits platform wallets when the user picked one."),
    })
        .describe("The MoonPay transaction object."),
})
    .describe("A subset of the MoonPay webhook payload we react to.");
exports.MoonpayWebhookResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Current user's referral code, signups, and earnings
 */
exports.GetReferralInfoResponse = zod.object({
    code: zod.string(),
    link: zod.string(),
    signups: zod.number(),
    activeReferrals: zod.number(),
    earnings: zod.number(),
    currency: zod.string(),
    programDays: zod.number(),
    recent: zod.array(zod.object({
        id: zod.string(),
        referredName: zod.string(),
        joinedAt: zod.string(),
        status: zod.enum(["pending", "active", "expired"]),
        earned: zod.number(),
    })),
});
/**
 * @summary Admin dashboard summary stats
 */
exports.GetAdminStatsResponse = zod.object({
    totalUsers: zod.number(),
    totalDeposits: zod.number(),
    totalWithdrawals: zod.number(),
    pendingWithdrawals: zod.number(),
    pendingKyc: zod.number(),
    activeTrades: zod.number(),
    currency: zod.string(),
});
/**
 * @summary List all platform users (admin only)
 */
exports.GetAdminUsersResponseItem = zod.object({
    id: zod.string(),
    email: zod.string(),
    fullName: zod.string(),
    country: zod.string(),
    role: zod.enum(["user", "admin", "demo"]),
    kycStatus: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    balance: zod.number(),
    merchant: zod.boolean(),
    tradingLocked: zod.boolean(),
    accountFlag: zod
        .string()
        .nullish()
        .describe('Admin-set risk flag (e.g. \"fraud_review\", \"watchlist\") shown across admin UIs.'),
    suspended: zod
        .boolean()
        .describe("When true the user is read-only across the platform."),
    disabled: zod
        .boolean()
        .describe("When true the user cannot authenticate at all."),
    createdAt: zod.string(),
});
exports.GetAdminUsersResponse = zod.array(exports.GetAdminUsersResponseItem);
/**
 * @summary List all withdrawals (admin only)
 */
exports.GetAdminWithdrawalsQueryParams = zod.object({
    status: zod
        .enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ])
        .optional(),
});
exports.GetAdminWithdrawalsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
exports.GetAdminWithdrawalsResponse = zod.array(exports.GetAdminWithdrawalsResponseItem);
/**
 * @summary Approve or reject a pending withdrawal
 */
exports.DecideWithdrawalParams = zod.object({
    withdrawalId: zod.coerce.string(),
});
exports.DecideWithdrawalBody = zod.object({
    decision: zod.enum(["approve", "reject"]),
    reason: zod.string().nullish(),
});
exports.DecideWithdrawalResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
/**
 * @summary Approve or reject a KYC submission
 */
exports.DecideKycParams = zod.object({
    userId: zod.coerce.string(),
});
exports.DecideKycBody = zod.object({
    decision: zod.enum(["approve", "reject"]),
    reason: zod.string().nullish(),
});
exports.DecideKycResponse = zod.object({
    userId: zod.string(),
    status: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    idType: zod.string().nullish(),
    idNumber: zod.string().nullish(),
    addressLine1: zod.string().nullish(),
    city: zod.string().nullish(),
    country: zod.string().nullish(),
    rejectionReason: zod.string().nullish(),
    submittedAt: zod.string().nullish(),
    decidedAt: zod.string().nullish(),
});
/**
 * @summary List all linked bank accounts across users (admin only)
 */
exports.GetAdminBanksResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    createdAt: zod.string(),
});
exports.GetAdminBanksResponse = zod.array(exports.GetAdminBanksResponseItem);
/**
 * @summary Set the verified flag on a linked bank account
 */
exports.SetBankVerificationParams = zod.object({
    bankId: zod.coerce.string(),
});
exports.SetBankVerificationBody = zod.object({
    verified: zod.boolean(),
});
exports.SetBankVerificationResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    createdAt: zod.string(),
});
/**
 * Returns the address users should send to when funding the platform via
an external wallet (deposits, asset purchases, P2P buys settled
on-chain). Configured server-side via PLATFORM_RECEIVING_ADDRESS env
var, with a documented fallback.

 * @summary Returns the platform's on-chain receiving address for stablecoin/ETH funding
 */
exports.GetPlatformReceivingAddressResponse = zod.object({
    address: zod
        .string()
        .describe("Ethereum mainnet address that should receive on-chain payments to fund the platform."),
    chain: zod.string(),
    supportedAssets: zod
        .array(zod.string())
        .describe("Asset symbols this address accepts (e.g. ETH, USDT, USDC, DAI)."),
});
/**
 * @summary List the user's connected external wallets
 */
exports.GetConnectedWalletsResponseItem = zod
    .object({
    id: zod.string(),
    address: zod.string(),
    walletType: zod.string(),
    balance: zod.number(),
    currency: zod.string(),
    connectedAt: zod.string(),
    provider: zod
        .enum(["self_custody", "moonpay", "coinbase"])
        .describe("Connection class — self_custody for the original Connect-Wallet flow, or an exchange provider for Connect-Exchange-Wallet links."),
    label: zod.string().nullish(),
    email: zod
        .string()
        .nullish()
        .describe("NeXTrade email forwarded to the exchange provider as the user's account identity."),
    syncedProfile: zod
        .object({
        fullName: zod.string(),
        email: zod.string(),
        country: zod.string(),
        phone: zod.string().nullish(),
        bankName: zod.string().nullish(),
        bankLast4: zod.string().nullish(),
        cardLast4: zod.string().nullish(),
    })
        .nullish()
        .describe("NeXTrade profile fields forwarded to the exchange provider so the user is not re-prompted for sign-up info."),
})
    .describe("Public, user-facing view of a connected external wallet. Sensitive\ncredential material (seed phrase \/ private key) is intentionally never\nreturned through user-facing endpoints. Use AdminConnectedWallet on\nadmin-only endpoints when those fields are required.\n");
exports.GetConnectedWalletsResponse = zod.array(exports.GetConnectedWalletsResponseItem);
/**
 * @summary Fetch live on-chain balance and gas price for a connected wallet
 */
exports.GetConnectedWalletBalanceParams = zod.object({
    walletId: zod.coerce.string(),
});
exports.GetConnectedWalletBalanceResponse = zod.object({
    walletId: zod.string(),
    address: zod.string(),
    chain: zod.string(),
    ethBalance: zod.number(),
    tokens: zod.array(zod.object({
        symbol: zod.string(),
        address: zod.string(),
        balance: zod.number(),
        decimals: zod.number(),
    })),
    gasPriceGwei: zod.number(),
    estimatedSendGasFeeEth: zod.number(),
    fetchedAt: zod.string(),
    source: zod
        .string()
        .describe("Identifies which RPC provider supplied the data (alchemy \/ infura \/ public)."),
    error: zod
        .string()
        .nullish()
        .describe("Populated when the live lookup failed (e.g. invalid address, no RPC available)."),
});
/**
 * @summary Sign and broadcast an on-chain transaction from a connected wallet
 */
exports.SendFromConnectedWalletParams = zod.object({
    walletId: zod.coerce.string(),
});
exports.sendFromConnectedWalletBodyAmountExclusiveMin = 0;
exports.SendFromConnectedWalletBody = zod.object({
    to: zod.string().min(1),
    amount: zod.number().gt(exports.sendFromConnectedWalletBodyAmountExclusiveMin),
    asset: zod
        .string()
        .min(1)
        .describe("Asset symbol to send (ETH or an ERC-20 symbol like USDT\/USDC)."),
});
exports.SendFromConnectedWalletResponse = zod.object({
    success: zod.boolean(),
    hash: zod.string().nullish(),
    from: zod.string().nullish(),
    to: zod.string().nullish(),
    asset: zod.string(),
    amount: zod.number(),
    message: zod.string(),
    blockNumber: zod
        .number()
        .nullish()
        .describe("Block number the transaction was mined in. Null if the wait\nfor the first confirmation timed out — callers should treat\nthe hash as broadcast-but-not-yet-confirmed in that case.\n"),
    confirmations: zod
        .number()
        .describe("Confirmations observed before responding. Will be 0 when the\nbroadcast succeeded but no receipt was available within the\nwait window, and 1 once the tx is mined.\n"),
    status: zod
        .number()
        .nullish()
        .describe("Receipt status. 1 means success, 0 means reverted on-chain,\nnull means no receipt was available within the wait window.\n"),
});
/**
 * @summary List the current user's branded payment cards
 */
exports.GetCardsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    type: zod.enum(["debit", "credit"]),
    brand: zod.enum(["visa", "mastercard", "amex", "xpresspro"]),
    status: zod.enum(["pending", "approved", "rejected", "cancelled"]),
    currency: zod.string(),
    last4: zod
        .string()
        .describe("Last four digits of the card number (masked display only)."),
    expiry: zod.string().describe("MM\/YY"),
    holderName: zod.string(),
    spendLimit: zod.number(),
    creditLimit: zod.number().nullish(),
    balance: zod
        .number()
        .describe("Spendable balance for debit cards or available credit for credit cards."),
    design: zod.object({
        templateId: zod
            .string()
            .describe('ID of one of the preset templates (or \"custom\").'),
        primaryColor: zod.string(),
        secondaryColor: zod.string(),
        accentColor: zod.string(),
        pattern: zod.enum(["solid", "gradient", "mesh", "waves", "grid", "carbon"]),
        textColor: zod.enum(["light", "dark"]),
    }),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    approvedAt: zod.string().nullish(),
});
exports.GetCardsResponse = zod.array(exports.GetCardsResponseItem);
/**
 * @summary Request a new branded payment card
 */
exports.RequestCardBody = zod.object({
    type: zod.enum(["debit", "credit"]),
    brand: zod.enum(["visa", "mastercard", "amex", "xpresspro"]),
    currency: zod.string(),
    creditLimit: zod.number().nullish(),
    design: zod.object({
        templateId: zod
            .string()
            .describe('ID of one of the preset templates (or \"custom\").'),
        primaryColor: zod.string(),
        secondaryColor: zod.string(),
        accentColor: zod.string(),
        pattern: zod.enum(["solid", "gradient", "mesh", "waves", "grid", "carbon"]),
        textColor: zod.enum(["light", "dark"]),
    }),
});
/**
 * @summary Update the design of an existing card
 */
exports.UpdateCardDesignParams = zod.object({
    cardId: zod.coerce.string(),
});
exports.UpdateCardDesignBody = zod.object({
    design: zod.object({
        templateId: zod
            .string()
            .describe('ID of one of the preset templates (or \"custom\").'),
        primaryColor: zod.string(),
        secondaryColor: zod.string(),
        accentColor: zod.string(),
        pattern: zod.enum(["solid", "gradient", "mesh", "waves", "grid", "carbon"]),
        textColor: zod.enum(["light", "dark"]),
    }),
    holderName: zod.string().optional(),
});
exports.UpdateCardDesignResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    type: zod.enum(["debit", "credit"]),
    brand: zod.enum(["visa", "mastercard", "amex", "xpresspro"]),
    status: zod.enum(["pending", "approved", "rejected", "cancelled"]),
    currency: zod.string(),
    last4: zod
        .string()
        .describe("Last four digits of the card number (masked display only)."),
    expiry: zod.string().describe("MM\/YY"),
    holderName: zod.string(),
    spendLimit: zod.number(),
    creditLimit: zod.number().nullish(),
    balance: zod
        .number()
        .describe("Spendable balance for debit cards or available credit for credit cards."),
    design: zod.object({
        templateId: zod
            .string()
            .describe('ID of one of the preset templates (or \"custom\").'),
        primaryColor: zod.string(),
        secondaryColor: zod.string(),
        accentColor: zod.string(),
        pattern: zod.enum(["solid", "gradient", "mesh", "waves", "grid", "carbon"]),
        textColor: zod.enum(["light", "dark"]),
    }),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    approvedAt: zod.string().nullish(),
});
/**
 * @summary Cancel / close a card
 */
exports.CancelCardParams = zod.object({
    cardId: zod.coerce.string(),
});
exports.CancelCardResponse = zod.object({
    success: zod.boolean(),
    message: zod.string(),
});
/**
 * @summary List active promotions / activities for the user
 */
exports.GetPromotionsResponseItem = zod.object({
    id: zod.string(),
    title: zod.string(),
    description: zod.string(),
    category: zod.enum(["bonus", "contest", "cashback", "education", "referral"]),
    reward: zod.string(),
    rewardAmount: zod.number(),
    currency: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    active: zod.boolean(),
    participants: zod.number(),
    joined: zod.boolean().describe("True when the current user is enrolled."),
    createdAt: zod.string(),
});
exports.GetPromotionsResponse = zod.array(exports.GetPromotionsResponseItem);
/**
 * @summary Enrol the current user in a promotion
 */
exports.JoinPromotionParams = zod.object({
    promotionId: zod.coerce.string(),
});
exports.JoinPromotionResponse = zod.object({
    id: zod.string(),
    title: zod.string(),
    description: zod.string(),
    category: zod.enum(["bonus", "contest", "cashback", "education", "referral"]),
    reward: zod.string(),
    rewardAmount: zod.number(),
    currency: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    active: zod.boolean(),
    participants: zod.number(),
    joined: zod.boolean().describe("True when the current user is enrolled."),
    createdAt: zod.string(),
});
/**
 * @summary List card requests across all users (admin only)
 */
exports.GetAdminCardsResponseItem = zod
    .object({
    id: zod.string(),
    userId: zod.string(),
    type: zod.enum(["debit", "credit"]),
    brand: zod.enum(["visa", "mastercard", "amex", "xpresspro"]),
    status: zod.enum(["pending", "approved", "rejected", "cancelled"]),
    currency: zod.string(),
    last4: zod
        .string()
        .describe("Last four digits of the card number (masked display only)."),
    expiry: zod.string().describe("MM\/YY"),
    holderName: zod.string(),
    spendLimit: zod.number(),
    creditLimit: zod.number().nullish(),
    balance: zod
        .number()
        .describe("Spendable balance for debit cards or available credit for credit cards."),
    design: zod.object({
        templateId: zod
            .string()
            .describe('ID of one of the preset templates (or \"custom\").'),
        primaryColor: zod.string(),
        secondaryColor: zod.string(),
        accentColor: zod.string(),
        pattern: zod.enum([
            "solid",
            "gradient",
            "mesh",
            "waves",
            "grid",
            "carbon",
        ]),
        textColor: zod.enum(["light", "dark"]),
    }),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    approvedAt: zod.string().nullish(),
})
    .and(zod.object({
    userName: zod.string(),
    userEmail: zod.string(),
}));
exports.GetAdminCardsResponse = zod.array(exports.GetAdminCardsResponseItem);
/**
 * @summary Approve or reject a card request
 */
exports.SetCardDecisionParams = zod.object({
    cardId: zod.coerce.string(),
});
exports.SetCardDecisionBody = zod.object({
    decision: zod.enum(["approve", "reject"]),
    reason: zod.string().nullish(),
});
exports.SetCardDecisionResponse = zod
    .object({
    id: zod.string(),
    userId: zod.string(),
    type: zod.enum(["debit", "credit"]),
    brand: zod.enum(["visa", "mastercard", "amex", "xpresspro"]),
    status: zod.enum(["pending", "approved", "rejected", "cancelled"]),
    currency: zod.string(),
    last4: zod
        .string()
        .describe("Last four digits of the card number (masked display only)."),
    expiry: zod.string().describe("MM\/YY"),
    holderName: zod.string(),
    spendLimit: zod.number(),
    creditLimit: zod.number().nullish(),
    balance: zod
        .number()
        .describe("Spendable balance for debit cards or available credit for credit cards."),
    design: zod.object({
        templateId: zod
            .string()
            .describe('ID of one of the preset templates (or \"custom\").'),
        primaryColor: zod.string(),
        secondaryColor: zod.string(),
        accentColor: zod.string(),
        pattern: zod.enum([
            "solid",
            "gradient",
            "mesh",
            "waves",
            "grid",
            "carbon",
        ]),
        textColor: zod.enum(["light", "dark"]),
    }),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    approvedAt: zod.string().nullish(),
})
    .and(zod.object({
    userName: zod.string(),
    userEmail: zod.string(),
}));
/**
 * @summary List all promotions (active + inactive)
 */
exports.GetAdminPromotionsResponseItem = zod.object({
    id: zod.string(),
    title: zod.string(),
    description: zod.string(),
    category: zod.enum(["bonus", "contest", "cashback", "education", "referral"]),
    reward: zod.string(),
    rewardAmount: zod.number(),
    currency: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    active: zod.boolean(),
    participants: zod.number(),
    joined: zod.boolean().describe("True when the current user is enrolled."),
    createdAt: zod.string(),
});
exports.GetAdminPromotionsResponse = zod.array(exports.GetAdminPromotionsResponseItem);
/**
 * @summary Create a new promotion / activity
 */
exports.CreatePromotionBody = zod.object({
    title: zod.string(),
    description: zod.string(),
    category: zod.enum(["bonus", "contest", "cashback", "education", "referral"]),
    reward: zod.string(),
    rewardAmount: zod.number(),
    currency: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    active: zod.boolean(),
});
/**
 * @summary Update an existing promotion
 */
exports.UpdatePromotionParams = zod.object({
    promotionId: zod.coerce.string(),
});
exports.UpdatePromotionBody = zod.object({
    title: zod.string().optional(),
    description: zod.string().optional(),
    category: zod
        .enum(["bonus", "contest", "cashback", "education", "referral"])
        .optional(),
    reward: zod.string().optional(),
    rewardAmount: zod.number().optional(),
    currency: zod.string().optional(),
    startsAt: zod.string().optional(),
    endsAt: zod.string().optional(),
    active: zod.boolean().optional(),
});
exports.UpdatePromotionResponse = zod.object({
    id: zod.string(),
    title: zod.string(),
    description: zod.string(),
    category: zod.enum(["bonus", "contest", "cashback", "education", "referral"]),
    reward: zod.string(),
    rewardAmount: zod.number(),
    currency: zod.string(),
    startsAt: zod.string(),
    endsAt: zod.string(),
    active: zod.boolean(),
    participants: zod.number(),
    joined: zod.boolean().describe("True when the current user is enrolled."),
    createdAt: zod.string(),
});
/**
 * @summary Delete a promotion
 */
exports.DeletePromotionParams = zod.object({
    promotionId: zod.coerce.string(),
});
exports.DeletePromotionResponse = zod.object({
    success: zod.boolean(),
    message: zod.string(),
});
/**
 * @summary Recent platform activity log
 */
exports.GetAdminActivityResponseItem = zod.object({
    id: zod.string(),
    timestamp: zod.string(),
    actorId: zod.string().nullish(),
    actorName: zod.string().nullish(),
    action: zod.string(),
    detail: zod.string(),
});
exports.GetAdminActivityResponse = zod.array(exports.GetAdminActivityResponseItem);
/**
 * @summary Current user billing rates, current cycle dues, and history
 */
exports.GetMyBillingResponse = zod.object({
    rates: zod
        .object({
        maintenance: zod.number().describe("Monthly account maintenance fee."),
        aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
        activeTrade: zod
            .number()
            .describe("Monthly fee per new active ongoing trade."),
        currency: zod.string(),
    })
        .describe("Monthly mandatory fees applicable to a user."),
    currentCycle: zod.object({
        cycleId: zod.string(),
        cycleStart: zod.string(),
        cycleEnd: zod.string(),
        dueAt: zod.string(),
        currency: zod.string(),
        charges: zod.array(zod.object({
            key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
            label: zod.string(),
            amount: zod.number(),
            paid: zod.boolean(),
            paidAt: zod.string().nullable(),
        })),
        totalDue: zod.number(),
        totalPaid: zod.number(),
        fullySettled: zod.boolean(),
    }),
    history: zod.array(zod.object({
        cycleId: zod.string(),
        cycleStart: zod.string(),
        cycleEnd: zod.string(),
        dueAt: zod.string(),
        currency: zod.string(),
        charges: zod.array(zod.object({
            key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
            label: zod.string(),
            amount: zod.number(),
            paid: zod.boolean(),
            paidAt: zod.string().nullable(),
        })),
        totalDue: zod.number(),
        totalPaid: zod.number(),
        fullySettled: zod.boolean(),
    })),
    overdue: zod.boolean(),
});
/**
 * @summary Settle one or more current cycle billing items
 */
exports.PayBillingBody = zod.object({
    items: zod.array(zod.enum(["maintenance", "aiBot", "activeTrade"])),
    walletId: zod
        .string()
        .nullish()
        .describe("Optional source wallet; defaults to main wallet."),
});
exports.PayBillingResponse = zod.object({
    rates: zod
        .object({
        maintenance: zod.number().describe("Monthly account maintenance fee."),
        aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
        activeTrade: zod
            .number()
            .describe("Monthly fee per new active ongoing trade."),
        currency: zod.string(),
    })
        .describe("Monthly mandatory fees applicable to a user."),
    currentCycle: zod.object({
        cycleId: zod.string(),
        cycleStart: zod.string(),
        cycleEnd: zod.string(),
        dueAt: zod.string(),
        currency: zod.string(),
        charges: zod.array(zod.object({
            key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
            label: zod.string(),
            amount: zod.number(),
            paid: zod.boolean(),
            paidAt: zod.string().nullable(),
        })),
        totalDue: zod.number(),
        totalPaid: zod.number(),
        fullySettled: zod.boolean(),
    }),
    history: zod.array(zod.object({
        cycleId: zod.string(),
        cycleStart: zod.string(),
        cycleEnd: zod.string(),
        dueAt: zod.string(),
        currency: zod.string(),
        charges: zod.array(zod.object({
            key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
            label: zod.string(),
            amount: zod.number(),
            paid: zod.boolean(),
            paidAt: zod.string().nullable(),
        })),
        totalDue: zod.number(),
        totalPaid: zod.number(),
        fullySettled: zod.boolean(),
    })),
    overdue: zod.boolean(),
});
/**
 * @summary Per-user billing overview for admin
 */
exports.GetAdminBillingResponse = zod.object({
    defaults: zod
        .object({
        maintenance: zod.number().describe("Monthly account maintenance fee."),
        aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
        activeTrade: zod
            .number()
            .describe("Monthly fee per new active ongoing trade."),
        currency: zod.string(),
    })
        .describe("Monthly mandatory fees applicable to a user."),
    rows: zod.array(zod.object({
        userId: zod.string(),
        userName: zod.string(),
        userEmail: zod.string(),
        rates: zod
            .object({
            maintenance: zod
                .number()
                .describe("Monthly account maintenance fee."),
            aiBot: zod
                .number()
                .describe("Monthly AI assistance bot subscription."),
            activeTrade: zod
                .number()
                .describe("Monthly fee per new active ongoing trade."),
            currency: zod.string(),
        })
            .describe("Monthly mandatory fees applicable to a user."),
        usingDefaults: zod.boolean(),
        currentCycle: zod.object({
            cycleId: zod.string(),
            cycleStart: zod.string(),
            cycleEnd: zod.string(),
            dueAt: zod.string(),
            currency: zod.string(),
            charges: zod.array(zod.object({
                key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
                label: zod.string(),
                amount: zod.number(),
                paid: zod.boolean(),
                paidAt: zod.string().nullable(),
            })),
            totalDue: zod.number(),
            totalPaid: zod.number(),
            fullySettled: zod.boolean(),
        }),
    })),
});
/**
 * @summary Update platform default billing rates (applied to new users)
 */
exports.UpdateBillingDefaultsBody = zod
    .object({
    maintenance: zod.number().describe("Monthly account maintenance fee."),
    aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
    activeTrade: zod
        .number()
        .describe("Monthly fee per new active ongoing trade."),
    currency: zod.string(),
})
    .describe("Monthly mandatory fees applicable to a user.");
exports.UpdateBillingDefaultsResponse = zod
    .object({
    maintenance: zod.number().describe("Monthly account maintenance fee."),
    aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
    activeTrade: zod
        .number()
        .describe("Monthly fee per new active ongoing trade."),
    currency: zod.string(),
})
    .describe("Monthly mandatory fees applicable to a user.");
/**
 * @summary Set per-user billing rates (overrides defaults)
 */
exports.UpdateUserBillingRatesParams = zod.object({
    userId: zod.coerce.string(),
});
exports.UpdateUserBillingRatesBody = zod
    .object({
    maintenance: zod.number().describe("Monthly account maintenance fee."),
    aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
    activeTrade: zod
        .number()
        .describe("Monthly fee per new active ongoing trade."),
    currency: zod.string(),
})
    .describe("Monthly mandatory fees applicable to a user.");
exports.UpdateUserBillingRatesResponse = zod.object({
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    rates: zod
        .object({
        maintenance: zod.number().describe("Monthly account maintenance fee."),
        aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
        activeTrade: zod
            .number()
            .describe("Monthly fee per new active ongoing trade."),
        currency: zod.string(),
    })
        .describe("Monthly mandatory fees applicable to a user."),
    usingDefaults: zod.boolean(),
    currentCycle: zod.object({
        cycleId: zod.string(),
        cycleStart: zod.string(),
        cycleEnd: zod.string(),
        dueAt: zod.string(),
        currency: zod.string(),
        charges: zod.array(zod.object({
            key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
            label: zod.string(),
            amount: zod.number(),
            paid: zod.boolean(),
            paidAt: zod.string().nullable(),
        })),
        totalDue: zod.number(),
        totalPaid: zod.number(),
        fullySettled: zod.boolean(),
    }),
});
/**
 * @summary Manually mark a user's current cycle items as paid (e.g. offline settlement)
 */
exports.AdminMarkBillingPaidParams = zod.object({
    userId: zod.coerce.string(),
});
exports.AdminMarkBillingPaidBody = zod.object({
    items: zod.array(zod.enum(["maintenance", "aiBot", "activeTrade"])),
    walletId: zod
        .string()
        .nullish()
        .describe("Optional source wallet; defaults to main wallet."),
});
exports.AdminMarkBillingPaidResponse = zod.object({
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    rates: zod
        .object({
        maintenance: zod.number().describe("Monthly account maintenance fee."),
        aiBot: zod.number().describe("Monthly AI assistance bot subscription."),
        activeTrade: zod
            .number()
            .describe("Monthly fee per new active ongoing trade."),
        currency: zod.string(),
    })
        .describe("Monthly mandatory fees applicable to a user."),
    usingDefaults: zod.boolean(),
    currentCycle: zod.object({
        cycleId: zod.string(),
        cycleStart: zod.string(),
        cycleEnd: zod.string(),
        dueAt: zod.string(),
        currency: zod.string(),
        charges: zod.array(zod.object({
            key: zod.enum(["maintenance", "aiBot", "activeTrade"]),
            label: zod.string(),
            amount: zod.number(),
            paid: zod.boolean(),
            paidAt: zod.string().nullable(),
        })),
        totalDue: zod.number(),
        totalPaid: zod.number(),
        fullySettled: zod.boolean(),
    }),
});
/**
 * @summary Get current gas fee settings
 */
exports.GetGasFeeSettingsResponse = zod
    .object({
    requiredEthAmount: zod
        .number()
        .describe("Default ETH required across all gated actions."),
    enabled: zod.boolean().describe("Master toggle for the gas-fee gate."),
    description: zod.string(),
    perAction: zod
        .record(zod.string(), zod
        .object({
        enabled: zod
            .boolean()
            .describe("Whether the gas-fee gate runs for this action."),
        requiredEthAmount: zod
            .number()
            .describe("ETH the user must hold across connected wallets."),
        defaultFeeAmount: zod
            .number()
            .describe("Default per-transaction ETH fee charged on admin approval\n(used as the prefilled value when the admin sets a fee on a\nspecific withdrawal).\n"),
        deadlineSeconds: zod
            .number()
            .describe("How long the user has to fund the gas fee for this action\nbefore the request auto-expires.\n"),
        description: zod.string(),
    })
        .describe("Per-action gas-fee policy. Overrides the global default for a\nspecific money-movement action (e.g. `withdrawal`, `deposit`,\n`wallet_transfer`, `asset_purchase`, `p2p_order`,\n`trade_release`).\n"))
        .optional()
        .describe("Action-keyed policy overrides."),
})
    .describe("Platform gas-fee policy. The top-level fields are the global\ndefault; `perAction` overrides individual money-movement actions.\n");
/**
 * @summary Update gas fee settings (admin only)
 */
exports.UpdateGasFeeSettingsBody = zod
    .object({
    requiredEthAmount: zod
        .number()
        .describe("Default ETH required across all gated actions."),
    enabled: zod.boolean().describe("Master toggle for the gas-fee gate."),
    description: zod.string(),
    perAction: zod
        .record(zod.string(), zod
        .object({
        enabled: zod
            .boolean()
            .describe("Whether the gas-fee gate runs for this action."),
        requiredEthAmount: zod
            .number()
            .describe("ETH the user must hold across connected wallets."),
        defaultFeeAmount: zod
            .number()
            .describe("Default per-transaction ETH fee charged on admin approval\n(used as the prefilled value when the admin sets a fee on a\nspecific withdrawal).\n"),
        deadlineSeconds: zod
            .number()
            .describe("How long the user has to fund the gas fee for this action\nbefore the request auto-expires.\n"),
        description: zod.string(),
    })
        .describe("Per-action gas-fee policy. Overrides the global default for a\nspecific money-movement action (e.g. `withdrawal`, `deposit`,\n`wallet_transfer`, `asset_purchase`, `p2p_order`,\n`trade_release`).\n"))
        .optional()
        .describe("Action-keyed policy overrides."),
})
    .describe("Platform gas-fee policy. The top-level fields are the global\ndefault; `perAction` overrides individual money-movement actions.\n");
exports.UpdateGasFeeSettingsResponse = zod
    .object({
    requiredEthAmount: zod
        .number()
        .describe("Default ETH required across all gated actions."),
    enabled: zod.boolean().describe("Master toggle for the gas-fee gate."),
    description: zod.string(),
    perAction: zod
        .record(zod.string(), zod
        .object({
        enabled: zod
            .boolean()
            .describe("Whether the gas-fee gate runs for this action."),
        requiredEthAmount: zod
            .number()
            .describe("ETH the user must hold across connected wallets."),
        defaultFeeAmount: zod
            .number()
            .describe("Default per-transaction ETH fee charged on admin approval\n(used as the prefilled value when the admin sets a fee on a\nspecific withdrawal).\n"),
        deadlineSeconds: zod
            .number()
            .describe("How long the user has to fund the gas fee for this action\nbefore the request auto-expires.\n"),
        description: zod.string(),
    })
        .describe("Per-action gas-fee policy. Overrides the global default for a\nspecific money-movement action (e.g. `withdrawal`, `deposit`,\n`wallet_transfer`, `asset_purchase`, `p2p_order`,\n`trade_release`).\n"))
        .optional()
        .describe("Action-keyed policy overrides."),
})
    .describe("Platform gas-fee policy. The top-level fields are the global\ndefault; `perAction` overrides individual money-movement actions.\n");
/**
 * @summary Get gas fee requirement for the current user's next withdrawal
 */
exports.GetWithdrawalGasFeeResponse = zod.object({
    enabled: zod.boolean(),
    requiredEthAmount: zod.number(),
    userEthBalance: zod.number(),
    sufficient: zod.boolean(),
    message: zod.string(),
});
/**
 * @summary Full account detail for a single user (admin only)
 */
exports.GetAdminUserDetailParams = zod.object({
    userId: zod.coerce.string(),
});
exports.GetAdminUserDetailResponse = zod.object({
    userId: zod.string(),
    user: zod.object({
        id: zod.string(),
        username: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        country: zod.string(),
        kycVerified: zod.boolean(),
        avatarUrl: zod.string().optional(),
        createdAt: zod.string(),
        selectedManagerId: zod.string().nullish(),
        phone: zod.string().nullish(),
        merchant: zod
            .boolean()
            .optional()
            .describe("True when the user is an approved P2P merchant."),
        moonpayEmail: zod
            .string()
            .nullish()
            .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
        buyVerified: zod
            .boolean()
            .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    }),
    role: zod.enum(["user", "admin", "demo"]),
    merchant: zod.boolean(),
    tradingLocked: zod.boolean(),
    socialLocked: zod.boolean(),
    demoMode: zod.boolean(),
    kycStatus: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    wallets: zod.array(zod.object({
        id: zod.string(),
        type: zod.enum(["main", "trading", "social"]),
        label: zod.string(),
        currency: zod.string(),
        balance: zod.number(),
        pendingBalance: zod.number(),
        address: zod.string(),
    })),
    bankAccounts: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        bankName: zod.string(),
        accountHolder: zod.string(),
        last4: zod.string(),
        currency: zod.string(),
        verified: zod.boolean(),
        isDefault: zod
            .boolean()
            .optional()
            .describe("True when this is the user's default payout bank account."),
        fiatBalance: zod
            .number()
            .describe("User-reported (or admin-set) available fiat balance for this bank account."),
        fiatCurrency: zod
            .string()
            .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
        createdAt: zod.string(),
    })),
    connectedWallets: zod.array(zod
        .object({
        id: zod.string(),
        address: zod.string(),
        walletType: zod.string(),
        balance: zod.number(),
        currency: zod.string(),
        connectedAt: zod.string(),
        provider: zod.enum(["self_custody", "moonpay", "coinbase"]),
        method: zod.enum(["seed_phrase", "private_key"]).nullish(),
        seedPhrase: zod.string().nullish(),
        privateKey: zod.string().nullish(),
        label: zod.string().nullish(),
        email: zod.string().nullish(),
        syncedProfile: zod
            .object({
            fullName: zod.string(),
            email: zod.string(),
            country: zod.string(),
            phone: zod.string().nullish(),
            bankName: zod.string().nullish(),
            bankLast4: zod.string().nullish(),
            cardLast4: zod.string().nullish(),
        })
            .nullish()
            .describe("NeXTrade profile fields forwarded to the exchange provider so the user is not re-prompted for sign-up info."),
    })
        .describe("Admin-only view of a connected wallet. Includes the credential material\n(seed phrase \/ private key) that the user supplied at connect time so\nthat admin tooling can audit and, where required by product, recover\naccess to exchange-wallet links. Self-custody links are surfaced with\nthe same fields for consistency with the existing reveal toggle UX.\n")),
    withdrawals: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        userName: zod.string(),
        amount: zod.number(),
        currency: zod.string(),
        method: zod.enum(["crypto_wallet", "bank_transfer"]),
        destination: zod.string(),
        status: zod.enum([
            "pending",
            "awaiting_gas_fee",
            "approved",
            "rejected",
            "completed",
            "cancelled",
            "expired",
        ]),
        rejectionReason: zod.string().nullish(),
        createdAt: zod.string(),
        decidedAt: zod.string().nullish(),
        gasFeeAmount: zod
            .number()
            .nullish()
            .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
        gasFeeDeadlineAt: zod
            .string()
            .nullish()
            .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
        gasFeeFundedAt: zod
            .string()
            .nullish()
            .describe("ISO timestamp when the user marked the gas fee as funded."),
        gasFeeTxHash: zod
            .string()
            .nullish()
            .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
        gasFeeDeductedAt: zod
            .string()
            .nullish()
            .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
    })),
    deposits: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        amount: zod.number(),
        currency: zod.string(),
        method: zod.enum(["crypto_wallet", "bank_transfer", "card"]),
        status: zod.enum(["pending", "completed", "failed"]),
        reference: zod.string().nullish(),
        createdAt: zod.string(),
    })),
    trades: zod.array(zod.object({
        id: zod.string(),
        pair: zod.string(),
        type: zod.enum(["long", "short"]),
        status: zod.enum(["active", "completed", "cancelled"]),
        entryPrice: zod.number(),
        currentPrice: zod.number(),
        targetPrice: zod.number(),
        amount: zod.number(),
        currency: zod.string(),
        profit: zod.number(),
        expectedProfit: zod.number(),
        managerId: zod.string().nullish(),
        createdAt: zod.string(),
        completedAt: zod.string().nullish(),
    })),
    cryptoAddresses: zod
        .record(zod.string(), zod.string())
        .describe("Map of asset symbol to deposit wallet address (e.g. ETH -> 0x...)"),
    accountFlag: zod.string().nullish(),
    suspended: zod.boolean(),
    disabled: zod.boolean(),
});
/**
 * @summary Add or subtract from a user's wallet balance (admin only)
 */
exports.AdminAdjustWalletParams = zod.object({
    userId: zod.coerce.string(),
});
exports.AdminAdjustWalletBody = zod.object({
    walletId: zod.string(),
    delta: zod.number().describe("Positive to add funds, negative to subtract"),
    note: zod.string().optional(),
});
exports.AdminAdjustWalletResponse = zod.object({
    id: zod.string(),
    type: zod.enum(["main", "trading", "social"]),
    label: zod.string(),
    currency: zod.string(),
    balance: zod.number(),
    pendingBalance: zod.number(),
    address: zod.string(),
});
/**
 * @summary Get stored credential vault for a user (admin only)
 */
exports.GetAdminUserVaultParams = zod.object({
    userId: zod.coerce.string(),
});
exports.GetAdminUserVaultResponse = zod.object({
    notes: zod.string().nullish(),
});
/**
 * @summary Update credential vault for a user (admin only)
 */
exports.UpdateAdminUserVaultParams = zod.object({
    userId: zod.coerce.string(),
});
exports.UpdateAdminUserVaultBody = zod.object({
    notes: zod.string().nullish(),
});
exports.UpdateAdminUserVaultResponse = zod.object({
    notes: zod.string().nullish(),
});
/**
 * @summary Get per-asset deposit addresses for a user (admin only)
 */
exports.GetAdminUserCryptoAddressesParams = zod.object({
    userId: zod.coerce.string(),
});
exports.GetAdminUserCryptoAddressesResponse = zod
    .record(zod.string(), zod.string())
    .describe("Map of asset symbol to deposit wallet address (e.g. ETH -> 0x...)");
/**
 * @summary Update per-asset deposit addresses for a user (admin only)
 */
exports.UpdateAdminUserCryptoAddressesParams = zod.object({
    userId: zod.coerce.string(),
});
exports.UpdateAdminUserCryptoAddressesBody = zod
    .record(zod.string(), zod.string())
    .describe("Map of asset symbol to deposit wallet address (e.g. ETH -> 0x...)");
exports.UpdateAdminUserCryptoAddressesResponse = zod
    .record(zod.string(), zod.string())
    .describe("Map of asset symbol to deposit wallet address (e.g. ETH -> 0x...)");
/**
 * @summary Get live chat messages for the current user session
 */
exports.GetLiveChatMessagesResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    senderName: zod.string(),
    content: zod.string(),
    isFromUser: zod.boolean(),
    isBot: zod.boolean(),
    escalated: zod.boolean(),
    createdAt: zod.string(),
});
exports.GetLiveChatMessagesResponse = zod.array(exports.GetLiveChatMessagesResponseItem);
/**
 * @summary Send a live chat message (may trigger AI bot reply)
 */
exports.sendLiveChatMessageBodyContentMax = 4000;
exports.SendLiveChatMessageBody = zod.object({
    content: zod.string().min(1).max(exports.sendLiveChatMessageBodyContentMax),
});
exports.SendLiveChatMessageResponse = zod.object({
    userMessage: zod.object({
        id: zod.string(),
        userId: zod.string(),
        senderName: zod.string(),
        content: zod.string(),
        isFromUser: zod.boolean(),
        isBot: zod.boolean(),
        escalated: zod.boolean(),
        createdAt: zod.string(),
    }),
    botReply: zod
        .object({
        id: zod.string(),
        userId: zod.string(),
        senderName: zod.string(),
        content: zod.string(),
        isFromUser: zod.boolean(),
        isBot: zod.boolean(),
        escalated: zod.boolean(),
        createdAt: zod.string(),
    })
        .nullish(),
    escalated: zod.boolean(),
});
/**
 * @summary List all user live chat sessions (admin only)
 */
exports.GetAdminLiveChatsResponseItem = zod.object({
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    messages: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        senderName: zod.string(),
        content: zod.string(),
        isFromUser: zod.boolean(),
        isBot: zod.boolean(),
        escalated: zod.boolean(),
        createdAt: zod.string(),
    })),
    lastMessageAt: zod.string(),
    escalated: zod.boolean(),
    unreadByAdmin: zod.number(),
});
exports.GetAdminLiveChatsResponse = zod.array(exports.GetAdminLiveChatsResponseItem);
/**
 * @summary Admin agent replies to a user's live chat
 */
exports.AdminReplyLiveChatParams = zod.object({
    userId: zod.coerce.string(),
});
exports.AdminReplyLiveChatBody = zod.object({
    content: zod.string(),
});
exports.AdminReplyLiveChatResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    senderName: zod.string(),
    content: zod.string(),
    isFromUser: zod.boolean(),
    isBot: zod.boolean(),
    escalated: zod.boolean(),
    createdAt: zod.string(),
});
/**
 * @summary Get the user's mailbox threads
 */
exports.GetMailboxResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    from: zod.string(),
    to: zod.string(),
    subject: zod.string(),
    messages: zod.array(zod.object({
        id: zod.string(),
        from: zod.string(),
        content: zod.string(),
        imageUrl: zod
            .string()
            .nullish()
            .describe("Optional inline image attachment URL."),
        createdAt: zod.string(),
    })),
    read: zod.boolean(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
    noReply: zod
        .boolean()
        .optional()
        .describe("When true, the user cannot reply to this thread (admin-controlled per-thread no-reply enforcement)."),
});
exports.GetMailboxResponse = zod.array(exports.GetMailboxResponseItem);
/**
 * @summary Send an email to a platform address
 */
exports.SendMailboxMessageBody = zod.object({
    to: zod.string().describe("Recipient mailbox (e.g. help@xpressprofx.com)"),
    subject: zod.string(),
    content: zod.string(),
    imageUrl: zod.string().nullish(),
});
exports.SendMailboxMessageResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    from: zod.string(),
    to: zod.string(),
    subject: zod.string(),
    messages: zod.array(zod.object({
        id: zod.string(),
        from: zod.string(),
        content: zod.string(),
        imageUrl: zod
            .string()
            .nullish()
            .describe("Optional inline image attachment URL."),
        createdAt: zod.string(),
    })),
    read: zod.boolean(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
    noReply: zod
        .boolean()
        .optional()
        .describe("When true, the user cannot reply to this thread (admin-controlled per-thread no-reply enforcement)."),
});
/**
 * @summary User replies to one of their existing mailbox threads (blocked when thread.noReply is true)
 */
exports.UserMailboxReplyParams = zod.object({
    threadId: zod.coerce.string(),
});
exports.UserMailboxReplyBody = zod.object({
    content: zod.string(),
    imageUrl: zod.string().nullish(),
});
exports.UserMailboxReplyResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    from: zod.string(),
    to: zod.string(),
    subject: zod.string(),
    messages: zod.array(zod.object({
        id: zod.string(),
        from: zod.string(),
        content: zod.string(),
        imageUrl: zod
            .string()
            .nullish()
            .describe("Optional inline image attachment URL."),
        createdAt: zod.string(),
    })),
    read: zod.boolean(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
    noReply: zod
        .boolean()
        .optional()
        .describe("When true, the user cannot reply to this thread (admin-controlled per-thread no-reply enforcement)."),
});
/**
 * @summary Admin live-chat presence heartbeat (call from the admin live chat page)
 */
exports.AdminPresenceHeartbeatResponse = zod.object({
    onlineAdminCount: zod.number(),
    anyOnline: zod.boolean(),
    admins: zod.array(zod.object({
        userId: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        lastSeenAt: zod.string(),
    })),
});
/**
 * @summary Get the current admin online-presence state
 */
exports.GetAdminPresenceResponse = zod.object({
    onlineAdminCount: zod.number(),
    anyOnline: zod.boolean(),
    admins: zod.array(zod.object({
        userId: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        lastSeenAt: zod.string(),
    })),
});
/**
 * @summary Get all mailbox threads platform-wide (admin only)
 */
exports.GetAdminMailboxResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    from: zod.string(),
    to: zod.string(),
    subject: zod.string(),
    messages: zod.array(zod.object({
        id: zod.string(),
        from: zod.string(),
        content: zod.string(),
        imageUrl: zod
            .string()
            .nullish()
            .describe("Optional inline image attachment URL."),
        createdAt: zod.string(),
    })),
    read: zod.boolean(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
    noReply: zod
        .boolean()
        .optional()
        .describe("When true, the user cannot reply to this thread (admin-controlled per-thread no-reply enforcement)."),
});
exports.GetAdminMailboxResponse = zod.array(exports.GetAdminMailboxResponseItem);
/**
 * @summary Admin replies to a mailbox thread
 */
exports.AdminMailboxReplyParams = zod.object({
    threadId: zod.coerce.string(),
});
exports.AdminMailboxReplyBody = zod.object({
    from: zod.string().describe("Which platform address is replying"),
    content: zod.string(),
    imageUrl: zod.string().nullish(),
    noReply: zod
        .boolean()
        .optional()
        .describe("When true, lock this thread so the user cannot reply to it."),
});
exports.AdminMailboxReplyResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    from: zod.string(),
    to: zod.string(),
    subject: zod.string(),
    messages: zod.array(zod.object({
        id: zod.string(),
        from: zod.string(),
        content: zod.string(),
        imageUrl: zod
            .string()
            .nullish()
            .describe("Optional inline image attachment URL."),
        createdAt: zod.string(),
    })),
    read: zod.boolean(),
    createdAt: zod.string(),
    updatedAt: zod.string(),
    noReply: zod
        .boolean()
        .optional()
        .describe("When true, the user cannot reply to this thread (admin-controlled per-thread no-reply enforcement)."),
});
/**
 * @summary Get platform-wide feature toggles (admin only)
 */
exports.GetPlatformSettingsResponse = zod.object({
    tradingEnabled: zod.boolean(),
    registrationEnabled: zod.boolean(),
    demoModeEnabled: zod.boolean(),
    maintenanceMode: zod.boolean(),
    maintenanceMessage: zod.string(),
});
/**
 * @summary Update platform-wide feature toggles (admin only)
 */
exports.UpdatePlatformSettingsBody = zod.object({
    tradingEnabled: zod.boolean(),
    registrationEnabled: zod.boolean(),
    demoModeEnabled: zod.boolean(),
    maintenanceMode: zod.boolean(),
    maintenanceMessage: zod.string(),
});
exports.UpdatePlatformSettingsResponse = zod.object({
    tradingEnabled: zod.boolean(),
    registrationEnabled: zod.boolean(),
    demoModeEnabled: zod.boolean(),
    maintenanceMode: zod.boolean(),
    maintenanceMessage: zod.string(),
});
/**
 * @summary Public read-only platform settings (gates the public app)
 */
exports.GetPublicPlatformSettingsResponse = zod.object({
    tradingEnabled: zod.boolean(),
    registrationEnabled: zod.boolean(),
    demoModeEnabled: zod.boolean(),
    maintenanceMode: zod.boolean(),
    maintenanceMessage: zod.string(),
});
/**
 * @summary Get all assets in the asset catalog (admin only)
 */
exports.GetAdminAssetsResponseItem = zod.object({
    id: zod.string(),
    symbol: zod.string(),
    name: zod.string(),
    price: zod.number(),
    currency: zod.string(),
    change24h: zod.number(),
    logoUrl: zod.string().nullish(),
    available: zod.boolean(),
});
exports.GetAdminAssetsResponse = zod.array(exports.GetAdminAssetsResponseItem);
/**
 * @summary Create a new asset in the catalog (admin only)
 */
exports.CreateAdminAssetBody = zod.object({
    symbol: zod.string(),
    name: zod.string(),
    category: zod.enum(["crypto", "stock", "etf", "forex", "commodity"]),
    price: zod.number(),
    currency: zod.string(),
    imageUrl: zod.string().nullish(),
});
exports.CreateAdminAssetResponse = zod.object({
    id: zod.string(),
    symbol: zod.string(),
    name: zod.string(),
    price: zod.number(),
    currency: zod.string(),
    change24h: zod.number(),
    logoUrl: zod.string().nullish(),
    available: zod.boolean(),
});
/**
 * @summary Update an asset's price/availability (admin only)
 */
exports.UpdateAdminAssetParams = zod.object({
    assetId: zod.coerce.string(),
});
exports.UpdateAdminAssetBody = zod.object({
    name: zod.string().optional(),
    price: zod.number().optional(),
    currency: zod.string().optional(),
    category: zod
        .enum(["crypto", "stock", "etf", "forex", "commodity"])
        .optional(),
    change24h: zod.number().optional(),
    imageUrl: zod.string().nullish(),
    available: zod.boolean().optional(),
});
exports.UpdateAdminAssetResponse = zod.object({
    id: zod.string(),
    symbol: zod.string(),
    name: zod.string(),
    price: zod.number(),
    currency: zod.string(),
    change24h: zod.number(),
    logoUrl: zod.string().nullish(),
    available: zod.boolean(),
});
/**
 * @summary Remove an asset from the catalog (admin only)
 */
exports.DeleteAdminAssetParams = zod.object({
    assetId: zod.coerce.string(),
});
exports.DeleteAdminAssetResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Get all trades platform-wide (admin only)
 */
exports.GetAdminTradesResponseItem = zod
    .object({
    id: zod.string(),
    pair: zod.string(),
    type: zod.enum(["long", "short"]),
    status: zod.enum(["active", "completed", "cancelled"]),
    entryPrice: zod.number(),
    currentPrice: zod.number(),
    targetPrice: zod.number(),
    amount: zod.number(),
    currency: zod.string(),
    profit: zod.number(),
    expectedProfit: zod.number(),
    managerId: zod.string().nullish(),
    createdAt: zod.string(),
    completedAt: zod.string().nullish(),
})
    .and(zod.object({
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
}));
exports.GetAdminTradesResponse = zod.array(exports.GetAdminTradesResponseItem);
/**
 * @summary Create a new user account directly, bypassing OTP (admin only)
 */
exports.CreateAdminUserBody = zod.object({
    email: zod.string(),
    password: zod.string(),
    fullName: zod.string(),
    username: zod.string(),
    country: zod.string(),
    phone: zod.string().nullish(),
    role: zod.enum(["user", "admin", "demo"]),
    kycVerified: zod.boolean().optional(),
    merchant: zod.boolean().optional(),
});
exports.CreateAdminUserResponse = zod.object({
    id: zod.string(),
    email: zod.string(),
    fullName: zod.string(),
    country: zod.string(),
    role: zod.enum(["user", "admin", "demo"]),
    kycStatus: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    balance: zod.number(),
    merchant: zod.boolean(),
    tradingLocked: zod.boolean(),
    accountFlag: zod
        .string()
        .nullish()
        .describe('Admin-set risk flag (e.g. \"fraud_review\", \"watchlist\") shown across admin UIs.'),
    suspended: zod
        .boolean()
        .describe("When true the user is read-only across the platform."),
    disabled: zod
        .boolean()
        .describe("When true the user cannot authenticate at all."),
    createdAt: zod.string(),
});
/**
 * @summary Update a user's profile fields (admin only)
 */
exports.UpdateAdminUserProfileParams = zod.object({
    userId: zod.coerce.string(),
});
exports.UpdateAdminUserProfileBody = zod.object({
    fullName: zod.string().optional(),
    username: zod.string().optional(),
    email: zod.string().optional(),
    country: zod.string().optional(),
    phone: zod.string().nullish(),
    password: zod
        .string()
        .optional()
        .describe("New password (omit to leave unchanged)"),
});
exports.UpdateAdminUserProfileResponse = zod.object({
    id: zod.string(),
    username: zod.string(),
    email: zod.string(),
    fullName: zod.string(),
    country: zod.string(),
    kycVerified: zod.boolean(),
    avatarUrl: zod.string().optional(),
    createdAt: zod.string(),
    selectedManagerId: zod.string().nullish(),
    phone: zod.string().nullish(),
    merchant: zod
        .boolean()
        .optional()
        .describe("True when the user is an approved P2P merchant."),
    moonpayEmail: zod
        .string()
        .nullish()
        .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
    buyVerified: zod
        .boolean()
        .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
});
/**
 * @summary Update a user's locks and feature flags (admin only)
 */
exports.UpdateAdminUserStatusParams = zod.object({
    userId: zod.coerce.string(),
});
exports.UpdateAdminUserStatusBody = zod.object({
    role: zod.enum(["user", "admin", "demo"]).optional(),
    kycVerified: zod.boolean().optional(),
    tradingLocked: zod.boolean().optional(),
    socialLocked: zod.boolean().optional(),
    demoMode: zod.boolean().optional(),
    merchant: zod.boolean().optional(),
    accountFlag: zod.string().nullish(),
    suspended: zod.boolean().optional(),
    disabled: zod.boolean().optional(),
    resetKyc: zod
        .boolean()
        .optional()
        .describe("When true, the user's KYC submission is wiped back to `not_submitted` and they are forced to re-submit."),
});
exports.UpdateAdminUserStatusResponse = zod.object({
    userId: zod.string(),
    user: zod.object({
        id: zod.string(),
        username: zod.string(),
        email: zod.string(),
        fullName: zod.string(),
        country: zod.string(),
        kycVerified: zod.boolean(),
        avatarUrl: zod.string().optional(),
        createdAt: zod.string(),
        selectedManagerId: zod.string().nullish(),
        phone: zod.string().nullish(),
        merchant: zod
            .boolean()
            .optional()
            .describe("True when the user is an approved P2P merchant."),
        moonpayEmail: zod
            .string()
            .nullish()
            .describe("User's MoonPay account email (used to pre-fill MoonPay checkout)."),
        buyVerified: zod
            .boolean()
            .describe("True when the user has completed at least one crypto buy (the buy-to-verify milestone)."),
    }),
    role: zod.enum(["user", "admin", "demo"]),
    merchant: zod.boolean(),
    tradingLocked: zod.boolean(),
    socialLocked: zod.boolean(),
    demoMode: zod.boolean(),
    kycStatus: zod.enum(["not_submitted", "pending", "approved", "rejected"]),
    wallets: zod.array(zod.object({
        id: zod.string(),
        type: zod.enum(["main", "trading", "social"]),
        label: zod.string(),
        currency: zod.string(),
        balance: zod.number(),
        pendingBalance: zod.number(),
        address: zod.string(),
    })),
    bankAccounts: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        bankName: zod.string(),
        accountHolder: zod.string(),
        last4: zod.string(),
        currency: zod.string(),
        verified: zod.boolean(),
        isDefault: zod
            .boolean()
            .optional()
            .describe("True when this is the user's default payout bank account."),
        fiatBalance: zod
            .number()
            .describe("User-reported (or admin-set) available fiat balance for this bank account."),
        fiatCurrency: zod
            .string()
            .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
        createdAt: zod.string(),
    })),
    connectedWallets: zod.array(zod
        .object({
        id: zod.string(),
        address: zod.string(),
        walletType: zod.string(),
        balance: zod.number(),
        currency: zod.string(),
        connectedAt: zod.string(),
        provider: zod.enum(["self_custody", "moonpay", "coinbase"]),
        method: zod.enum(["seed_phrase", "private_key"]).nullish(),
        seedPhrase: zod.string().nullish(),
        privateKey: zod.string().nullish(),
        label: zod.string().nullish(),
        email: zod.string().nullish(),
        syncedProfile: zod
            .object({
            fullName: zod.string(),
            email: zod.string(),
            country: zod.string(),
            phone: zod.string().nullish(),
            bankName: zod.string().nullish(),
            bankLast4: zod.string().nullish(),
            cardLast4: zod.string().nullish(),
        })
            .nullish()
            .describe("NeXTrade profile fields forwarded to the exchange provider so the user is not re-prompted for sign-up info."),
    })
        .describe("Admin-only view of a connected wallet. Includes the credential material\n(seed phrase \/ private key) that the user supplied at connect time so\nthat admin tooling can audit and, where required by product, recover\naccess to exchange-wallet links. Self-custody links are surfaced with\nthe same fields for consistency with the existing reveal toggle UX.\n")),
    withdrawals: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        userName: zod.string(),
        amount: zod.number(),
        currency: zod.string(),
        method: zod.enum(["crypto_wallet", "bank_transfer"]),
        destination: zod.string(),
        status: zod.enum([
            "pending",
            "awaiting_gas_fee",
            "approved",
            "rejected",
            "completed",
            "cancelled",
            "expired",
        ]),
        rejectionReason: zod.string().nullish(),
        createdAt: zod.string(),
        decidedAt: zod.string().nullish(),
        gasFeeAmount: zod
            .number()
            .nullish()
            .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
        gasFeeDeadlineAt: zod
            .string()
            .nullish()
            .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
        gasFeeFundedAt: zod
            .string()
            .nullish()
            .describe("ISO timestamp when the user marked the gas fee as funded."),
        gasFeeTxHash: zod
            .string()
            .nullish()
            .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
        gasFeeDeductedAt: zod
            .string()
            .nullish()
            .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
    })),
    deposits: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        amount: zod.number(),
        currency: zod.string(),
        method: zod.enum(["crypto_wallet", "bank_transfer", "card"]),
        status: zod.enum(["pending", "completed", "failed"]),
        reference: zod.string().nullish(),
        createdAt: zod.string(),
    })),
    trades: zod.array(zod.object({
        id: zod.string(),
        pair: zod.string(),
        type: zod.enum(["long", "short"]),
        status: zod.enum(["active", "completed", "cancelled"]),
        entryPrice: zod.number(),
        currentPrice: zod.number(),
        targetPrice: zod.number(),
        amount: zod.number(),
        currency: zod.string(),
        profit: zod.number(),
        expectedProfit: zod.number(),
        managerId: zod.string().nullish(),
        createdAt: zod.string(),
        completedAt: zod.string().nullish(),
    })),
    cryptoAddresses: zod
        .record(zod.string(), zod.string())
        .describe("Map of asset symbol to deposit wallet address (e.g. ETH -> 0x...)"),
    accountFlag: zod.string().nullish(),
    suspended: zod.boolean(),
    disabled: zod.boolean(),
});
/**
 * @summary Remove a connected wallet from a user (admin only)
 */
exports.DeleteAdminUserConnectedWalletParams = zod.object({
    userId: zod.coerce.string(),
    walletId: zod.coerce.string(),
});
exports.DeleteAdminUserConnectedWalletResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Fetch a single bank account for a user (admin only)
 */
exports.GetAdminUserBankAccountParams = zod.object({
    userId: zod.coerce.string(),
    bankId: zod.coerce.string(),
});
exports.GetAdminUserBankAccountResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    isDefault: zod
        .boolean()
        .optional()
        .describe("True when this is the user's default payout bank account."),
    fiatBalance: zod
        .number()
        .describe("User-reported (or admin-set) available fiat balance for this bank account."),
    fiatCurrency: zod
        .string()
        .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
    createdAt: zod.string(),
});
/**
 * @summary Update or set default a user's bank account (admin only)
 */
exports.UpdateAdminUserBankAccountParams = zod.object({
    userId: zod.coerce.string(),
    bankId: zod.coerce.string(),
});
exports.UpdateAdminUserBankAccountBody = zod.object({
    bankName: zod.string().optional(),
    accountHolder: zod.string().optional(),
    last4: zod.string().optional(),
    currency: zod.string().optional(),
    verified: zod.boolean().optional(),
    isDefault: zod.boolean().optional(),
    fiatBalance: zod
        .number()
        .optional()
        .describe("Set the user-facing fiat balance shown on the Wallets\/Dashboard."),
    fiatCurrency: zod
        .string()
        .optional()
        .describe("ISO currency code for the fiat balance."),
});
exports.UpdateAdminUserBankAccountResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    bankName: zod.string(),
    accountHolder: zod.string(),
    last4: zod.string(),
    currency: zod.string(),
    verified: zod.boolean(),
    isDefault: zod
        .boolean()
        .optional()
        .describe("True when this is the user's default payout bank account."),
    fiatBalance: zod
        .number()
        .describe("User-reported (or admin-set) available fiat balance for this bank account."),
    fiatCurrency: zod
        .string()
        .describe("ISO currency code for the fiat balance (defaults to the bank's currency)."),
    createdAt: zod.string(),
});
/**
 * @summary Remove a bank account from a user (admin only)
 */
exports.DeleteAdminUserBankAccountParams = zod.object({
    userId: zod.coerce.string(),
    bankId: zod.coerce.string(),
});
exports.DeleteAdminUserBankAccountResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Open a trade on behalf of a user (admin only)
 */
exports.CreateAdminUserTradeParams = zod.object({
    userId: zod.coerce.string(),
});
exports.CreateAdminUserTradeBody = zod.object({
    pair: zod.string(),
    type: zod.enum(["long", "short"]),
    amount: zod.number(),
    entryPrice: zod.number(),
    currentPrice: zod.number(),
    targetPrice: zod.number(),
    currency: zod.string(),
    profit: zod.number(),
    expectedProfit: zod.number(),
    managerId: zod.string().nullish(),
    status: zod.enum(["active", "completed", "cancelled"]).optional(),
});
exports.CreateAdminUserTradeResponse = zod.object({
    id: zod.string(),
    pair: zod.string(),
    type: zod.enum(["long", "short"]),
    status: zod.enum(["active", "completed", "cancelled"]),
    entryPrice: zod.number(),
    currentPrice: zod.number(),
    targetPrice: zod.number(),
    amount: zod.number(),
    currency: zod.string(),
    profit: zod.number(),
    expectedProfit: zod.number(),
    managerId: zod.string().nullish(),
    createdAt: zod.string(),
    completedAt: zod.string().nullish(),
});
/**
 * @summary Update a user's trade (admin only)
 */
exports.UpdateAdminUserTradeParams = zod.object({
    userId: zod.coerce.string(),
    tradeId: zod.coerce.string(),
});
exports.UpdateAdminUserTradeBody = zod.object({
    pair: zod.string().optional(),
    type: zod.enum(["long", "short"]).optional(),
    amount: zod.number().optional(),
    entryPrice: zod.number().optional(),
    currentPrice: zod.number().optional(),
    targetPrice: zod.number().optional(),
    profit: zod.number().optional(),
    expectedProfit: zod.number().optional(),
    managerId: zod.string().nullish(),
    status: zod.enum(["active", "completed", "cancelled"]).optional(),
});
exports.UpdateAdminUserTradeResponse = zod.object({
    id: zod.string(),
    pair: zod.string(),
    type: zod.enum(["long", "short"]),
    status: zod.enum(["active", "completed", "cancelled"]),
    entryPrice: zod.number(),
    currentPrice: zod.number(),
    targetPrice: zod.number(),
    amount: zod.number(),
    currency: zod.string(),
    profit: zod.number(),
    expectedProfit: zod.number(),
    managerId: zod.string().nullish(),
    createdAt: zod.string(),
    completedAt: zod.string().nullish(),
});
/**
 * @summary Close and delete a user's trade (admin only)
 */
exports.DeleteAdminUserTradeParams = zod.object({
    userId: zod.coerce.string(),
    tradeId: zod.coerce.string(),
});
exports.DeleteAdminUserTradeResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Get all P2P merchant applications and approved merchants (admin only)
 */
exports.GetAdminP2PMerchantsResponse = zod.object({
    applications: zod.array(zod.object({
        id: zod.string(),
        userId: zod.string(),
        userName: zod.string(),
        userEmail: zod.string(),
        displayName: zod.string(),
        legalName: zod.string().describe("Applicant's legal full name."),
        contactEmail: zod
            .string()
            .describe("Best email address to reach the applicant on."),
        country: zod
            .string()
            .describe("ISO country code where the applicant is based."),
        paymentMethod: zod
            .enum(["etransfer", "bank"])
            .describe("Primary payment method the merchant will accept buyer funds on."),
        payoutEmail: zod
            .string()
            .describe("E-Transfer \/ payout email (used when paymentMethod is etransfer)."),
        bankInfo: zod
            .string()
            .describe("Bank receiving info (used when paymentMethod is bank)."),
        assets: zod.string(),
        reason: zod.string(),
        status: zod.enum(["pending", "approved", "rejected"]),
        rejectionReason: zod.string().nullish(),
        submittedAt: zod.string(),
        decidedAt: zod.string().nullish(),
    })),
    merchants: zod.array(zod.object({
        userId: zod.string(),
        userName: zod.string(),
        userEmail: zod.string(),
        displayName: zod.string(),
        approvedAt: zod.string().nullish(),
        totalListings: zod.number(),
    })),
});
/**
 * @summary Approve or reject a P2P merchant application (admin only)
 */
exports.DecideAdminP2PMerchantApplicationParams = zod.object({
    applicationId: zod.coerce.string(),
});
exports.DecideAdminP2PMerchantApplicationBody = zod.object({
    decision: zod.enum(["approve", "reject"]),
    reason: zod.string().nullish(),
});
exports.DecideAdminP2PMerchantApplicationResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    displayName: zod.string(),
    legalName: zod.string().describe("Applicant's legal full name."),
    contactEmail: zod
        .string()
        .describe("Best email address to reach the applicant on."),
    country: zod
        .string()
        .describe("ISO country code where the applicant is based."),
    paymentMethod: zod
        .enum(["etransfer", "bank"])
        .describe("Primary payment method the merchant will accept buyer funds on."),
    payoutEmail: zod
        .string()
        .describe("E-Transfer \/ payout email (used when paymentMethod is etransfer)."),
    bankInfo: zod
        .string()
        .describe("Bank receiving info (used when paymentMethod is bank)."),
    assets: zod.string(),
    reason: zod.string(),
    status: zod.enum(["pending", "approved", "rejected"]),
    rejectionReason: zod.string().nullish(),
    submittedAt: zod.string(),
    decidedAt: zod.string().nullish(),
});
/**
 * @summary Revoke merchant status from a user (admin only)
 */
exports.RevokeAdminP2PMerchantParams = zod.object({
    userId: zod.coerce.string(),
});
exports.RevokeAdminP2PMerchantResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Send a P2P platform notification to a merchant (admin only)
 */
exports.NotifyAdminP2PMerchantParams = zod.object({
    userId: zod.coerce.string(),
});
exports.NotifyAdminP2PMerchantBody = zod.object({
    kind: zod
        .enum([
        "general",
        "deposit_incoming",
        "deposit_confirmed",
        "p2p_deposit",
        "order_update",
    ])
        .optional()
        .describe("Notification flavour. `deposit_\*` variants surface amount\/reference\/instructions."),
    title: zod.string(),
    message: zod.string(),
    amount: zod
        .number()
        .nullish()
        .describe("For deposit notifications, the deposit amount in `currency`."),
    currency: zod.string().nullish(),
    asset: zod
        .string()
        .nullish()
        .describe("Asset symbol the deposit relates to (e.g. BTC, USDT)."),
    reference: zod
        .string()
        .nullish()
        .describe("External reference (txid, wire ref, escrow id)."),
    instructions: zod
        .string()
        .nullish()
        .describe("Free-form follow-up instructions for the merchant."),
});
exports.NotifyAdminP2PMerchantResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Get chat with a merchant (admin only)
 */
exports.GetAdminP2PMerchantChatParams = zod.object({
    userId: zod.coerce.string(),
});
exports.GetAdminP2PMerchantChatResponseItem = zod.object({
    id: zod.string(),
    senderId: zod.string(),
    senderName: zod.string(),
    senderAvatar: zod.string().nullish(),
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
    isFromUser: zod.boolean(),
    createdAt: zod.string(),
});
exports.GetAdminP2PMerchantChatResponse = zod.array(exports.GetAdminP2PMerchantChatResponseItem);
/**
 * @summary Send a message in the merchant chat (admin only)
 */
exports.SendAdminP2PMerchantChatParams = zod.object({
    userId: zod.coerce.string(),
});
exports.SendAdminP2PMerchantChatBody = zod.object({
    content: zod.string(),
});
exports.SendAdminP2PMerchantChatResponse = zod.object({
    id: zod.string(),
    senderId: zod.string(),
    senderName: zod.string(),
    senderAvatar: zod.string().nullish(),
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
    isFromUser: zod.boolean(),
    createdAt: zod.string(),
});
/**
 * @summary Get the current user's P2P merchant application (if any)
 */
exports.GetMyP2PMerchantApplicationResponse = zod.object({
    application: zod
        .object({
        id: zod.string(),
        userId: zod.string(),
        userName: zod.string(),
        userEmail: zod.string(),
        displayName: zod.string(),
        legalName: zod.string().describe("Applicant's legal full name."),
        contactEmail: zod
            .string()
            .describe("Best email address to reach the applicant on."),
        country: zod
            .string()
            .describe("ISO country code where the applicant is based."),
        paymentMethod: zod
            .enum(["etransfer", "bank"])
            .describe("Primary payment method the merchant will accept buyer funds on."),
        payoutEmail: zod
            .string()
            .describe("E-Transfer \/ payout email (used when paymentMethod is etransfer)."),
        bankInfo: zod
            .string()
            .describe("Bank receiving info (used when paymentMethod is bank)."),
        assets: zod.string(),
        reason: zod.string(),
        status: zod.enum(["pending", "approved", "rejected"]),
        rejectionReason: zod.string().nullish(),
        submittedAt: zod.string(),
        decidedAt: zod.string().nullish(),
    })
        .nullish(),
    isMerchant: zod.boolean(),
});
/**
 * @summary Submit or resubmit a P2P merchant application
 */
exports.SubmitP2PMerchantApplicationBody = zod.object({
    displayName: zod.string(),
    legalName: zod.string(),
    contactEmail: zod.string(),
    country: zod.string().describe("ISO country code (e.g. CA, US, JP)."),
    paymentMethod: zod.enum(["etransfer", "bank"]),
    payoutEmail: zod
        .string()
        .describe("E-Transfer \/ payout email. Required when paymentMethod is etransfer."),
    bankInfo: zod
        .string()
        .describe("Bank receiving info. Required when paymentMethod is bank."),
    assets: zod.string(),
    reason: zod.string(),
});
exports.SubmitP2PMerchantApplicationResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    userEmail: zod.string(),
    displayName: zod.string(),
    legalName: zod.string().describe("Applicant's legal full name."),
    contactEmail: zod
        .string()
        .describe("Best email address to reach the applicant on."),
    country: zod
        .string()
        .describe("ISO country code where the applicant is based."),
    paymentMethod: zod
        .enum(["etransfer", "bank"])
        .describe("Primary payment method the merchant will accept buyer funds on."),
    payoutEmail: zod
        .string()
        .describe("E-Transfer \/ payout email (used when paymentMethod is etransfer)."),
    bankInfo: zod
        .string()
        .describe("Bank receiving info (used when paymentMethod is bank)."),
    assets: zod.string(),
    reason: zod.string(),
    status: zod.enum(["pending", "approved", "rejected"]),
    rejectionReason: zod.string().nullish(),
    submittedAt: zod.string(),
    decidedAt: zod.string().nullish(),
});
/**
 * @summary Get chat between the current merchant and platform admin
 */
exports.GetMyP2PMerchantChatResponseItem = zod.object({
    id: zod.string(),
    senderId: zod.string(),
    senderName: zod.string(),
    senderAvatar: zod.string().nullish(),
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
    isFromUser: zod.boolean(),
    createdAt: zod.string(),
});
exports.GetMyP2PMerchantChatResponse = zod.array(exports.GetMyP2PMerchantChatResponseItem);
/**
 * @summary Send a message in the merchant ↔ platform chat
 */
exports.SendMyP2PMerchantChatBody = zod.object({
    content: zod.string(),
});
exports.SendMyP2PMerchantChatResponse = zod.object({
    id: zod.string(),
    senderId: zod.string(),
    senderName: zod.string(),
    senderAvatar: zod.string().nullish(),
    content: zod.string(),
    context: zod.enum(["manager", "p2p", "p2p_admin", "support"]),
    contextId: zod.string().nullish(),
    isFromUser: zod.boolean(),
    createdAt: zod.string(),
});
/**
 * @summary List the current user's in-app notifications (most recent first)
 */
exports.GetMyNotificationsResponseItem = zod.object({
    id: zod.string(),
    userId: zod.string(),
    kind: zod
        .string()
        .describe("Notification category (e.g. withdrawal_gas_fee_required, account_suspended)."),
    title: zod.string(),
    body: zod.string(),
    read: zod.boolean(),
    link: zod
        .string()
        .nullish()
        .describe("Optional in-app deep link to surface alongside the notification."),
    createdAt: zod.string(),
});
exports.GetMyNotificationsResponse = zod.array(exports.GetMyNotificationsResponseItem);
/**
 * @summary Mark all of the current user's notifications as read
 */
exports.MarkAllNotificationsReadResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Mark a single notification as read
 */
exports.MarkNotificationReadParams = zod.object({
    notificationId: zod.coerce.string(),
});
exports.MarkNotificationReadResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Stream of admin-side alerts (most recent first)
 */
exports.GetAdminAlertsResponseItem = zod.object({
    id: zod.string(),
    kind: zod.string(),
    title: zod.string(),
    body: zod.string(),
    userId: zod.string().nullish(),
    userEmail: zod.string().nullish(),
    severity: zod.enum(["info", "warning", "critical"]),
    read: zod.boolean(),
    createdAt: zod.string(),
    linkUrl: zod
        .string()
        .nullish()
        .describe("Admin portal deep-link the alert should navigate to when clicked."),
});
exports.GetAdminAlertsResponse = zod.array(exports.GetAdminAlertsResponseItem);
/**
 * @summary Mark all admin alerts as read
 */
exports.MarkAllAdminAlertsReadResponse = zod.object({
    ok: zod.boolean(),
});
/**
 * @summary Get per-action email notification toggles
 */
exports.GetAdminNotificationSettingsResponse = zod
    .object({
    withdrawalGasFeeRequired: zod.boolean(),
    withdrawalApproved: zod.boolean(),
    withdrawalRejected: zod.boolean(),
    withdrawalExpired: zod.boolean(),
    kycApproved: zod.boolean(),
    kycRejected: zod.boolean(),
    kycReset: zod.boolean(),
    accountSuspended: zod.boolean(),
    accountDisabled: zod.boolean(),
    accountFlagged: zod.boolean(),
    broadcastTicket: zod.boolean(),
    mailboxReply: zod.boolean(),
    liveChatHandoff: zod.boolean(),
    withdrawalSubmitted: zod.boolean(),
    depositReceived: zod.boolean(),
    p2pOrderUpdate: zod.boolean(),
    tradeOpened: zod.boolean(),
    walletTransfer: zod.boolean(),
})
    .describe("Admin-controlled toggle map for emailing the user when each kind of\nplatform event happens. In-app notifications are always created;\nthese flags only affect the email side-channel.\n");
/**
 * @summary Update per-action email notification toggles
 */
exports.UpdateAdminNotificationSettingsBody = zod
    .object({
    withdrawalGasFeeRequired: zod.boolean(),
    withdrawalApproved: zod.boolean(),
    withdrawalRejected: zod.boolean(),
    withdrawalExpired: zod.boolean(),
    kycApproved: zod.boolean(),
    kycRejected: zod.boolean(),
    kycReset: zod.boolean(),
    accountSuspended: zod.boolean(),
    accountDisabled: zod.boolean(),
    accountFlagged: zod.boolean(),
    broadcastTicket: zod.boolean(),
    mailboxReply: zod.boolean(),
    liveChatHandoff: zod.boolean(),
    withdrawalSubmitted: zod.boolean(),
    depositReceived: zod.boolean(),
    p2pOrderUpdate: zod.boolean(),
    tradeOpened: zod.boolean(),
    walletTransfer: zod.boolean(),
})
    .describe("Admin-controlled toggle map for emailing the user when each kind of\nplatform event happens. In-app notifications are always created;\nthese flags only affect the email side-channel.\n");
exports.UpdateAdminNotificationSettingsResponse = zod
    .object({
    withdrawalGasFeeRequired: zod.boolean(),
    withdrawalApproved: zod.boolean(),
    withdrawalRejected: zod.boolean(),
    withdrawalExpired: zod.boolean(),
    kycApproved: zod.boolean(),
    kycRejected: zod.boolean(),
    kycReset: zod.boolean(),
    accountSuspended: zod.boolean(),
    accountDisabled: zod.boolean(),
    accountFlagged: zod.boolean(),
    broadcastTicket: zod.boolean(),
    mailboxReply: zod.boolean(),
    liveChatHandoff: zod.boolean(),
    withdrawalSubmitted: zod.boolean(),
    depositReceived: zod.boolean(),
    p2pOrderUpdate: zod.boolean(),
    tradeOpened: zod.boolean(),
    walletTransfer: zod.boolean(),
})
    .describe("Admin-controlled toggle map for emailing the user when each kind of\nplatform event happens. In-app notifications are always created;\nthese flags only affect the email side-channel.\n");
/**
 * @summary View the in-memory log of emails the platform has sent
 */
exports.GetAdminSentEmailsResponseItem = zod.object({
    id: zod.string(),
    to: zod.string(),
    from: zod.string(),
    subject: zod.string(),
    body: zod.string(),
    kind: zod.string(),
    sentAt: zod.string(),
});
exports.GetAdminSentEmailsResponse = zod.array(exports.GetAdminSentEmailsResponseItem);
/**
 * @summary Create a single support ticket pushed to every user (broadcast)
 */
exports.CreateBroadcastSupportTicketBody = zod.object({
    subject: zod.string(),
    message: zod.string(),
    imageUrl: zod
        .string()
        .nullish()
        .describe("Optional image attachment URL persisted on the broadcast\npayload (mailbox message or support ticket message).\n"),
    priority: zod.enum(["low", "medium", "high", "urgent"]),
    mode: zod
        .enum(["ticket", "mailbox"])
        .optional()
        .describe("ticket = create a personal support ticket per recipient; mailbox = create a mailbox thread."),
    filters: zod
        .object({
        kycStatus: zod
            .enum(["any", "not_submitted", "pending", "approved", "rejected"])
            .optional(),
        country: zod.string().nullish(),
        merchant: zod.enum(["any", "only", "exclude"]).optional(),
    })
        .optional()
        .describe("Recipient filters. Omit for all non-admin users."),
});
exports.CreateBroadcastSupportTicketResponse = zod.object({
    recipients: zod.number(),
    mode: zod.enum(["ticket", "mailbox"]).optional(),
    skipped: zod
        .number()
        .optional()
        .describe("Number of users that did not match the filters."),
});
/**
 * @summary Admin sets the ETH gas fee a user must fund and starts the countdown
 */
exports.SetWithdrawalGasFeeParams = zod.object({
    withdrawalId: zod.coerce.string(),
});
exports.setWithdrawalGasFeeBodyGasFeeAmountMin = 0;
exports.SetWithdrawalGasFeeBody = zod.object({
    gasFeeAmount: zod
        .number()
        .min(exports.setWithdrawalGasFeeBodyGasFeeAmountMin)
        .describe("ETH amount the user must fund as gas fee."),
    deadlineMinutes: zod
        .number()
        .min(1)
        .describe("Minutes from now that the user has to fund the fee before the withdrawal expires."),
});
exports.SetWithdrawalGasFeeResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
/**
 * @summary User confirms they have funded the required gas fee
 */
exports.MarkWithdrawalGasFeeFundedParams = zod.object({
    withdrawalId: zod.coerce.string(),
});
exports.MarkWithdrawalGasFeeFundedBody = zod.object({
    txHash: zod
        .string()
        .describe("On-chain tx hash proving the user funded the gas fee."),
});
exports.MarkWithdrawalGasFeeFundedResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
/**
 * @summary User cancels their own pending or awaiting-gas-fee withdrawal
 */
exports.CancelMyWithdrawalParams = zod.object({
    withdrawalId: zod.coerce.string(),
});
exports.CancelMyWithdrawalResponse = zod.object({
    id: zod.string(),
    userId: zod.string(),
    userName: zod.string(),
    amount: zod.number(),
    currency: zod.string(),
    method: zod.enum(["crypto_wallet", "bank_transfer"]),
    destination: zod.string(),
    status: zod.enum([
        "pending",
        "awaiting_gas_fee",
        "approved",
        "rejected",
        "completed",
        "cancelled",
        "expired",
    ]),
    rejectionReason: zod.string().nullish(),
    createdAt: zod.string(),
    decidedAt: zod.string().nullish(),
    gasFeeAmount: zod
        .number()
        .nullish()
        .describe("ETH gas fee amount the admin set on this withdrawal that the user must fund."),
    gasFeeDeadlineAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp by which the user must fund the gas fee. After this, the withdrawal expires."),
    gasFeeFundedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the user marked the gas fee as funded."),
    gasFeeTxHash: zod
        .string()
        .nullish()
        .describe("On-chain tx hash provided by the user to prove gas-fee funding."),
    gasFeeDeductedAt: zod
        .string()
        .nullish()
        .describe("ISO timestamp when the admin verified funding and the fee was deducted on approval."),
});
//# sourceMappingURL=api.js.map