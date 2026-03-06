import jwt from "jsonwebtoken";

export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

export const generateRefreshToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
};
