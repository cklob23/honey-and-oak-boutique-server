const bcrypt = require("bcryptjs");

/**
 * Hash a password securely using bcrypt.
 * @param {string} password - Plain text password.
 * @returns {Promise<string>} - Hashed password.
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

/**
 * Verify a password against a bcrypt hash.
 * @param {string} password - Plain text password.
 * @param {string} hash - Stored bcrypt hash.
 * @returns {Promise<boolean>} - True if match, else false.
 */
const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

module.exports = {
    hashPassword,
    verifyPassword
}