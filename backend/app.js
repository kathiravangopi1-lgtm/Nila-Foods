var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
var app = express();
const healthRouter = require('./routers/heath_route');
const authRouter = require('./routers/auth_route');
const productRouter = require('./routers/fetch_products');
const categoryRouter = require('./routers/category_route');
const cartRouter = require('./routers/cart_route');
const orderRouter = require('./routers/order_route');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }

  return res.status(status).json({
    error: status >= 500 && req.app.get('env') === 'production'
      ? 'Internal Server Error'
      : err.message,
  });
});

module.exports = app;
