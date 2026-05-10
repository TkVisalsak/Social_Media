import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "30d";
const RESET_TTL = "15m";

export const generateAccessToken = (userId) => {
  return jwt.sign({ userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  });
};

export const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ userId, type: "refresh" }, secret, {
    expiresIn: REFRESH_TTL,
  });
};

export const generateResetToken = (userId) => {
  return jwt.sign({ userId, type: "reset" }, process.env.JWT_SECRET, {
    expiresIn: RESET_TTL,
  });
};

export const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};

export const verifyResetToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/** Backwards-compatible alias — old call sites use generateToken(). */
export const generateToken = generateAccessToken;
