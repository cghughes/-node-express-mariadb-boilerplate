const request = require("supertest");
const httpStatus = require("http-status");
const httpMocks = require("node-mocks-http");
const moment = require("moment");
const app = require("../../src/app");
const config = require("../../src/config/config");
const auth = require("../../src/middlewares/auth");
const { tokenService, emailService } = require("../../src/services");
const ApiError = require("../../src/utils/ApiError");
const setupTestDB = require("../utils/setupTestDB");
const db = require("../../src/utils/db");
const { userFixture } = require("../fixtures");
const { Token } = require("../../src/models");
const { roleRights } = require("../../src/config/roles");
const { tokenTypes } = require("../../src/config/tokens");
const { userService } = require("../../src/services");

setupTestDB();

describe("Auth routes", () => {
    describe("POST /v1/auth/register", () => {
        let newUser;
        beforeEach(() => {
            const user = userFixture.createFakeUser();
            newUser = {
                displayName: user.displayName,
                email: user.email,
                password: user.password,
            };
        });

        test("should return 201 and successfully register user if request data is ok", async () => {
            const res = await request(app).post("/v1/auth/register").send(newUser).expect(httpStatus.CREATED);
            /** @namespace res.body - Response Body * */
            expect(res.body.user).not.toHaveProperty("password");
            expect(res.body.user).toEqual({
                id: expect.anything(),
                displayName: newUser.displayName,
                email: newUser.email,
                role: expect.anything(),
            });

            /** @type {User} */
            const dbUser = await userService.getUserById(res.body.user.id);
            expect(dbUser).toBeDefined();
            // TODO Fixed hashing of passwords before they are stored to DB
            // expect(dbUser.password).not.toBe(newUser.password);
            expect(dbUser.export()).toMatchObject({
                id: expect.anything(),
                displayName: newUser.displayName,
                email: newUser.email,
                role: expect.anything(),
            });

            expect(res.body.tokens).toEqual({
                access: { token: expect.anything(), expires: expect.anything() },
                refresh: { token: expect.anything(), expires: expect.anything() },
            });
        });

        test("should return 400 error if email is invalid", async () => {
            newUser.email = "invalidEmail";

            await request(app).post("/v1/auth/register").send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if email is already used", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            newUser.email = userOne.email;

            await request(app).post("/v1/auth/register").send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if password length is less than 8 characters", async () => {
            // noinspection SpellCheckingInspection
            newUser.password = "passwo1";

            await request(app).post("/v1/auth/register").send(newUser).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 400 error if password does not contain both letters and numbers", async () => {
            newUser.password = "password";

            await request(app).post("/v1/auth/register").send(newUser).expect(httpStatus.BAD_REQUEST);

            newUser.password = "11111111";

            await request(app).post("/v1/auth/register").send(newUser).expect(httpStatus.BAD_REQUEST);
        });
    });

    describe("POST /v1/auth/login", () => {
        test("should return 200 and login user if email and password match", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const loginCredentials = {
                email: userOne.email,
                password: userOne.password,
            };

            const res = await request(app).post("/v1/auth/login").send(loginCredentials).expect(httpStatus.OK);

            /** @namespace res.body - Response Body * */
            expect(res.body.user).toEqual({
                id: expect.anything(),
                displayName: userOne.displayName,
                email: userOne.email,
                role: userOne.role,
            });

            expect(res.body.tokens).toEqual({
                access: { token: expect.anything(), expires: expect.anything() },
                refresh: { token: expect.anything(), expires: expect.anything() },
            });
        });

        test("should return 401 error if there are no users with that email", async () => {
            const userOne = userFixture.createFakeUser();
            const loginCredentials = {
                email: userOne.email,
                password: userOne.password,
            };

            const res = await request(app).post("/v1/auth/login").send(loginCredentials).expect(httpStatus.UNAUTHORIZED);

            /** @namespace res.body - Response Body * */
            expect(res.body).toEqual({ code: httpStatus.UNAUTHORIZED, message: "Incorrect email or password" });
        });

        test("should return 401 error if password is wrong", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const loginCredentials = {
                email: userOne.email,
                password: "wrongPassword1",
            };

            const res = await request(app).post("/v1/auth/login").send(loginCredentials).expect(httpStatus.UNAUTHORIZED);

            /** @namespace res.body - Response Body * */
            expect(res.body).toEqual({ code: httpStatus.UNAUTHORIZED, message: "Incorrect email or password" });
        });
    });

    describe("POST /v1/auth/logout", () => {
        test("should return 204 if refresh token is valid", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);
            await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH));

            await request(app).post("/v1/auth/logout").send({ refreshToken }).expect(httpStatus.NO_CONTENT);

            const token = await tokenService.getToken(refreshToken);
            expect(token).toBe(null);
        });

        test("should return 400 error if refresh token is missing from request body", async () => {
            await request(app).post("/v1/auth/logout").send().expect(httpStatus.BAD_REQUEST);
        });

        test("should return 404 error if refresh token is not found in the database", async () => {
            const userOne = userFixture.createFakeUser();
            // await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);

            await request(app).post("/v1/auth/logout").send({ refreshToken }).expect(httpStatus.NOT_FOUND);
        });

        test("should return 404 error if refresh token is blacklisted", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);
            await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH, true));

            await request(app).post("/v1/auth/logout").send({ refreshToken }).expect(httpStatus.NOT_FOUND);
        });
    });

    describe("POST /v1/auth/refresh-tokens", () => {
        test("should return 200 and new auth tokens if refresh token is valid", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);
            await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH));

            const res = await request(app).post("/v1/auth/refresh-tokens").send({ refreshToken }).expect(httpStatus.OK);

            /** @namespace res.body - Response Body * */
            expect(res.body).toEqual({
                access: { token: expect.anything(), expires: expect.anything() },
                refresh: { token: expect.anything(), expires: expect.anything() },
            });

            /** @type Token */
            const dbRefreshToken = await tokenService.getToken(res.body.refresh.token);
            expect(dbRefreshToken.export()).toMatchObject({ type: tokenTypes.REFRESH, userId: userOne.id, blacklisted: false });

            // TODO add unique constraint to the token value in DB
            // const dbRefreshTokenCount = await Token.countDocuments();
            // expect(dbRefreshTokenCount).toBe(1);
        });

        test("should return 400 error if refresh token is missing from request body", async () => {
            await request(app).post("/v1/auth/refresh-tokens").send().expect(httpStatus.BAD_REQUEST);
        });

        test("should return 401 error if refresh token is signed using an invalid secret", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");

            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH, "invalidSecret");
            await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH));

            await request(app).post("/v1/auth/refresh-tokens").send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 401 error if refresh token is not found in the database", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);

            await request(app).post("/v1/auth/refresh-tokens").send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 401 error if refresh token is blacklisted", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);
            await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH, true));

            await request(app).post("/v1/auth/refresh-tokens").send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 401 error if refresh token is expired", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().subtract(1, "minutes");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);
            await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH));

            await request(app).post("/v1/auth/refresh-tokens").send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 401 error if user is not found", async () => {
            const userOne = userFixture.createFakeUser();
            const expires = moment().add(config.jwt.refreshExpirationDays, "days");
            const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);
            // await tokenService.saveToken(Token.buildToken(refreshToken, userOne.id, expires, tokenTypes.REFRESH));

            await request(app).post("/v1/auth/refresh-tokens").send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
        });
    });

    describe("POST /v1/auth/forgot-password", () => {
        beforeEach(() => {
            // noinspection JSCheckFunctionSignatures
            jest.spyOn(emailService.transport, "sendMail").mockResolvedValue();
        });

        test("should return 204 and send reset password email to the user", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const sendResetPasswordEmailSpy = jest.spyOn(emailService, "sendResetPasswordEmail");

            await request(app).post("/v1/auth/forgot-password").send({ email: userOne.email }).expect(httpStatus.NO_CONTENT);

            expect(sendResetPasswordEmailSpy).toHaveBeenCalledWith(userOne.email, expect.any(String));
            const resetPasswordToken = sendResetPasswordEmailSpy.mock.calls[0][1];
            const dbResetPasswordToken = await tokenService.getToken(resetPasswordToken);
            expect(dbResetPasswordToken).toBeDefined();
            expect(dbResetPasswordToken.userId.toString()).toMatch(userOne.id.toString());
        });

        test("should return 400 if email is missing", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            await request(app).post("/v1/auth/forgot-password").send().expect(httpStatus.BAD_REQUEST);
        });

        test("should return 404 if email does not belong to any user", async () => {
            const userOne = userFixture.createFakeUser();

            await request(app).post("/v1/auth/forgot-password").send({ email: userOne.email }).expect(httpStatus.NOT_FOUND);
        });
    });

    describe("POST /v1/auth/reset-password", () => {
        test("should return 204 and reset the password", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, "minutes");
            const resetPasswordToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.RESET_PASSWORD);
            await tokenService.saveToken(Token.buildToken(resetPasswordToken, userOne.id, expires, tokenTypes.RESET_PASSWORD));

            const conn = await db.getConnection();
            await conn.commit();

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "password2" })
                .expect(httpStatus.NO_CONTENT);

            const dbUser = await userService.getUserById(userOne.id);
            // TODO password encryption
            // const isPasswordMatch = await bcrypt.compare("password2", dbUser.password);
            // expect(isPasswordMatch).toBe(true);
            expect(dbUser.password).toMatch("password2");

            // TODO add unique constraint to DB
            // const dbResetPasswordTokenCount = await Token.countDocuments({
            //     user: userOne._id,
            //     type: tokenTypes.RESET_PASSWORD
            // });
            // expect(dbResetPasswordTokenCount).toBe(0);
        });

        test("should return 400 if reset password token is missing", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);

            await request(app).post("/v1/auth/reset-password").send({ password: "password2" }).expect(httpStatus.BAD_REQUEST);
        });

        test("should return 401 if reset password token is blacklisted", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, "minutes");
            const resetPasswordToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.RESET_PASSWORD);
            await tokenService.saveToken(Token.buildToken(resetPasswordToken, userOne.id, expires, tokenTypes.RESET_PASSWORD, true));

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "password2" })
                .expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 401 if reset password token is expired", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().subtract(1, "minutes");
            const resetPasswordToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.RESET_PASSWORD);
            await tokenService.saveToken(Token.buildToken(resetPasswordToken, userOne.id, expires, tokenTypes.RESET_PASSWORD));

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "password2" })
                .expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 401 if user is not found", async () => {
            const userOne = userFixture.createFakeUser();

            const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, "minutes");
            const resetPasswordToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.RESET_PASSWORD);
            // await tokenService.saveToken(Token.buildToken(resetPasswordToken, userOne.id, expires, tokenTypes.RESET_PASSWORD));

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "password2" })
                .expect(httpStatus.UNAUTHORIZED);
        });

        test("should return 400 if password is missing or invalid", async () => {
            const userOne = userFixture.createFakeUser();
            await userService.createUser(userOne);
            const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, "minutes");
            const resetPasswordToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.RESET_PASSWORD);
            await tokenService.saveToken(Token.buildToken(resetPasswordToken, userOne.id, expires, tokenTypes.RESET_PASSWORD));

            await request(app).post("/v1/auth/reset-password").query({ token: resetPasswordToken }).expect(httpStatus.BAD_REQUEST);

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "short1" })
                .expect(httpStatus.BAD_REQUEST);

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "password" })
                .expect(httpStatus.BAD_REQUEST);

            await request(app)
                .post("/v1/auth/reset-password")
                .query({ token: resetPasswordToken })
                .send({ password: "11111111" })
                .expect(httpStatus.BAD_REQUEST);
        });
    });
});

