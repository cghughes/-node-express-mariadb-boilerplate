const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerDefinition = require("../../docs/swaggerDef");

const router = express.Router();

const specs = swaggerJsdoc({
    swaggerDefinition,
    apis: ["src/docs/*.yml", "src/routes/v1/*.js"],
});

router.get("/", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(specs));
});

module.exports = router;
