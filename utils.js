// utils.js
const fs = require('fs');

const Logger = {
    info: (msg) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
    error: (msg, err) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, err),
};

// Centralized cleanup for any lingering temp files
const cleanupTempFiles = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            Logger.info(`Cleaned up: ${filePath}`);
        } catch (e) {
            Logger.error("Failed to delete temp file:", e);
        }
    }
};

// Exponential backoff helper for API calls
const retry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 0) throw err;
        await new Promise(res => setTimeout(res, delay));
        return retry(fn, retries - 1, delay * 2);
    }
};

module.exports = { Logger, cleanupTempFiles, retry };
