class ApiError extends Error {
  constructor(
    statuscode,
    message = "Something went wrong",
    error = [],
    stack = "",
  ) {
    super(message);
    this.statuscode = statuscode;
    this.data = null;
    this.message = message;
    this.sucess = false;
    this.error = error;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export { ApiError };
