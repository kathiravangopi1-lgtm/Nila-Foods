# Ecommerce API

Express and MongoDB/Mongoose API for the ecommerce app.

## Run locally

From this directory:

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env`, then set `MONGO_URI` and a unique `JWT_SECRET` of at least 32 characters. `PORT`, `JWT_EXPIRES_IN`, `DEFAULT_CURRENCY`, and comma-separated `CORS_ORIGIN` values are optional. If `CORS_ORIGIN` is omitted, CORS allows any origin.

## Authentication

- `POST /api/auth/register` — accepts name, email, password, and optional phone; passwords must be 8-72 characters/UTF-8 bytes. New accounts always get the `customer` role.
- `POST /api/auth/login` — accepts email and password; returns a JWT and a safe user object.
- `POST /api/auth/google` — accepts the Google Identity Services ID token credential, verifies it against `GOOGLE_CLIENT_ID`, and returns the same app JWT and safe user object. Google sign-in links an existing account only when Google has verified the same email.
- `GET /api/auth/me` — returns current account details.
- `POST /api/auth/change-password` — authenticated; accepts `currentPassword` and `newPassword` and returns a rotated access token.
- `GET /api/auth/addresses` — authenticated; lists the signed-in user's saved delivery addresses.
- `POST /api/auth/addresses` — authenticated; saves an address. Recipient, address line 1, city, postal code, and country are required. The first saved address becomes the default; users may save up to 10 addresses.
- `PATCH /api/auth/addresses/:addressId` — authenticated; updates an owned address. Set `isDefault: true` to make it the default address.
- `DELETE /api/auth/addresses/:addressId` — authenticated; removes an owned address and selects another default if needed.

Send the login JWT in the Authorization header using the bearer-token scheme for protected routes.

To enable Google sign-in, create a Google OAuth **Web application** client ID. Add the site origin to its Authorized JavaScript origins (for local development, add both `http://localhost:5173` and `http://127.0.0.1:5173` if you use both). Set the same client ID as `GOOGLE_CLIENT_ID` in `backend/.env` and `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`; restart both development servers after changing the values. The client ID is public; never put a Google client secret in frontend configuration. Google-only accounts can sign in with Google and do not have a password for the current-password change flow.

To provision the single admin account, edit placeholder values at the top of `scripts/create_admin.js` and run `npm run create-admin`. Use credentials unique to this app, keep real credentials out of commits, and restore placeholders before committing. The script refuses to provision another admin account.

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

Up to 8 JPEG, PNG, WebP, or GIF files are accepted, with a 5 MB limit per file and file-signature checks. The uploaded image URLs are saved directly to the product's `images` array and returned with the product. When updating, omitting the text `images` field retains existing images and appends new files. To replace/retain specific existing images, include `images` as a JSON-encoded array of URLs alongside any new image files.

Files are served under `/uploads`. Local disk storage is intended for development; use object storage for multi-instance/production deployments.

## Cart and orders

- Cart routes require authentication: `GET /api/cart`, `POST /api/cart/items` with a product ID and quantity, `PATCH /api/cart/items/:productId` with a quantity, `DELETE /api/cart/items/:productId`, and `DELETE /api/cart`.
- Order routes require authentication: `POST /api/orders` with a shipping address containing recipient, address line 1, city, postal code, and country; `GET /api/orders`; and `GET /api/orders/:orderId`.
- Customers see only their own orders; admins can list all orders. `PATCH /api/orders/:orderId/status` is admin-only. Cancelling an order restores reserved stock.
- `GET /api/products/:productId/reviews` — public reviews and average rating.
- `POST /api/products/:productId/reviews` — authenticated; one 1–5-star review per user/product.
- Checkout uses current catalog prices, reserves stock, records an order snapshot, and clears the cart. Shipping and tax are currently zero.

## Razorpay Test Mode payments

Install and configure Razorpay Test Mode credentials in the ignored `backend/.env` file. Obtain the **Test Key ID** and **Test Key Secret** from Razorpay Dashboard → Account & Settings → API Keys while Test Mode is enabled. Create a webhook in the Test Mode dashboard pointing at `https://<public-tunnel-host>/api/payments/webhook`, subscribe to `payment.captured` and `payment.failed`, and copy its webhook secret to `RAZORPAY_WEBHOOK_SECRET`. Localhost webhooks need a secure tunnel such as ngrok. Never use a live key; the backend rejects non-`rzp_test_` key IDs.

Required environment variables:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
DEFAULT_CURRENCY=INR
```

The key secret and webhook secret are backend-only. The API returns only the public key ID.

- `POST /api/payments/create-order` — authenticated; accepts `{ "shippingAddress": { "recipient": "...", "phone": "...", "addressLine1": "...", "addressLine2": "...", "city": "...", "state": "...", "postalCode": "...", "country": "India" }, "checkoutSessionId": "<random unique id>" }`. The server reads the signed-in user's cart, calculates the amount from current MongoDB prices, reserves stock, creates the local order, then creates a Razorpay order in paise. Repeating the same session ID is idempotent and returns the same payment order. Product currency must be INR.
- `POST /api/payments/verify` — authenticated; accepts Razorpay Checkout's `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`. The backend verifies the HMAC, fetches the payment from Razorpay, checks its order/amount/currency/captured state and ownership, and only then marks the order paid.
- `POST /api/payments/webhook` — public Razorpay callback; signature-verified against the unparsed raw body. Captured/failed updates are idempotent; duplicate deliveries do not create orders or overwrite a paid state.

Razorpay Checkout provides UPI, cards, and net banking methods enabled for the Test Mode account. Test payments require the Razorpay Checkout script and a running backend. Use Razorpay's current Test Mode payment methods/cards shown in their dashboard/docs; no real funds are moved. A payment failure/cancel leaves the unpaid order and its stock reservation available for retry; admins can cancel an abandoned order, which restores stock.

`npm test` covers checkout and webhook signature validation. Full UPI/card, network, inventory-concurrency, and webhook delivery tests require a configured Test Mode account, reachable webhook tunnel, and MongoDB.

Password reset by email/OTP is not enabled because this project has no outbound email provider configured. The authenticated change-password endpoint requires the current password.

## Data and errors

The API uses `User`, `Category`, `Product`, `ProductReview`, `Cart`, and `Order` Mongoose models. Passwords are stored as bcrypt hashes. Errors are returned as JSON; validation errors return `400`, missing resources `404`, duplicate records or stock conflicts `409`, and oversized image files `413`.
