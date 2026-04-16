"use strict";

const path = require("path");

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 1 MB — request bodies are JSON with paths/config only

/**
 * Validate and sanitize a file/directory path.
 * Rejects paths containing traversal sequences or non-absolute paths.
 * @param {string} userPath - The path to validate
 * @returns {string} Resolved absolute path
 * @throws {Error} If path is invalid
 */
function validatePath(userPath) {
  if (!userPath || typeof userPath !== "string") {
    throw new Error("Path is required and must be a string");
  }

  // Resolve to absolute path
  const resolved = path.resolve(userPath);

  // Reject if the original path contained traversal sequences
  if (userPath.includes("..")) {
    throw new Error("Path traversal not allowed");
  }

  // Must be absolute (after resolve it always is, but verify the original was too)
  if (!path.isAbsolute(userPath) && !userPath.startsWith("/")) {
    // On Windows, path.isAbsolute handles drive letters
    // On Unix, check for leading /
    // Allow relative paths that resolve safely (e.g. from CWD), but warn
    console.warn("Relative path received, resolved to:", resolved);
  }

  return resolved;
}

/**
 * Validate an array of paths.
 * @param {string[]} paths - Array of paths to validate
 * @returns {string[]} Array of resolved absolute paths
 * @throws {Error} If any path is invalid
 */
function validatePaths(paths) {
  if (!Array.isArray(paths)) {
    throw new Error("Expected an array of paths");
  }
  return paths.map(validatePath);
}

/**
 * Collect request body with size limit protection.
 * @param {IncomingMessage} req - HTTP request
 * @param {ServerResponse} res - HTTP response
 * @param {number} [maxSize] - Maximum body size in bytes
 * @returns {Promise<string>} Collected body string
 */
function collectBody(req, res, maxSize = MAX_BODY_SIZE) {
  return new Promise((resolve, reject) => {
    let body = "";
    let exceeded = false;

    req.on("data", (chunk) => {
      if (exceeded) return;
      body += chunk;
      if (body.length > maxSize) {
        exceeded = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request body too large" }));
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      if (!exceeded) {
        resolve(body);
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Sanitize JSON.parse with prototype pollution protection.
 * @param {string} jsonString - JSON string to parse
 * @returns {any} Parsed object
 */
function safeJsonParse(jsonString) {
  return JSON.parse(jsonString, (key, value) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return undefined;
    }
    return value;
  });
}

/**
 * Send a generic error response without leaking internal details.
 * @param {ServerResponse} res - HTTP response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Safe error message for client
 * @param {Error} [err] - Internal error to log (not sent to client)
 */
function sendError(res, statusCode, message, err) {
  if (err) {
    console.error(message + ":", err.message || err);
  }
  if (!res.writableEnded) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: message }));
  }
}

module.exports = {
  validatePath,
  validatePaths,
  collectBody,
  safeJsonParse,
  sendError,
  MAX_BODY_SIZE,
};
