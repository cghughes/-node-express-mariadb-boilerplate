const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const { userService } = require("../services");
const { startTransaction, commitTransaction, rollbackTransaction } = require("../middlewares/transactionHandler");
const logger = require("../config/logger");
const User = require("../models/user.model");
const { pickString, pickOptions } = require("../utils/pick");

const createUser = async (req, res, next) => {
    try {
        await startTransaction();
        const user = new User();
        Object.assign(user, req.body);
        await userService.createUser(user);
        res.status(httpStatus.CREATED).send(user.export());
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const getUsers = async (req, res, next) => {
    try {
        await startTransaction();
        const email = pickString(req.query, "email");
        const options = pickOptions(req.query);
        let result = await userService.queryUsers(email, options);
        result = result.map((u) => u.export());
        res.send(result);
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const getUser = async (req, res, next) => {
    try {
        await startTransaction();
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            throw new ApiError(httpStatus.NOT_FOUND, "User not found");
        }
        res.send(user.export());
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const updateUser = async (req, res, next) => {
    try {
        await startTransaction();
        const user = new User();
        // user.id = req.params.userId;
        Object.assign(user, req.body);
        await userService.updateUser(user);
        res.send(user.export());
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        await startTransaction();
        await userService.deleteUserById(req.params.id);
        res.status(httpStatus.NO_CONTENT).send();
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
};
