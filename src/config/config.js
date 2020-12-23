const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const envVarsSchema = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid("production", "development", "test").required(),
        PORT: Joi.number().default(3000),
        MARIADB_DATABASE: Joi.string().required().description("Maria DB name"),
        MARIADB_HOST: Joi.string().required().description("Maria DB host"),
        MARIADB_USER: Joi.string().required().description("Maria DB user"),
        MARIADB_PASSWORD: Joi.string().required().description("Maria DB password"),
        MARIADB_PORT: Joi.number().default(3306).description("Maria DB port"),
        JWT_SECRET: Joi.string().required().description("JWT secret key"),
        JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description("minutes after which access tokens expire"),
        JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description("days after which refresh tokens expire"),
        SMTP_HOST: Joi.string().description("server that will send the emails"),
        SMTP_PORT: Joi.number().description("port to connect to the email server"),
        SMTP_USERNAME: Joi.string().optional().description("username for email server"),
        SMTP_PASSWORD: Joi.string().optional().description("password for email server"),
        EMAIL_FROM: Joi.string().description("the from field in the emails sent by the app"),
    })
    .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: "key" } }).validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    maria: {
        host: envVars.MARIADB_HOST,
        user: envVars.MARIADB_USER,
        password: envVars.MARIADB_PASSWORD,
        database: envVars.MARIADB_DATABASE,
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: 10,
    },
    email: {
        smtp: {
            host: envVars.SMTP_HOST,
            port: envVars.SMTP_PORT,
            auth: {
                user: envVars.SMTP_USERNAME,
                pass: envVars.SMTP_PASSWORD,
            },
        },
        from: envVars.EMAIL_FROM,
    },
};
