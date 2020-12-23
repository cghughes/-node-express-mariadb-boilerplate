const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");
const db = require("./utils/db");

let server;

db.getConnection()
    .then(() => {
        logger.info("Connected to MariaB");
        server = app.listen(config.port, () => {
            logger.info(`Listening to port ${config.port}`);
        });
    })
    .catch((error) => {
        logger.error(`Failed to connect MariaB :${error}`);
        process.exit(1);
    });

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info("Server closed");
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
    logger.info("SIGTERM received");
    if (server) {
        server.close();
    }
});
