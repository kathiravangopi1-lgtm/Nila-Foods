# Ecommerce API

Express and MongoDB/Mongoose API for the ecommerce app.

## Run locally

From this directory:

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env`, then set `MONGO_URI` and a unique `JWT_SECRET` of at least 32 characters. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` to enable email verification and password reset. Set the backend-only `CLOUDINARY_URL` to enable product image uploads. `OTP_HASH_SECRET` is optional; it defaults to `JWT_SECRET`. Set `CORS_ORIGIN` to a comma-separated list of trusted frontend origins. If unset, only the Nila Foods Render frontend and local Vite development origins are allowed.

## Authentication

- `POST /api/auth/register` — accepts name, email, password, optional phone, and optional `emailOffersOptIn` consent; passwords must be 8-72 characters/UTF-8 bytes. New accounts always get the `customer` role and must verify their email before password sign-in.
- `POST /api/auth/verify-email` and `POST /api/auth/resend-email-otp` — verify a new account or send another code. Codes expire after 10 minutes, allow at most 5 attempts, and can be resent once per 60 seconds.
- `POST /api/auth/forgot-password` — starts the generic-response password reset flow.
- `POST /api/auth/verify-reset-otp` — verifies the reset code and returns a short-lived single-use reset authorization.
- `POST /api/auth/reset-password` — consumes the reset authorization and sets a new password.
- `POST /api/auth/login` — accepts an email address or phone number and password; returns a JWT and a safe user object. Phone sign-in accepts common punctuation/spacing and Indian numbers with or without the `+91` country code. Access tokens last 7 days by default; configure `JWT_EXPIRES_IN` to change this. Users must sign in again after a token expires.
- `POST /api/auth/google` — accepts the Google Identity Services ID token credential, verifies it against `GOOGLE_CLIENT_ID`, and returns the same app JWT and safe user object. Google sign-in links an existing account only when Google has verified the same email.
- `GET /api/auth/me` — returns current account details.
- `PATCH /api/auth/me` — authenticated; updates profile fields, email-offer consent, or up to 100 active product IDs in `restockProductIds`. Email addresses are normalized to lowercase and must be unique; changing the email address marks it unverified and sends an email verification code.
- `POST /api/auth/change-password` — authenticated; accepts `currentPassword` and `newPassword` and returns a rotated access token.
- `GET /api/auth/addresses` — authenticated; lists the signed-in user's saved delivery addresses.
- `POST /api/auth/addresses` — authenticated; saves an address. Recipient, address line 1, city, postal code, and country are required. The first saved address becomes the default; users may save up to 10 addresses.
- `PATCH /api/auth/addresses/:addressId` — authenticated; updates an owned address. Set `isDefault: true` to make it the default address.
- `DELETE /api/auth/addresses/:addressId` — authenticated; removes an owned address and selects another default if needed.
- `GET /api/locations/countries?search=...` — public searchable country names.
- `GET /api/locations/states?country=India&search=...` — public state/province names for a selected country.
- `GET /api/locations/cities?country=India&state=Tamil%20Nadu&search=chen` — public city names for a selected country, optionally narrowed to a state. City search requires at least two characters and returns up to 50 matches.
- `GET /api/locations/india/pincode/:pincode` — public lookup for a six-digit Indian PIN code; returns the postal district and state using the India Post public lookup service.

Location options are served from the backend's bundled `country-state-city` dataset. Address forms store the selected display names, so existing saved-address and order data remains compatible.

Send the login JWT in the Authorization header using the bearer-token scheme for protected routes.

To enable Google sign-in, create a Google OAuth **Web application** client ID. Add every exact storefront origin (scheme and host, no route path) to its Authorized JavaScript origins, including the deployed frontend origin and, for local development, `http://localhost:5173` and `http://127.0.0.1:5173` if used. Set the same client ID as `GOOGLE_CLIENT_ID` on the backend Render service and `VITE_GOOGLE_CLIENT_ID` on the frontend Render service. Redeploy/restart both services after changing the values; Vite embeds its value at build time. The client ID is public; never put a Google client secret in frontend configuration. Audience-mismatch responses identify the two-client-ID configuration error. Google-only accounts can sign in with Google and do not have a password for the current-password change flow.

