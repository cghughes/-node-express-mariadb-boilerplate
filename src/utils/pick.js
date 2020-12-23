/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */
const pick = (object, keys) => {
    return keys.reduce((obj, key) => {
        if (object && Object.prototype.hasOwnProperty.call(object, key)) {
            // eslint-disable-next-line no-param-reassign
            obj[key] = object[key];
        }
        return obj;
    }, {});
};

/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @param {string} key
 * @param {string} result - default result
 * @returns {string}
 */
const pickString = (object, key, result = "%") => {
    let obj = result;
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
        // eslint-disable-next-line no-param-reassign
        obj = object[key];
        if (obj) {
            obj = obj.toString();
        }
    }
    return obj;
};

/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @returns {Object}
 */
const pickOptions = (object) => {
    const keys = ["sortBy", "page", "limit"];

    const options = keys.reduce((obj, key) => {
        if (object && Object.prototype.hasOwnProperty.call(object, key)) {
            // eslint-disable-next-line no-param-reassign
            obj[key] = object[key];
        }
        return obj;
    }, {});

    if (!options["sortBy"]) {
        options["sortBy"] = "";
    }

    if (!options["page"]) {
        options["page"] = 0;
    }

    if (!options["limit"]) {
        options["limit"] = 1000;
    }

    return options;
};

module.exports = {
    pick,
    pickString,
    pickOptions,
};
