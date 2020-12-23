const { version } = require("../../package.json");
const config = require("../config/config");

const swaggerDef = {
    openapi: "3.0.0",
    info: {
        title: "Express API documentation",
        version,
        license: {
            name: "PRIVATE",
            url: "https://cgh.dev/",
        },
    },
    servers: [
        {
            url: `http://localhost:${config.port}/v1`,
            description: "Local Server",
        }
    ],
};

module.exports = swaggerDef;