For email OTP on Render, add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` to the **backend** service environment and redeploy. Verify the sending domain/address with Resend first. Keep `RESEND_API_KEY` server-side; do not add it to the frontend service or any `VITE_` variable.

To provision the single production admin without a Render shell, run the script from your own computer against the production MongoDB:

1. Copy the production `MONGO_URI` from your backend Render environment into `backend/.env` (which is git-ignored). Back up any existing local `.env` first and restore it after provisioning if needed. Never commit or share this URI.
2. In PowerShell, from the `backend` directory, set the admin details and run the script:

   ```powershell
   $env:ADMIN_NAME = 'Your Name'
   $env:ADMIN_EMAIL = 'you@example.com'
   $securePassword = Read-Host 'Choose an admin password (12+ characters)' -AsSecureString
   $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
   npm run create-admin
   Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
   ```

The password is prompted rather than placed in shell history. Use a unique password of at least 12 characters. The script refuses to create a second distinct admin; rerunning with the same email updates that account's password. Do not add a public unauthenticated admin-creation endpoint.

## Catalog

- `GET /api/products` — public product list. Optional query parameters: `page`, `limit` (up to 100), `search`, `category`, `minPrice`, `maxPrice`, and `sort` (`newest`, `price-asc`, `price-desc`, `name`). Empty catalogs return `200` with an empty `data` array.
- `GET /api/products/:productId` — active product details.
- `POST /api/products` — admin-only; creates a product.
- `PATCH /api/products/:productId` — admin-only; updates supported product fields.
- `DELETE /api/products/:productId` — admin-only soft-deletes (deactivates) a product.
- `GET /api/categories` and `GET /api/categories/:categoryId` — active categories.
- `POST /api/categories`, `PATCH /api/categories/:categoryId`, `DELETE /api/categories/:categoryId` — admin-only category management; delete deactivates a category.

For JSON-only product creation, provide name, SKU, description, price, and category ID. Currency defaults to `DEFAULT_CURRENCY` or INR; stock defaults to zero.

## Product images

Product details and product images are submitted together to the admin-only `POST /api/products` endpoint as `multipart/form-data`. Send product properties as regular text fields (`name`, `sku`, `description`, `price`, `currency`, `category`, and `stock`), and attach image file fields named `images`. The same format is supported by `PATCH /api/products/:productId`.

Up to 8 JPEG, PNG, or WebP files are accepted, with a 5 MB limit per file and file-signature checks. Uploads use the backend-only `CLOUDINARY_URL`; Cloudinary secure URLs continue to populate the product's `images` array, while public IDs are saved in `imageAssets`. The admin editor displays current photos; removed photos are detached in MongoDB first and then deleted from Cloudinary only if another product does not reference the asset. Deleted products are soft-deleted/deactivated, so their images are intentionally retained.

Legacy `/uploads/...` product images continue to render when the prior files are still available; the app does not delete or automatically migrate them. To migrate, back up existing product records and source image files, upload each image to Cloudinary, then update that product's `images` URL and add its Cloudinary `imageAssets` entry. Verify catalog and product pages before retiring the old storage. Roll back by restoring the previous image URLs; do not remove Cloudinary assets until migration validation is complete.

## Cart and orders

- Cart routes require authentication: `GET /api/cart`, `POST /api/cart/items` with a product ID and quantity, `PATCH /api/cart/items/:productId` with a quantity, `DELETE /api/cart/items/:productId`, and `DELETE /api/cart`.
- Order routes require authentication: `GET /api/orders` and `GET /api/orders/:orderId`. `GET /api/orders` accepts `sortBy=createdAt|total|status` and `direction=asc|desc` for deterministic sorting. Legacy `POST /api/orders` returns `410 Gone`; use the idempotent Razorpay checkout flow at `POST /api/payments/create-order` instead.
- Customers see only their own orders; admins can list all orders. `PATCH /api/orders/:orderId/status` is admin-only. Cancelling an order restores reserved stock.
- `GET /api/products/:productId/reviews` — public reviews and average rating; optional `rating` query filters reviews to 1–5 stars.
- `POST /api/products/:productId/reviews` — authenticated; one 1–5-star review per user/product.
- `PATCH /api/products/:productId/reviews/:reviewId` and `DELETE /api/products/:productId/reviews/:reviewId` — authenticated; customers can update or delete only their own review.
- Checkout uses current catalog prices, reserves stock, records an order snapshot, and clears the cart. Shipping and tax are currently zero.

## Razorpay payments

For staging, set `RAZORPAY_MODE=test` and configure the Razorpay Test Key ID/secret and webhook secret. For production charges, explicitly set `RAZORPAY_MODE=live` and configure the matching Live Mode credentials from the Razorpay dashboard. The backend defaults to test mode and rejects a key whose `rzp_test_`/`rzp_live_` prefix does not match the configured mode. Create a webhook for `payment.captured` and `payment.failed` pointing at `https://<backend-domain>/api/payments/webhook`; local webhooks need a secure tunnel. Keep all gateway secrets on the backend.

Required environment variables:

```env
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
DEFAULT_CURRENCY=INR
```

The key secret and webhook secret are backend-only. The API returns only the public key ID.

