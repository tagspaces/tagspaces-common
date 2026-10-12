"use strict";

const path = require("path");
const fs = require("fs");

// Windows device namespaces: \\?\ (extended-length) and \\.\ (devices), in
// either slash flavour since Windows accepts both. These defeat path
// normalization entirely -- \\?\ skips "..", relative and length handling, and
// \\.\ addresses raw devices like \\.\PhysicalDrive0 -- so neither is ever a
// legitimate target for indexing or thumbnailing.
//
// Note what this deliberately does NOT match: a plain UNC share such as
// \\server\share\Photos. That is just a remote filesystem, a Windows user can
// pick one in the directory picker, and it worked before this validation
// existed. Rejecting it broke network-share locations. On POSIX a backslash is
// an ordinary filename character, so these forms are not absolute paths there
// and get rejected by the isAbsolute check instead.
const DEVICE_NAMESPACE = /^[\\/]{2}[?.][\\/]/;

function isDeviceNamespacePath(p) {
  return DEVICE_NAMESPACE.test(p);
}

/**
 * Windows realpath can hand back an extended-length path (\\?\C:\x, or
 * \\?\UNC\server\share) when a path is long. Convert it back to the
 * conventional form instead of rejecting it, so long paths keep working.
 */
function normalizeExtendedLengthPath(p) {
  if (!/^[\\/]{2}\?[\\/]/.test(p)) {
    return p;
  }
  const rest = p.slice(4);
  if (/^UNC[\\/]/i.test(rest)) {
    // \\?\UNC\server\share -> \\server\share
    return "\\\\" + rest.slice(4);
  }
  return rest;
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

  if (isDeviceNamespacePath(userPath)) {
    throw new Error("Device paths are not allowed");
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
      return normalizeExtendedLengthPath(candidate);
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

module.exports = {
  validatePath,
  validatePaths,
  isDeviceNamespacePath,
  normalizeExtendedLengthPath,
};
