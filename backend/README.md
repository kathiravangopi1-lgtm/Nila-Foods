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
- `GET /api/auth/me` — returns current account details.

Send the login JWT in the Authorization header using the bearer-token scheme for protected routes.

To provision the single admin account, edit placeholder values at the top of `scripts/create_admin.js` and run `npm run create-admin`. Use credentials unique to this app, keep real credentials out of commits, and restore placeholders before committing. The script refuses to provision another admin account.

## Catalog

- `GET /api/products` — public product list. Optional query parameters: `page`, `limit` (up to 100), `search`, `category`, `minPrice`, `maxPrice`, and `sort` (`newest`, `price-asc`, `price-desc`, `name`). Empty catalogs return `200` with an empty `data` array.
- `GET /api/products/:productId` — active product details.
- `POST /api/products` — admin-only; creates a product.
- `PATCH /api/products/:productId` — admin-only; updates supported product fields.
- `DELETE /api/products/:productId` — admin-only soft-deletes (deactivates) a product.
- `GET /api/categories` and `GET /api/categories/:categoryId` — active categories.
- `POST /api/categories`, `PATCH /api/categories/:categoryId`, `DELETE /api/categories/:categoryId` — admin-only category management; delete deactivates a category.

For JSON-only product creation, provide name, SKU, description, price, and category ID. Currency defaults to `DEFAULT_CURRENCY` or USD; stock defaults to zero.

## Product images

Product details and product images are submitted together to the admin-only `POST /api/products` endpoint as `multipart/form-data`. Send product properties as regular text fields (`name`, `sku`, `description`, `price`, `currency`, `category`, and `stock`), and attach image file fields named `images`. The same format is supported by `PATCH /api/products/:productId`.

Up to 8 JPEG, PNG, WebP, or GIF files are accepted, with a 5 MB limit per file and file-signature checks. The uploaded image URLs are saved directly to the product's `images` array and returned with the product. When updating, omitting the text `images` field retains existing images and appends new files. To replace/retain specific existing images, include `images` as a JSON-encoded array of URLs alongside any new image files.

Files are served under `/uploads`. Local disk storage is intended for development; use object storage for multi-instance/production deployments.

## Cart and orders

- Cart routes require authentication: `GET /api/cart`, `POST /api/cart/items` with a product ID and quantity, `PATCH /api/cart/items/:productId` with a quantity, `DELETE /api/cart/items/:productId`, and `DELETE /api/cart`.
- Order routes require authentication: `POST /api/orders` with a shipping address containing recipient, address line 1, city, postal code, and country; `GET /api/orders`; and `GET /api/orders/:orderId`.
- Customers see only their own orders; admins can list all orders. `PATCH /api/orders/:orderId/status` is admin-only. Cancelling an order restores reserved stock.
- Checkout uses current catalog prices, reserves stock, records an order snapshot, and clears the cart. Shipping and tax are currently zero. No payment provider is integrated; new orders remain unpaid.

## Data and errors

The API uses `User`, `Category`, `Product`, `Cart`, and `Order` Mongoose models. Passwords are stored as bcrypt hashes. Errors are returned as JSON; validation errors return `400`, missing resources `404`, duplicate records or stock conflicts `409`, and oversized image files `413`.