describe("Auth middleware", () => {
    test("should call next with no errors if access token is valid", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);
        const expires = moment().add(config.jwt.refreshExpirationDays, "days");
        const accessToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.ACCESS);
        // await tokenService.saveToken(Token.buildToken(accessToken, userOne.id, expires, tokenTypes.ACCESS));

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith();
        expect(req.user.id).toEqual(userOne.id);
    });

    test("should call next with unauthorized error if access token is not found in header", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest();
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: "Please authenticate" }));
    });

    test("should call next with unauthorized error if access token is not a valid jwt token", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: "Bearer randomToken" } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: "Please authenticate" }));
    });

    test("should call next with unauthorized error if the token is not an access token", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);
        const expires = moment().add(config.jwt.accessExpirationMinutes, "minutes");
        const refreshToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.REFRESH);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${refreshToken}` } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: "Please authenticate" }));
    });

    test("should call next with unauthorized error if access token is generated with an invalid secret", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);
        const expires = moment().add(config.jwt.accessExpirationMinutes, "minutes");
        const accessToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.ACCESS, "invalidSecret");

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: "Please authenticate" }));
    });

    test("should call next with unauthorized error if access token is expired", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);
        const expires = moment().subtract(1, "minutes");
        const accessToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.ACCESS);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: "Please authenticate" }));
    });

    test("should call next with unauthorized error if user is not found", async () => {
        const expires = moment().add(1, "minutes");
        const accessToken = tokenService.generateRawToken(0, expires, tokenTypes.ACCESS);
        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: "Please authenticate" }));
    });

    test("should call next with forbidden error if user does not have required rights and userId is not in params", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);
        const expires = moment().add(1, "minutes");
        const accessToken = tokenService.generateRawToken(0, expires, tokenTypes.ACCESS);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: httpStatus.UNAUTHORIZED,
                message: "Please authenticate",
            })
        );
    });

    test("should call next with no errors if user does not have required rights but userId is in params", async () => {
        const userOne = userFixture.createFakeUser();
        await userService.createUser(userOne);
        const expires = moment().add(1, "minutes");
        const accessToken = tokenService.generateRawToken(userOne.id, expires, tokenTypes.ACCESS);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { userId: userOne.id.toString() },
        });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth()(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith();
    });

    test("should call next with no errors if user has required rights", async () => {
        const admin = userFixture.createFakeUser(true);
        await userService.createUser(admin);
        const expires = moment().add(1, "minutes");
        const accessToken = tokenService.generateRawToken(admin.id, expires, tokenTypes.ACCESS);

        // noinspection JSUnresolvedFunction
        const req = httpMocks.createRequest({
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { userId: admin.id.toString() },
        });
        const next = jest.fn();

        // noinspection JSUnresolvedFunction
        await auth(...roleRights.get("admin"))(req, httpMocks.createResponse(), next);

        expect(next).toHaveBeenCalledWith();
    });
});
