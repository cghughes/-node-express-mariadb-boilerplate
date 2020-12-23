// const bcrypt = require("bcryptjs");
const faker = require("faker");
const User = require("../../src/models/user.model");

// TODO fix password hashing
// const password = "password1";
// const salt = bcrypt.genSaltSync(8);
// const hashedPassword = bcrypt.hashSync(password, salt);

const createFakeUser = (admin = false) => {
    const user = new User();
    user.displayName = faker.name.findName();
    user.email = faker.internet.email().toLowerCase();
    user.password = faker.internet.password();
    if (admin) {
        user.role = "admin";
    }

    return user;
};

module.exports = {
    createFakeUser,
};
