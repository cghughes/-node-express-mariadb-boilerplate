const request = require("supertest");
const httpStatus = require("http-status");
const moment = require("moment");
const app = require("../../src/app");
const setupTestDB = require("../utils/setupTestDB");
const userFixture = require("../fixtures/user.fixture");
const tokenService = require("../../src/services/token.service");
const userService = require("../../src/services/user.service");
const { tokenTypes } = require("../../src/config/tokens");

setupTestDB();

let admin;
let adminAccessToken;
beforeAll(async () => {
    admin = userFixture.createFakeUser(true);
    await userService.createUser(admin);
    const expires = moment().add(1, "minutes");
    adminAccessToken = tokenService.generateRawToken(admin.id, expires, tokenTypes.ACCESS);

    await userService.commit();
});

let user;
let userAccessToken;
beforeAll(async () => {
    user = userFixture.createFakeUser(false);
    await userService.createUser(user);
    const expires = moment().add(1, "minutes");
    userAccessToken = tokenService.generateRawToken(user.id, expires, tokenTypes.ACCESS);

    await userService.commit();
});

describe("User routes", () => {
    describe("POST /v1/users", () => {
        let newUser;
        beforeEach(() => {
            const _user = userFixture.createFakeUser();
            newUser = {
                displayName: _user.displayName,
                email: _user.email,
                password: _user.password,
                role: "user",
            };
        });

        test("should return 201 and successfully create new user if data is ok", async () => {
            const res = await request(app)
                .post("/v1/users")
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(newUser)
                .expect(httpStatus.CREATED);

            /** @namespace res.body - HTTP response body */
            expect(res.body).not.toHaveProperty("password");
            expect(res.body).toEqual({
                id: expect.anything(),
                displayName: newUser.displayName,
                email: newUser.email,
                role: newUser.role,
            });

            const dbUser = await userService.getUserById(res.body.id);
            expect(dbUser).toBeDefined();
            // TODO fix password hashing
            // expect(dbUser.password).not.toBe(newUser.password);
            expect(dbUser).toMatchObject({ displayName: newUser.displayName, email: newUser.email, role: newUser.role });
        });

        test("should be able to create an admin as well", async () => {
            newUser.role = "admin";
            const res = await request(app)
                .post("/v1/users")
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(newUser)
                .expect(httpStatus.CREATED);

            /** @namespace res.body - HTTP response body */
            expect(res.body.role).toBe("admin");

            const dbUser = await userService.getUserById(res.body.id);
            expect(dbUser.role).toBe("admin");
        });

        test("should return 401 error is access token is missing", async () => {
            await request(app).post("/v1/users").send(newUser).expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 403 error if logged in user is not admin", async () => {
            await request(app).post("/v1/users").set("Authorization", `Bearer ${userAccessToken}`).send(newUser).expect(httpStatus.FORBIDDEN);
        });

        test("should return 400 error if email is invalid", async () => {
            newUser.email = "invalidEmail";

            await request(app).post("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if email is already used", async () => {
            newUser.email = user.email;

            await request(app).post("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if password length is less than 8 characters", async () => {
            // noinspection SpellCheckingInspection
            newUser.password = "passwo1";

            await request(app).post("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if password does not contain both letters and numbers", async () => {
            newUser.password = "password";

            await request(app).post("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);

            newUser.password = "1111111";

            await request(app).post("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if role is neither user nor admin", async () => {
            newUser.role = "invalid";

            await request(app).post("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
        });
    });

    describe("GET /v1/users", () => {
        test("should return 200 and apply the default query options", async () => {
            const res = await request(app).get("/v1/users").set("Authorization", `Bearer ${adminAccessToken}`).send().expect(httpStatus.OK);

            /** @namespace res.body - HTTP response body */
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toEqual({
                id: expect.anything(),
                displayName: expect.anything(),
                email: expect.anything(),
                role: expect.anything(),
            });
        });

        test("should return 401 if access token is missing", async () => {
            await request(app).get("/v1/users").send().expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 403 if a non-admin is trying to access all users", async () => {
            await request(app).get("/v1/users").set("Authorization", `Bearer ${userAccessToken}`).send().expect(httpStatus.FORBIDDEN);
        });

        test("should correctly apply filter on email field", async () => {
            const res = await request(app)
                .get("/v1/users")
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .query({ email: user.email })
                .send()
                .expect(httpStatus.OK);

            /** @namespace res.body - HTTP response body */
            expect(res.body).toHaveLength(1);
            expect(res.body[0].id.toString()).toBe(user.id.toString());
        });

        test("should limit returned array if limit param is specified", async () => {
            const res = await request(app)
                .get("/v1/users")
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .query({ limit: 1 })
                .send()
                .expect(httpStatus.OK);

            /** @namespace res.body - HTTP response body */
            expect(res.body).toHaveLength(1);
        });

        test("should return the correct page if page and limit params are specified", async () => {
            const res = await request(app)
                .get("/v1/users")
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .query({ page: 2, limit: 1 })
                .send()
                .expect(httpStatus.OK);

            /** @namespace res.body - HTTP response body */
            expect(res.body).toHaveLength(1);
        });
    });

    describe("GET /v1/users/:id", () => {
        test("should return 200 and the user object if data is ok", async () => {
            // TODO support getting own user
            const res = await request(app)
                .get(`/v1/users/${user.id}`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send()
                .expect(httpStatus.OK);

            /** @namespace res.body - HTTP response body */
            expect(res.body).not.toHaveProperty("password");
            expect(res.body).toEqual({
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
            });
        });

        test("should return 401 error if access token is missing", async () => {
            await request(app).get(`/v1/users/${user._id}`).send().expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 403 error if user is trying to get another user", async () => {
            await request(app).get(`/v1/users/${admin.id}`).set("Authorization", `Bearer ${userAccessToken}`).send().expect(httpStatus.FORBIDDEN);
        });

        test("should return 200 and the user object if admin is trying to get another user", async () => {
            await request(app).get(`/v1/users/${user.id}`).set("Authorization", `Bearer ${adminAccessToken}`).send().expect(httpStatus.OK);
        });

        test("should return 400 error if userId is not a valid id", async () => {
            await request(app).get("/v1/users/invalidId").set("Authorization", `Bearer ${adminAccessToken}`).send().expect(httpStatus.BAD_REQUEST);
        });

        test("should return 404 error if user is not found", async () => {
            await request(app).get(`/v1/users/0`).set("Authorization", `Bearer ${adminAccessToken}`).send().expect(httpStatus.NOT_FOUND);
        });
    });

    describe("DELETE /v1/users/:id", () => {
        test("should return 204 if data is ok", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            await request(app)
                .delete(`/v1/users/${userOne.id}`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send()
                .expect(httpStatus.NO_CONTENT);

            let err;
            try {
                await userService.getUserById(userOne.id);
            } catch (error) {
                err = error;
            }
            expect(err).toBeDefined();
        });

        test("should return 401 error if access token is missing", async () => {
            await request(app).delete(`/v1/users/${user.id}`).send().expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 403 error if user is trying to delete another user", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            await request(app)
                .delete(`/v1/users/${userOne.id}`)
                .set("Authorization", `Bearer ${userAccessToken}`)
                .send()
                .expect(httpStatus.FORBIDDEN);
        });

        test("should return 204 if admin is trying to delete another user", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            await request(app)
                .delete(`/v1/users/${userOne.id}`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send()
                .expect(httpStatus.NO_CONTENT);
        });

        test("should return 400 error if userId is not a valid id", async () => {
            await request(app).delete("/v1/users/invalidId").set("Authorization", `Bearer ${adminAccessToken}`).send().expect(httpStatus.BAD_REQUEST);
        });

        test("should return 404 error if user already is not found", async () => {
            await request(app).delete(`/v1/users/0`).set("Authorization", `Bearer ${adminAccessToken}`).send().expect(httpStatus.NOT_FOUND);
        });
    });

    describe("PATCH /v1/users", () => {
        test("should return 200 and successfully update user if data is ok", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            userOne.displayName = userFixture.createFakeUser().displayName;
            userOne.email = userFixture.createFakeUser().email;
            userOne.password = userFixture.createFakeUser().password;

            const res = await request(app)
                .patch(`/v1/users`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export(true))
                .expect(httpStatus.OK);

            /** @namespace res.body - HTTP response body */
            expect(res.body).not.toHaveProperty("password");
            expect(res.body).toEqual({
                id: userOne.id,
                displayName: userOne.displayName,
                email: userOne.email,
                role: expect.anything(),
            });

            const dbUser = await userService.getUserById(userOne.id);
            expect(dbUser).toBeDefined();
            // TODO fix password hashing
            expect(dbUser.password).toBe(userOne.password);
            expect(dbUser).toMatchObject({ displayName: userOne.displayName, email: userOne.email, role: expect.anything() });
        });

        test("should return 401 error if access token is missing", async () => {
            await request(app).patch(`/v1/users`).send(user.export()).expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 403 if user is updating another user", async () => {
            await request(app).patch(`/v1/users`).set("Authorization", `Bearer ${userAccessToken}`).send(admin.export()).expect(httpStatus.FORBIDDEN);
        });

        test("should return 200 and successfully update user if admin is updating another user", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            userOne.displayName = userFixture.createFakeUser().displayName;

            await request(app).patch(`/v1/users`).set("Authorization", `Bearer ${adminAccessToken}`).send(userOne.export()).expect(httpStatus.OK);
        });

        test("should return 404 if admin is updating another user that is not found", async () => {
            const userOne = userFixture.createFakeUser();

            await request(app)
                .patch(`/v1/users}`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export())
                .expect(httpStatus.NOT_FOUND);
        });

        test("should return 400 if email is invalid", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            userOne.email = "invalidEmail";

            await request(app)
                .patch(`/v1/users`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export())
                .expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 if email is already taken", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            userOne.email = user.email;

            await request(app)
                .patch(`/v1/users`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export())
                .expect(httpStatus.BAD_REQUEST);
        });

        test("should not return 400 if email is my email", async () => {
            await request(app).patch(`/v1/users`).set("Authorization", `Bearer ${adminAccessToken}`).send(user.export()).expect(httpStatus.OK);
        });

        test("should return 400 if password length is less than 8 characters", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            // noinspection SpellCheckingInspection
            userOne.password = "passwo1";

            await request(app)
                .patch(`/v1/users`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export(true))
                .expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 if password does not contain both letters and numbers", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            // noinspection SpellCheckingInspection
            userOne.password = "password";

            await request(app)
                .patch(`/v1/users`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export(true))
                .expect(httpStatus.BAD_REQUEST);

            userOne.password = "11111111";

            await request(app)
                .patch(`/v1/users`)
                .set("Authorization", `Bearer ${adminAccessToken}`)
                .send(userOne.export(true))
                .expect(httpStatus.BAD_REQUEST);
        });
    });
});
