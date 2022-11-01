const defaultNotFoundMiddleware = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const defaultErrorHandler = (err, req, res, next) => {
  const errorCode = res.status === 200 ? 500 : res.statusCode;
  res.status(errorCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { defaultNotFoundMiddleware, defaultErrorHandler };
