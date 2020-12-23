const mariadb = require("mariadb");
const httpContext = require("express-http-context");
const NodeCache = require("node-cache");
const config = require("../config/config");
const logger = require("../config/logger");

// create a new connection pool
const pool = mariadb.createPool({
    host: config.maria.host,
    user: config.maria.user,
    password: config.maria.password,
    database: config.maria.database,
    connectionLimit: 100,
});

const connectionCache = new NodeCache();
const connections = [];

if (pool) {
    pool.on("acquire", (connection) => {
        logger.debug("Connection %d acquired [%d, %d]", connection.threadId, pool.activeConnections(), pool.totalConnections());
        if (config.env === "test") {
            connections.push(connection);
        }
    });

    pool.on("connection", (connection) => {
        logger.debug("Connection %d connected [%d, %d]", connection.threadId, pool.activeConnections(), pool.totalConnections());
    });

    pool.on("enqueue", () => {
        logger.debug("Waiting for available connection slot [%d, %d]", pool.activeConnections(), pool.totalConnections());
    });

    pool.on("release", (connection) => {
        logger.debug("Connection %d released [%d, %d]", connection.threadId, pool.activeConnections(), pool.totalConnections());
    });
}

const getConnection = async () => {
    if (!pool) {
        return mariadb.createConnection({
            host: config.maria.host,
            user: config.maria.user,
            password: config.maria.password,
            database: config.maria.database,
        });
    }
    const requestId = httpContext.get("requestId");
    if (!requestId) {
        const connection = await pool.getConnection();

        logger.debug(`Connection received: ${connection.threadId}`);
        return connection;
    }
    logger.debug(`Getting DB connection for ${requestId}`);
    let connection = connectionCache.get(requestId);
    if (!connection) {
        connection = await pool.getConnection();
        connectionCache.set(requestId, connection, 5);
        logger.debug(`New Connection received: ${connection.threadId} for request ${requestId}`);
    } else {
        connection.ping();
    }
    return connection;
};

const disconnect = async (closePool = true) => {
    const outStanding = pool.taskQueueSize();
    if (outStanding > 0) {
        logger.warn("Connection has %d remaining tasks ", outStanding);
    }
    try {
        if (closePool) {
            logger.debug("Disconnecting connection pool [%d, %d]", pool.activeConnections(), pool.totalConnections());
            await pool.end();
            if (pool.totalConnections() > 0) {
                logger.warn("Forcing disconnection of outstanding connections %d", pool.totalConnections());
                connections.map((connection) => {
                    connection.destroy();
                    return connection;
                });
            }
            logger.debug("Connection pool closed [%d, %d]", pool.activeConnections(), pool.totalConnections());
        } else {
            logger.warn("Forcing disconnection of rogue connections %d", pool.totalConnections());
            connections.map((connection) => {
                connection.destroy();
                return connection;
            });
            connections.splice(0, connections.length);
        }
    } catch (err) {
        logger.error(err);
    }
};

// expose the ability to create new connections
module.exports = {
    getConnection,
    disconnect,
};
