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

- `POST /api/auth/register` — accepts name, email, password, optional phone, and optional `emailOffersOptIn` consent; passwords must be 8-72 characters/UTF-8 bytes. New accounts always get the `customer` role.
- `POST /api/auth/login` — accepts email and password; returns a JWT and a safe user object. Access tokens last 7 days by default; configure `JWT_EXPIRES_IN` to change this. Users must sign in again after a token expires.
- `POST /api/auth/google` — accepts the Google Identity Services ID token credential, verifies it against `GOOGLE_CLIENT_ID`, and returns the same app JWT and safe user object. Google sign-in links an existing account only when Google has verified the same email.
- `GET /api/auth/me` — returns current account details.
- `PATCH /api/auth/me` — authenticated; updates profile fields, email-offer consent, or up to 100 active product IDs in `restockProductIds`. Email addresses are normalized to lowercase and must be unique.
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
- Order routes require authentication: `POST /api/orders` with a shipping address containing recipient, address line 1, city, postal code, and country; `GET /api/orders`; and `GET /api/orders/:orderId`. `GET /api/orders` accepts `sortBy=createdAt|total|status` and `direction=asc|desc` for deterministic sorting.
- Customers see only their own orders; admins can list all orders. `PATCH /api/orders/:orderId/status` is admin-only. Cancelling an order restores reserved stock.
- `GET /api/products/:productId/reviews` — public reviews and average rating; optional `rating` query filters reviews to 1–5 stars.
- `POST /api/products/:productId/reviews` — authenticated; one 1–5-star review per user/product.
- `PATCH /api/products/:productId/reviews/:reviewId` and `DELETE /api/products/:productId/reviews/:reviewId` — authenticated; customers can update or delete only their own review.
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
- `POST /api/payments/cancel` — authenticated; accepts `{ "orderId": "<local order id>" }`. Cancels an unpaid checkout, releases its reserved stock, and returns its items to the user's cart. Paid or otherwise ineligible orders cannot be cancelled through this endpoint.
- `POST /api/payments/webhook` — public Razorpay callback; signature-verified against the unparsed raw body. Captured/failed updates are idempotent; duplicate deliveries do not create orders or overwrite a paid state.
- `GET /api/products/admin/catalog?page=1&limit=10` — admin-only paginated catalog including inactive products, so deactivated records remain visible and can be reactivated.

To test the Standard Web Checkout end to end:

1. Set the Test Key ID and matching Test Key Secret in `backend/.env`, then restart the backend. Keep both values out of the frontend and source control.
2. Start the backend and Vite frontend, sign in, add an in-stock product to the cart, enter a delivery address, and continue to payment. The frontend calls the authenticated `POST /api/payments/create-order`; the backend calculates the total, reserves stock, creates the local order, and creates a Razorpay order in paise.
3. In the Razorpay modal, use a Test Mode payment method from the Razorpay Dashboard's setup instructions. The setup screen shown in the integration flow lists test card `4100 2800 0000 1007`, CVV `123`, and test UPI ID `test@razorpay`. Use an unexpired future expiry date accepted by the dashboard and the test OTP/prompt shown by Razorpay. These are simulator values only; no real funds are transferred. Do not scan a Test Mode QR using a real banking UPI app.
4. On successful checkout, the frontend sends `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to authenticated `POST /api/payments/verify`. The backend verifies the HMAC signature and fetches/checks the payment before marking the order paid. Confirm the resulting order in the account and admin orders pages.
5. For cancellation or failure tests, close the modal or use Razorpay's test failure flow, then verify the reserved stock is restored and items return to the cart. If gateway order creation fails, the failed reservation is also rolled back; retry creates a new checkout session rather than reusing the cancelled one.

Razorpay Checkout exposes the payment methods enabled for the Test Mode account. A webhook is optional for the browser's signature-verified checkout flow but recommended for asynchronous payment updates; configure it as described above when a public tunnel is available. Admins can cancel an abandoned order, which restores stock.

`npm test` covers checkout and webhook signature validation. Full UPI/card, network, inventory-concurrency, and webhook delivery tests require a configured Test Mode account, reachable webhook tunnel, and MongoDB.

Password reset by email/OTP is not enabled because this project has no outbound email provider configured. The authenticated change-password endpoint requires the current password.

## Data and errors

The API uses `User`, `Category`, `Product`, `ProductReview`, `Cart`, and `Order` Mongoose models. Passwords are stored as bcrypt hashes. Errors are returned as JSON; validation errors return `400`, missing resources `404`, duplicate records or stock conflicts `409`, and oversized image files `413`.
