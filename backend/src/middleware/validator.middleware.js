import { ApiError } from "../utils/api-error.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    console.log(result);
    const errors = result.error.errors.map((e) => ({
      [e.path.join(".")]: e.message,
    }));
    throw new ApiError(422, "Received data is not valid", errors);
  }
  req.body = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    console.log(result);
    const errors = result.error.errors.map((e) => ({
      [e.path.join(".")]: e.message,
    }));
    throw new ApiError(422, "Invalid request parameters", errors);
  }
  req.params = result.data;
  next();
};
