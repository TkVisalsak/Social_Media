import { validationResult } from "express-validator";

/**
 * Runs after express-validator chains. If any validation failed, return
 * 400 with the full list of errors; otherwise hand off to the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};

export default validate;
