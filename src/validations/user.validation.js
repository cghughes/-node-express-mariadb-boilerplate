const Joi = require("joi");
const { password } = require("./custom.validation");

const createUser = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required().custom(password),
        displayName: Joi.string().required(),
        role: Joi.string().required().valid("user", "admin"),
    }),
};

const getUsers = {
    query: Joi.object().keys({
        email: Joi.string(),
        role: Joi.string(),
        sortBy: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};

const getUser = {
    params: Joi.object().keys({
        id: Joi.number(),
    }),
};

const updateUser = {
    body: Joi.object()
        .keys({
            id: Joi.number(),
            displayName: Joi.string(),
            email: Joi.string().email(),
            password: Joi.string().custom(password),
            role: Joi.string().optional(),
        })
        .min(1),
};

const deleteUser = {
    params: Joi.object().keys({
        id: Joi.number(),
    }),
};

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
};
