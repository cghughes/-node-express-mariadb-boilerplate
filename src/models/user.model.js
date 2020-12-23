const validator = require("validator");
const bcrypt = require("bcryptjs");
const db = require("../utils/db");
const { roles } = require("../config/roles");

/**
 * User
 */
class User {
    constructor() {
        this.id = -1;
        this.displayName = "";
        this.email = "";
        this.password = "";
        this.role = "user";
    }

    export(withPassword = false) {
        if (!withPassword) {
            return {
                id: this.id,
                displayName: this.displayName,
                email: this.email,
                role: this.role,
            };
        }
        return {
            id: this.id,
            displayName: this.displayName,
            email: this.email,
            password: this.password,
            role: this.role,
        };
    }

    /**
     * User id
     *
     * @return {number}
     */
    get id() {
        return this._id;
    }

    /**
     * User id
     * @param {number} id
     */
    set id(id) {
        this._id = id;
    }

    /**
     * User display name
     *
     * @return {string}
     */
    get displayName() {
        return this._displayName;
    }

    /**
     * User display name
     * @param {string} displayName
     */
    set displayName(displayName) {
        this._displayName = displayName;
    }

    /**
     * User email address
     *
     * @return {string}
     */
    get email() {
        return this._email;
    }

    /**
     * User email address
     * @param {string} email
     */
    set email(email) {
        this._email = email;
    }

    /**
     * User password
     *
     * @return {string}
     */
    get password() {
        return this._password;
    }

    /**
     * User password
     * @param {string} password
     */
    set password(password) {
        this._password = password;
    }

    /**
     * User role
     *
     * @return {string}
     */
    get role() {
        return this._role;
    }

    /**
     * User role
     * @param {string} role - User Role type
     */
    set role(role) {
        this._role = role;
    }
}

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
// UserService.methods.isPasswordMatch = async function (password) {
//     const user = this;
//     return bcrypt.compare(password, user.password);
// };
//
// userSchema.pre('save', async function (next) {
//   const user = this;
//   if (user.isModified('password')) {
//     user.password = await bcrypt.hash(user.password, 8);
//   }
//   next();
// });

module.exports = User;
