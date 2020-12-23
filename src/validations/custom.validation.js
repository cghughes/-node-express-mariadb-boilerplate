const objectId = (value, helpers) => {
    // if (!value.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)) {
    if (!value.match(/^[0-9]+$/)) {
        return helpers.message('"{{#label}}" must be a valid id');
    }
    return value;
};

const password = (value, helpers) => {
    if (value.length < 8) {
        return helpers.message("password must be at least 8 characters");
    }
    if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
        return helpers.message("password must contain at least 1 letter and 1 number");
    }
    return value;
};

module.exports = {
    objectId,
    password,
};
