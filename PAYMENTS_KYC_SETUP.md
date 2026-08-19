# Payments and KYC provider setup

Payment methods are unavailable until live credentials are present. Wallets are credited only after a verified processor webhook.

## Apple Pay / Google Pay

Apple Pay: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APPLE_PAY_MERCHANT_ID`, `APPLE_PAY_DISPLAY_NAME`, `APPLE_PAY_MERCHANT_VALIDATION_URL`, `APPLE_PAY_CERTIFICATE_PATH`, `APPLE_PAY_PRIVATE_KEY_PATH`.

Google Pay: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_PAY_MERCHANT_ID`. Tokenize the Google Pay result with the processor and send its `paymentMethodId` or token to `/api/payments/google-pay/intent`.

Run `prisma migrate deploy` after adding the `PaymentIntent` model. Register `/api/webhooks/stripe` for `payment_intent.succeeded` and `charge.succeeded`.

## KYC

Set `KYC_PROVIDER` and provider credentials before enabling live verification: `ONFIDO_API_KEY`, `SOCURE_API_KEY`, `STRIPE_IDENTITY_API_KEY`, `IDOLOGY_API_KEY`, or `TRULIOO_API_KEY` plus matching `*_API_URL` values where required. Missing credentials produce `provider_not_configured`; no verification is approved automatically.