const httpStatus = require("http-status");
const User = require("../models/user.model");
const { authService, userService, tokenService, emailService } = require("../services");
const { startTransaction, commitTransaction, rollbackTransaction } = require("../middlewares/transactionHandler");
const logger = require("../config/logger");

// const register = catchAsync(async (req, res, next) => {
//   let user = new User();
//   Object.assign(user, req.body)
//   await userService.createUser(user);
//   const tokens = await tokenService.generateAuthTokens(user);
//   res.status(httpStatus.CREATED).send({user, tokens});
//   next();
// });

const register = async (req, res, next) => {
    try {
        await startTransaction();
        const user = new User();
        Object.assign(user, req.body);
        await userService.createUser(user);
        const tokens = await tokenService.generateAuthTokens(user);
        res.status(httpStatus.CREATED).send({ user: user.export(), tokens });
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        await startTransaction();
        const { email, password } = req.body;
        const user = await userService.loginUserWithEmailAndPassword(email, password);
        const tokens = await tokenService.generateAuthTokens(user);
        res.send({ user: user.export(), tokens });
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        await startTransaction();
        await authService.logout(req.body.refreshToken);
        res.status(httpStatus.NO_CONTENT).send();
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const refreshTokens = async (req, res, next) => {
    try {
        await startTransaction();
        const tokens = await authService.refreshAuth(req.body.refreshToken);
        res.send({ ...tokens });
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        await startTransaction();
        const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
        await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
        res.status(httpStatus.NO_CONTENT).send();
        await commitTransaction();
    } catch (err) {
        rollbackTransaction().catch(() => {
            logger.error(err);
        });
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        await startTransaction();
        await authService.resetPassword(req.query.token, req.body.password);
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
    register,
    login,
    logout,
    refreshTokens,
    forgotPassword,
    resetPassword,
};
