import User from "../models/user.js";
import bcrypt from "bcrypt";
import 'dotenv/config'
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js"
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const login = async (req, res) => {
  const { email, password } = req.body;

  //Check email and password is available or not
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    })
  }

  //Find the User
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({
      message: "Invalid credentials",
    })
  };

  // Check email verification
  if (!user.emailVerified) {
    return res.status(403).json({
      message: "Please verify your email first",
    });
  }

  // Check user status
  if (user.status !== "active") {
    return res.status(403).json({
      message: `Account is ${user.status}`,
    });
  }

  //Check passowrd is correct or not?
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid credentials",
    })
  };

  //Create JWt token
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);

  // Store refresh token in database
  user.refreshToken = refreshToken;
  await user.save();

  // Set refresh token as HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  // Send success response
  res.json({
    message: "Login successful",
    token: accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  })
}

export const registerUser = async (req, res) => {
  try {
    // 1️⃣ Extract data
    const { name, email, password } = req.body;

    // 2️⃣ Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // 3️⃣ Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // 4️⃣ Create user (password hashes automatically)
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    console.log("verifyToken:", verifyToken);
    // Hash the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    // Store in user document
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    // 5️⃣ Safe response (NO password)
    res.status(201).json({
      message: "User registered successfully. Please check your email for verification.",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const changePassword = async (req, res) => {
  const id = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Both passwords are required",
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "New password must be different from current password",
    });
  }

  try {
    const user = await User.findById(id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(402).json({
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  }
  catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error changing password" });
  }
}


export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        message: "refresh token is missing"
      })
    }

    const decode = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decode.id);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        message: "Invalid refresh token"
      })
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    // const refreshToken = generateRefreshToken(user._id, user.role);
    // user.refreshToken = refreshToken;
    // await user.save();

    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: false,
    //   sameSite: "lax",
    // });

    res.json({
      message: "Refresh token successful",
      token: newAccessToken,
    });
  } catch (error) {
    console.log("error", error);
    res.status(403).json({
      message: "Invalid or expired refresh token"
    })
  }
}

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.json({ message: "Logged out" });
    }

    await User.updateOne(
      { refreshToken },
      { $unset: { refreshToken: "" } }
    );

    res.clearCookie("refreshToken");

    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: "If this email is registered, a reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token & expiry
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // 🧪 DEV MODE: return raw token (later we send via email)
    res.status(200).json({
      message: "Password reset token generated",
      resetToken, // remove this when email is implemented
    });

  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error forgot password" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    // 1️⃣ Hash incoming token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 2️⃣ Find user with valid token & not expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // 3️⃣ Set new password
    user.password = newPassword;

    // 4️⃣ Clear reset fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // 5️⃣ Invalidate refresh token (force re-login)
    user.refreshToken = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successful. Please login again.",
    });

  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    res.json({
      message: "Email verified successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Email verification failed",
    });
  }
};