import { ApiError } from "../utils/api-error.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    throw new ApiError(422, "Validation failed", result.error.issues);
  }

  req.body = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);

  if (!result.success) {
    throw new ApiError(422, "Validation failed", result.error.issues);
  }

  req.params = result.data;
  next();
};
