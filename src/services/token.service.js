const jwt = require("jsonwebtoken");
const moment = require("moment");
const httpStatus = require("http-status");
const config = require("../config/config");
const userService = require("./user.service");
const { Token } = require("../models");
const ApiError = require("../utils/ApiError");
const db = require("../utils/db");
const { tokenTypes } = require("../config/tokens");

/**
 * Generate token
 * @param {number} userId
 * @param {Moment} expires
 * @param {tokenTypes} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateRawToken = (userId, expires, type, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    };
    return jwt.sign(payload, secret);
};

/**
 * @param row - Token row return from DB
 */
function convertRowToToken(row) {
    const token = new Token();

    token.id = row["id"];
    token.value = row["value"];
    token.userId = row["user_id"];
    token.expires = row["expires"];
    token.type = row["type"];
    token.blacklisted = !!row["blacklisted"];

    return token;
}

/**
 * Create a token
 * @param {Token} token
 * @returns {Promise<Token>}
 */
const saveToken = async (token) => {
    const conn = await db.getConnection();
    const results = await conn.query("insert into token (value, user_id, expires, type, blacklisted) values (?,?,?,?,?)", [
        token.value,
        token.userId,
        token.expiresToMySQLFormat,
        token.type,
        token.blacklisted,
    ]);
    /** @namespace results.insertId */
    token.id = results["insertId"];

    return token;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
    const payload = jwt.verify(token, config.jwt.secret);
    const userId = payload.sub;

    const conn = await db.getConnection();
    const rows = await conn.query("select id, value, user_id, expires, type, blacklisted from token where value = ? AND type = ? AND user_id = ?", [token, type, userId]);

    /** @namespace rows.length - Number of rows returned * */
    if (rows[0]) {
        const row = rows[0];
        return convertRowToToken(row);
    }
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Token");
};

/**
 * Get token and return token VO (or null if not found)
 * @param {string} token
 * @returns {Promise<Token>}
 */
const getToken = async (token) => {
    const conn = await db.getConnection();
    const rows = await conn.query("select id, value, user_id, expires, type, blacklisted from token where value = ?", [token]);

    /** @namespace rows.length - Number of rows returned */
    if (rows[0]) {
        const row = rows[0];
        return convertRowToToken(row);
    }
    return null;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, "minutes");
    const accessToken = generateRawToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, "days");
    const refreshToken = generateRawToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);

    await saveToken(Token.buildToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH));

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "No users found with this email");
    }
    const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, "minutes");
    const resetPasswordToken = generateRawToken(user.id, expires, tokenTypes.RESET_PASSWORD);
    await saveToken(Token.buildToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD));
    return resetPasswordToken;
};

module.exports = {
    generateRawToken,
    saveToken,
    verifyToken,
    getToken,
    generateAuthTokens,
    generateResetPasswordToken,
};
