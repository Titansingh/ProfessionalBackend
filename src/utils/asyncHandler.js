//takes a funtion as parameter  (higher order funtion)
const asyncHandler = (requestHandler) => {
  return async (req, res, next) => {
    try {
      await requestHandler(req, res, next);
    } catch (error) {
      res.status(err.code || 500).json({
        sucess: false,
        mesaage: err.mesaage,
      });
    }
  };
};
// recives a funtion and returns a promise
const asyncHandlerPromise = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
export { asyncHandler, asyncHandlerPromise };
