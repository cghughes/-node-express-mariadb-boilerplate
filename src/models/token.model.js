const moment = require("moment");
const { tokenTypes } = require("../config/tokens");

/**
 * Token
 */
class Token {
    constructor() {
        this.id = -1;
        this.value = "";
        this.userId = -1;
        this.type = tokenTypes.ACCESS; // [tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD],
        this.expires = moment.unix(1);
        this.blacklisted = false;
    }

    export() {
        return {
            id: this.id,
            value: this.value,
            userId: this.userId,
            type: this.type,
            expires: this.expires,
            blacklisted: this.blacklisted,
        };
    }

    /**
     * Token Id
     *
     * @return {number}
     */
    get id() {
        return this._id;
    }

    /**
     * Token Id
     *
     * @param {number} id
     */
    set id(id) {
        this._id = id;
    }

    /**
     * Token
     *
     * @param {string} token
     */
    set value(token) {
        this._value = token;
    }

    /**
     * Token
     *
     * @return {string}
     */
    get value() {
        return this._value;
    }

    /**
     * User Id
     *
     * @param {number} userId
     */
    set userId(userId) {
        this._userId = userId;
    }

    /**
     * User Id
     *
     * @return {number}
     */
    get userId() {
        return this._userId;
    }

    /**
     * Token Type
     *
     * @param {tokenTypes} type
     */
    set type(type) {
        this._type = type;
    }

    /**
     * Token Type
     *
     * @return {tokenTypes}
     */
    get type() {
        return this._type;
    }

    /**
     * Token Expiry Date
     *
     * @return {Moment}
     */
    get expires() {
        return this._expires;
    }

    /**
     * Token Expiry Date
     *
     * @param {Moment} expires
     */
    set expires(expires) {
        this._expires = expires;
    }

    /**
     * Token Expiry Date in MySQL Date Format
     *
     * @return {string}
     */
    get expiresToMySQLFormat() {
        return this._expires.format("YYYY-MM-DD HH:mm:ss");
    }

    /**
     * Is token blacklisted
     *
     * @param {boolean} blacklisted
     */
    set blacklisted(blacklisted) {
        this._blacklisted = blacklisted;
    }

    /**
     * Is token blacklisted
     *
     * @return {boolean}
     */
    get blacklisted() {
        return this._blacklisted;
    }

    /**
     * Build Token VO
     *
     * @param {string} value
     * @param {number} userId
     * @param {Moment} expires
     * @param {tokenTypes} type
     * @param {boolean} blacklisted
     *
     * @return {Token} new Token VO
     */

    static buildToken(value, userId, expires, type, blacklisted = false) {
        const t = new Token();
        t.id = -1;
        t.value = value;
        t.userId = userId;
        t.type = type;
        t.expires = expires;
        t.blacklisted = blacklisted;
        return t;
    }
}

module.exports = Token;
