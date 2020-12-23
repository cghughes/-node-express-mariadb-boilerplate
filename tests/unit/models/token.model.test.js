const moment = require("moment");
const faker = require("faker");
const { Token } = require("../../../src/models");

describe("Token model", () => {
    describe("Token validation", () => {
        const token = new Token();
        let newToken;
        beforeEach(() => {
            newToken = {
                id: faker.random.number(),
                value: faker.random.alphaNumeric(),
                userId: faker.random.number(),
                type: faker.internet.password(),
                expires: moment.unix(faker.random.number()),
                blacklisted: faker.random.boolean(),
            };
            Object.assign(token, newToken);
        });

        test("values are assigned correctly", async () => {
            expect(token.id).toEqual(expect.anything());
            expect(token.value).toEqual(newToken.value);
            expect(token.userId).toEqual(newToken.userId);
            expect(token.type).toEqual(newToken.type);
            expect(token.expires).toEqual(newToken.expires);
            expect(token.blacklisted).toEqual(newToken.blacklisted);
        });

        test("should correctly export", async () => {
            expect(token.export()).toEqual({
                id: expect.anything(),
                value: newToken.value,
                userId: newToken.userId,
                type: newToken.type,
                expires: newToken.expires,
                blacklisted: newToken.blacklisted,
            });
        });
    });
});
