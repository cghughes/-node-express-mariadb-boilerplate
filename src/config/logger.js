const winston = require("winston");
const config = require("./config");

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

const logger = winston.createLogger({
    // level: config.env === "development" ? "debug" : "info",
    level: "debug",
    format: winston.format.combine(
        enumerateErrorFormat(),
        config.env === "development" ? winston.format.colorize() : winston.format.uncolorize(),
        winston.format.timestamp(),
        winston.format.label(),
        // winston.format.align(),
        winston.format.splat(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ["error"],
        }),
    ],
});

module.exports = logger;
