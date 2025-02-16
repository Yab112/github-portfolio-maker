import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";

export const authController = {
  register: async (req, res) => {
    try {
      console.log("user data from the frontend", req.body);
      const user = await userService.createUser(req.body);
      await userService.sendVerificationEmail(user);

      res.cookie("userId", user._id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", 
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      console.log(
        "DEBUG: Cookie set on response:",
        res.getHeaders()["set-cookie"]
      );

      res.status(201).json({ message: "OTP sent to email" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  verifyEmail: async (req, res) => {
    try {
      console.log("DEBUG: Cookies received in request:", req.cookies);
      console.log("DEBUG: Headers received:", req.headers);

      if (!req) {
        throw new Error("Request object is undefined.");
      }

      if (!req.cookies || !req.cookies.userId) {
        // console.log("DEBUG:",req)
        return res.status(400).json({ error: "User ID not found in cookies" });
      }

      if (!req.body || !req.body.otp) {
        return res.status(400).json({ error: "OTP is missing" });
      }

      const user = await userService.verifyEmail(
        req.body.otp,
        req.cookies.userId
      );

      const { accessToken, refreshToken } = authService.generateTokens(user);

      console.log("Access Token:", accessToken);
      console.log("Refresh Token:", refreshToken);

      authService.setAuthCookies(res, accessToken, refreshToken);
      res.json({ message: "Email verified and user logged in" });
    } catch (error) {
      console.error("DEBUG: Error in verifyEmail", error);
      res.status(400).json({ error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const user = await authService.authenticateUser(req.body);
      res.cookie("userId", user._id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", 
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", 
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });
      const otp = await userService.sendVerificationEmail(user);
      res.json({ message: "OTP sent to email"});
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { newAccessToken } = await authService.refreshAccessToken(
        req.cookies.refreshToken
      );
      authService.setAccessTokenCookie(res, newAccessToken);
      res.json({ message: "Token refreshed" });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  logout: async (req, res) => {
    try {
      await authService.revokeTokens(req.user, req.cookies.accessToken);
      authService.clearAuthCookies(res);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  resendOTP: async (req, res) => {
    try {
      if (!req.cookies || !req.cookies.userId) {
        // console.log("DEBUG:",req)
        return res.status(400).json({ error: "User ID not found in cookies" });
      }
      const user = await userService.getUserById(req.cookies.userId);
      if (!user) throw new Error("User not found");
      const otp = await userService.sendVerificationEmail(user);
      res.json({ message: "OTP resent to email" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};