- `POST /api/payments/create-order` — authenticated; accepts `{ "shippingAddress": { "recipient": "...", "phone": "...", "addressLine1": "...", "addressLine2": "...", "city": "...", "state": "...", "postalCode": "...", "country": "India" }, "checkoutSessionId": "<random unique id>" }`. The server reads the signed-in user's cart, calculates the amount from current MongoDB prices, reserves stock, creates the local order, then creates a Razorpay order in paise. Repeating the same session ID is idempotent and returns the same payment order. Product currency must be INR.
- `POST /api/payments/verify` — authenticated; accepts Razorpay Checkout's `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`. The backend verifies the HMAC, fetches the payment from Razorpay, checks its order/amount/currency/captured state and ownership, and only then marks the order paid.
- `POST /api/payments/cancel` — authenticated; accepts `{ "orderId": "<local order id>" }`. Cancels an unpaid checkout, releases its reserved stock, and returns its items to the user's cart. Paid or otherwise ineligible orders cannot be cancelled through this endpoint.
- `POST /api/payments/webhook` — public Razorpay callback; signature-verified against the unparsed raw body. Captured/failed updates are idempotent; duplicate deliveries do not create orders or overwrite a paid state.
- `GET /api/products/admin/catalog?page=1&limit=10` — admin-only paginated catalog including inactive products, so deactivated records remain visible and can be reactivated.

To test the Standard Web Checkout end to end:

1. Set the Test Key ID and matching Test Key Secret in `backend/.env`, then restart the backend. Keep both values out of the frontend and source control.
2. Start the backend and Vite frontend, sign in, add an in-stock product to the cart, enter a delivery address, and continue to payment. The frontend calls the authenticated `POST /api/payments/create-order`; the backend calculates the total, reserves stock, creates the local order, and creates a Razorpay order in paise.
3. In the Razorpay modal, use a Test Mode payment method from the Razorpay Dashboard's setup instructions. The setup screen shown in the integration flow lists test card `4100 2800 0000 1007`, CVV `123`, and test UPI ID `test@razorpay`. Use an unexpired future expiry date accepted by the dashboard and the test OTP/prompt shown by Razorpay. These are simulator values only; no real funds are transferred. Do not scan a Test Mode QR using a real banking UPI app.
4. On successful checkout, the frontend sends `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to authenticated `POST /api/payments/verify`. The backend verifies the HMAC signature and fetches/checks the payment before marking the order paid. Confirm the resulting order in the account and admin orders pages.
5. For cancellation or failure tests, close the modal or use Razorpay's test failure flow, then verify the reserved stock is restored and items return to the cart. If gateway order creation fails, the failed reservation is also rolled back; retry creates a new checkout session rather than reusing the cancelled one.

Razorpay Checkout exposes payment methods enabled for the configured account mode. A webhook is optional for the browser's signature-verified checkout flow but recommended for asynchronous payment updates. Admins can cancel unpaid abandoned orders, which restores stock; paid orders must be refunded through Razorpay before any cancellation/refund state change.

Supported webhook events require Razorpay's `x-razorpay-event-id` header and are recorded under a unique database key for duplicate-delivery handling. Checkout inventory is managed with conditional updates and compensating stock restoration rather than a MongoDB transaction. Although Atlas supports transactions, this payment flow is a cross-system saga; monitor and reconcile payment captures racing with customer cancellations, and process refunds in Razorpay before changing paid order state.

Admins cannot confirm unpaid orders or cancel paid orders through order-status management. If a payment capture races with cancellation, the webhook records the verified payment against the cancelled order and logs a refund-review warning; an authorized operator must review and refund it in Razorpay.

## Render production settings

- Backend: set `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, and `CORS_ORIGIN=https://nila-foods-frontend.onrender.com`. Set Google/Razorpay variables only if those integrations are enabled. Use the existing Cloudinary URL on the backend; never copy it into frontend `VITE_` settings, source control, logs, or support messages.
- Frontend Static Site: configure public `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` values as needed. Do not put Cloudinary, Resend, or Razorpay secrets on the frontend service.
- Redeploy the backend after environment changes and configure the Razorpay webhook URL/events in the matching Test or Live dashboard mode.
- Local `.env` files are git-ignored. `.env.example` contains placeholders only.

`npm test` runs backend unit tests for authentication, email OTP/password reset, Cloudinary request/upload handling (with the provider mocked), order/payment status guards, checkout compensation, and Razorpay signature/webhook idempotency. The frontend currently has lint and production-build scripts but no dedicated automated UI/e2e test runner. Real gateway, database concurrency, Render CORS, and Cloudinary delivery behavior still require staging verification.

Email verification and password reset use Resend. The authenticated change-password endpoint remains available and requires the current password.

## Data and errors

The API uses `User`, `Category`, `Product`, `ProductReview`, `Cart`, and `Order` Mongoose models. Passwords are stored as bcrypt hashes. Errors are returned as JSON; validation errors return `400`, missing resources `404`, duplicate records or stock conflicts `409`, and oversized image files `413`.
