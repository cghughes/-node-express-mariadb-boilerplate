const faker = require("faker");
const { User } = require("../../../src/models");

describe("User model", () => {
    describe("User validation", () => {
        const user = new User();
        let newUser;
        beforeEach(() => {
            newUser = {
                displayName: faker.name.findName(),
                email: faker.internet.email().toLowerCase(),
                password: "password1",
                role: "user",
            };
            Object.assign(user, newUser);
        });

        test("values are assigned correctly", async () => {
            expect(user.id).toEqual(expect.anything());
            expect(user.displayName).toEqual(newUser.displayName);
            expect(user.email).toEqual(newUser.email);
            expect(user.role).toEqual(newUser.role);
            expect(user.password).toEqual(newUser.password);
        });

        test("should correctly export with out a password", async () => {
            expect(user.export(false)).toEqual({
                id: expect.anything(),
                displayName: user.displayName,
                email: user.email,
                role: user.role,
            });
        });

        test("should correctly export with a password", async () => {
            expect(user.export(true)).toEqual({
                id: expect.anything(),
                displayName: user.displayName,
                email: user.email,
                role: user.role,
                password: user.password,
            });
        });
    });
});
