var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var bodyParser = require('body-parser');
var helmet = require('helmet');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI must be set in backend/.env.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in backend/.env.');
}
var app = express();
if (process.env.RENDER) app.set('trust proxy', 1);
const healthRouter = require('./routers/heath_route');
const authRouter = require('./routers/auth_route');
const productRouter = require('./routers/fetch_products');
const categoryRouter = require('./routers/category_route');
const cartRouter = require('./routers/cart_route');
const orderRouter = require('./routers/order_route');
const paymentRouter = require('./routers/payment_route');
const locationRouter = require('./routers/location_route');
const { processPaymentWebhook } = require('./controllers/payment_controller');
const fs = require('fs');
const path = require('path');

const allowedOrigins = (process.env.CORS_ORIGIN
  || 'https://nila-foods-frontend.onrender.com,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (allowedOrigins.includes('*')) {
  throw new Error('CORS_ORIGIN must contain explicit trusted origins, not a wildcard.');
}
const legacyUploadsDirectory = path.join(__dirname, 'uploads');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', { name: err.name, code: err.code });
    process.exit(1);
  });

app.use(logger('dev'));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  credentials: false,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
}));
app.post(
  '/api/payments/webhook',
  bodyParser.raw({ type: 'application/json', limit: '1mb' }),
  processPaymentWebhook,
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb', parameterLimit: 100 }));
app.use(cookieParser());
if (fs.existsSync(legacyUploadsDirectory)) {
  app.use('/uploads', express.static(legacyUploadsDirectory, { fallthrough: false, maxAge: '1d' }));
}

app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/locations', locationRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError' || err instanceof SyntaxError) {
    status = 400;
  } else if (err.code === 11000) {
    status = 409;
  } else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  } else if (err.message && err.message.startsWith('Only JPEG, PNG, WebP, and GIF')) {
    status = 400;
  }
  if (status >= 500) {
    console.error('Request failed:', { name: err.name, code: err.code, status });
  }

  return res.status(status).json({
    error: status >= 500 && req.app.get('env') === 'production'
      ? 'Internal Server Error'
      : err.message,
    ...(err.apiCode ? { code: err.apiCode } : {}),
  });
});

module.exports = app;
