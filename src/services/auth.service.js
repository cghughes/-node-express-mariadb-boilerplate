const httpStatus = require("http-status");
const tokenService = require("./token.service");
const userService = require("./user.service");
const ApiError = require("../utils/ApiError");
const db = require("../utils/db");
const { tokenTypes } = require("../config/tokens");
const logger = require("../config/logger");

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise<boolean>}
 */
const logout = async (refreshToken, blacklisted = false) => {
    const conn = await db.getConnection();
    const results = await conn.query("delete from token where value = ? and blacklisted = ?", [refreshToken, blacklisted]);

    if (results["affectedRows"] >= 1) {
        return true;
    }
    throw new ApiError(httpStatus.NOT_FOUND, "Token not found");
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (token) => {
    try {
        const refreshToken = await tokenService.verifyToken(token, tokenTypes.REFRESH);
        const user = await userService.getUserById(refreshToken.userId);
        if (!user) {
            throw new Error();
        }
        await logout(refreshToken.value);
        return tokenService.generateAuthTokens(user);
    } catch (err) {
        logger.warn(err);
        throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
    }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (token, newPassword) => {
    try {
        const resetPasswordToken = await tokenService.verifyToken(token, tokenTypes.RESET_PASSWORD);
        if (!resetPasswordToken) {
            throw new Error();
        }

        const conn = await db.getConnection();
        const results = await conn.query("delete from token where user_id = ? and type = ? and blacklisted = ?", [resetPasswordToken.userId, tokenTypes.RESET_PASSWORD, false]);
        if (results["affectedRows"] < 1) {
            logger.warn("No tokens deleted for user ? on password reset", resetPasswordToken.userId);
            throw new Error();
        }

        const user = await userService.getUserById(resetPasswordToken.userId);
        if (!user) {
            throw new Error();
        }
        user.password = newPassword;
        await userService.updateUser(user);
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Password reset failed");
    }
};

module.exports = {
    logout,
    refreshAuth,
    resetPassword,
};
