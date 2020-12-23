const logger = require("../config/logger");
const db = require("../utils/db");

const startTransaction = async () => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    logger.debug("Transaction Started"); // + conn.threadId);
};

const commitTransaction = async () => {
    const conn = await db.getConnection();
    await conn.commit();
    logger.debug("Transaction Committed"); // + conn.threadId);
    await conn.end();
};

const rollbackTransaction = async () => {
    const conn = await db.getConnection();
    await conn.rollback();
    logger.debug("Transaction Rolled Back"); // + conn.threadId);
    await conn.end();
};

module.exports = { startTransaction, commitTransaction, rollbackTransaction };
