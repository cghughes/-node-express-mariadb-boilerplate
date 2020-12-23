const httpContext = require("express-http-context");
const uuid = require("uuid");

const db = require("../../src/utils/db");

const setupTestDB = () => {
    beforeAll(async () => {
        // const conn = await db.getConnection();
        //
        // await conn.query("DELETE FROM token");
        // await conn.query("DELETE FROM user");
        //
        // await conn.commit();
    });

    beforeEach(() => {
        const requestId = uuid.v1();
        httpContext.set("requestId", requestId);
    });

    afterEach(async () => {
        const conn = await db.getConnection();
        await conn.commit();

        await db.disconnect(false);
    });

    afterAll(async () => {
        await db.disconnect(true);
    });
};

module.exports = setupTestDB;
