const httpStatus = require("http-status");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const db = require("../utils/db");

/**
 * Check if email already taken
 * @param {string} email
 * @param {number} excludeUserId
 * @returns {Promise<Boolean>}
 */
const isEmailTaken = async (email, excludeUserId = -1) => {
    const conn = await db.getConnection();
    if (excludeUserId > 0) {
        const rows = await conn.query("select id from user where email = ? AND id != ?", [email, excludeUserId]);
        /** @namespace rows.length - Number of rows returned * */
        return rows.length > 0;
    }
    const rows = await conn.query("select id from user where email = ?", [email]);
    /** @namespace rows.length - Number of rows returned * */
    return rows.length > 0;

    // conn.end();
};

/**
 * Create a user
 * @param {User} user
 * @returns {Promise<User>}
 */
const createUser = async (user) => {
    const duplicateEmail = await isEmailTaken(user.email);
    if (duplicateEmail) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }

    if (user.id > 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot create an existing user");
    }
    const conn = await db.getConnection();
    const results = await conn.query("insert into user (display_name, email, password, role) values (?,?,?,?)", [
        user.displayName,
        user.email,
        user.password,
        user.role,
    ]);
    user.id = results["insertId"];
    // conn.commit();
    return user;
};

/**
 * @param row - User row return from DB
 */
function convertRowToUser(row) {
    const user = new User();
    user.id = row["id"];
    user.displayName = row["display_name"];
    user.email = row["email"];
    user.password = row["password"];
    user.role = row["role"];
    return user;
}

/**
 * Query for users
 * @param {string} email - filter on email
 * @param {{}} options - Additional configuration options
 * @param {number} options.page - Current page (default = 1)
 * @param {number} options.limit - Maximum number of results per page (default = 10)
 * @returns {Promise<User[]>}
 */
const queryUsers = async (email = "%", options) => {
    const conn = await db.getConnection();
    const users = [];
    /** @type Array */
    const rows = await conn.query("select id, display_name, email, password, role from user where email like ? limit ?,?", [
        email,
        options.page,
        options.limit,
    ]);

    rows.map((row) => {
        users.push(convertRowToUser(row));
    });

    return users;
};

/**
 * Get user by id
 * @param {number} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
    const conn = await db.getConnection();
    const rows = await conn.query("select id, display_name, email, password, role from user where id = ?", [id]);
    /** @namespace rows.length - Number of rows returned * */
    if (rows[0]) {
        const row = rows[0];
        return convertRowToUser(row);
    }
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
    const conn = await db.getConnection();
    const rows = await conn.query("select id, display_name, email, password, role from user where email = ?", [email]);
    /** @namespace rows.length - Number of rows returned * */
    if (rows[0]) {
        const row = rows[0];
        return convertRowToUser(row);
    }
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
};

/**
 * Check email and password login and return user if authenticated
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
    const conn = await db.getConnection();
    const rows = await conn.query("select id, display_name, email, password, role from user where email = ? and password = ?", [email, password]);
    /** @namespace rows.length - Number of rows returned * */
    if (rows[0]) {
        const row = rows[0];
        return convertRowToUser(row);
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");
};

/**
 * Update user by id
 * @param {User} user
 * @returns {Promise<boolean>}
 */
const updateUser = async (user) => {
    if (user.email && (await isEmailTaken(user.email, user.id))) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }

    // TODO handle missing role from schema validation
    const conn = await db.getConnection();
    let results;
    if (user.password === "") {
        results = await conn.query("UPDATE user SET display_name = ?, email = ?, role = ? WHERE id = ?", [
            user.displayName,
            user.email,
            user.role,
            user.id,
        ]);
    } else {
        results = await conn.query("UPDATE user SET display_name = ?, email = ?, password = ?, role = ? WHERE id = ?", [
            user.displayName,
            user.email,
            user.password,
            user.role,
            user.id,
        ]);
    }

    if (results["affectedRows"] < 1) {
        throw new Error("Record not updated");
    }
    return true;
};

/**
 * Delete user by id
 * @param {number} id
 * @returns {Promise<boolean>}
 */
const deleteUserById = async (id) => {
    // const user = await getUserById(id);
    // if (!user) {
    //     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    // }
    const conn = await db.getConnection();
    const results = await conn.query("delete from user where id = ?", [id]);
    if (results["affectedRows"] < 1) {
        throw new ApiError(httpStatus.NOT_FOUND, "Record not deleted");
    }
    return true;
};

const commit = async () => {
    const conn = await db.getConnection();
    await conn.commit();
};

module.exports = {
    createUser,
    queryUsers,
    getUserById,
    getUserByEmail,
    loginUserWithEmailAndPassword,
    updateUser,
    deleteUserById,
    commit,
};
