"use strict";

const path = require("path");
const fs = require("fs");

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 1 MB — request bodies are JSON with paths/config only

/**
 * Windows paths that bypass normal path semantics: the extended-length and
 * device namespaces (\\?\, \\.\) and UNC shares (\\server\share). None of
 * these is ever a legitimate target for indexing or thumbnailing, and the
 * first two defeat path normalization entirely.
 */
function isDeviceOrUncPath(p) {
  return /^[\\/]{2}/.test(p);
}

/**
 * Validate and canonicalize a file/directory path.
 *
 * Note what this does and does not do. It guarantees the returned path is
 * absolute, fully resolved, and free of symlink indirection -- so a caller
 * cannot have us normalize one path and then write through a link to another.
 * It does NOT constrain *which* directory may be touched: that is an
 * authorization decision and belongs to the main process, which knows the
 * user's configured locations. This function is the last line, not the first.
 *
 * @param {string} userPath - The path to validate
 * @returns {string} Canonical absolute path
 * @throws {Error} If path is invalid
 */
function validatePath(userPath) {
  if (!userPath || typeof userPath !== "string") {
    throw new Error("Path is required and must be a string");
  }

  if (userPath.indexOf("\0") !== -1) {
    throw new Error("Path must not contain null bytes");
  }

  if (isDeviceOrUncPath(userPath)) {
    throw new Error("UNC and device paths are not allowed");
  }

  // Require a genuinely absolute path. The previous implementation only warned
  // on relative input and then resolved it against the worker's cwd, which made
  // the target depend on where the process happened to be started.
  if (!path.isAbsolute(userPath)) {
    throw new Error("Path must be absolute");
  }

  // path.resolve collapses any ".." segments; a substring check for ".." was
  // both bypassable and wrong (it rejected legitimate names like "a..b").
  const resolved = path.resolve(userPath);

  // Canonicalize through any symlinks so later writes land where we checked.
  // The path may legitimately not exist yet (a .ts folder about to be created),
  // in which case we canonicalize the nearest existing ancestor instead.
  return realpathOrNearest(resolved);
}

function realpathOrNearest(resolved) {
  let current = resolved;
  const trailing = [];

  for (;;) {
    try {
      const real = fs.realpathSync(current);
      const candidate = path.join(real, ...trailing.reverse());
      if (isDeviceOrUncPath(candidate)) {
        throw new Error("Path resolves outside the local filesystem");
      }
      return candidate;
    } catch (e) {
      if (e && e.code !== "ENOENT") {
        throw e;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        // Reached the filesystem root without finding anything that exists.
        return resolved;
      }
      trailing.push(path.basename(current));
      current = parent;
    }
  }
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
  isDeviceOrUncPath,
  validatePaths,
  collectBody,
  safeJsonParse,
  sendError,
  MAX_BODY_SIZE,
};
