"use strict";

const jwt = require("jsonwebtoken");

// Claims the main process is required to assert. They exist so a token minted
// for one purpose cannot be replayed against another: `sub` pins a token to a
// single endpoint, and the short `maxAge` keeps a captured token from being
// reusable later. See mintWsToken() in the app's src/main/wsAuth.ts.
const ISSUER = "tagspaces-main";
const AUDIENCE = "tagspaces-ws";
// Generous enough for a slow spawn, far below the lifetime of the process.
const MAX_AGE_SECONDS = 120;
const CLOCK_TOLERANCE_SECONDS = 5;
const PREFIX = "Bearer ";

/**
 * Verify the Authorization header of a request.
 *
 * Unlike a bare jwt.verify() this pins the algorithm (so the token cannot
 * choose its own), requires issuer/audience/expiry, and requires `sub` to name
 * the endpoint being called.
 *
 * @param {string|undefined} token - raw Authorization header value
 * @param {ServerResponse} res
 * @param {string|undefined} key - HMAC key this server was started with
 * @param {string} expectedSub - pathname the token must have been minted for
 * @returns {boolean} true when the request may proceed; otherwise 401 is sent
 */
function verifyAuth(token, res, key, expectedSub) {
  try {
    if (!key) {
      throw new Error("no signing key configured");
    }
    if (!token || typeof token !== "string" || !token.startsWith(PREFIX)) {
      throw new Error("missing or malformed Authorization header");
    }
    const decoded = jwt.verify(token.slice(PREFIX.length), key, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      maxAge: MAX_AGE_SECONDS,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    if (!decoded || decoded.sub !== expectedSub) {
      throw new Error("token subject does not match the requested endpoint");
    }
    return true;
  } catch (err) {
    // Log the reason but never return it: the client learns only "401".
    console.error("Auth rejected:", err.message);
    if (!res.writableEnded) {
      res.statusCode = 401;
      res.end();
    }
    return false;
  }
}

module.exports = {
  verifyAuth,
  ISSUER,
  AUDIENCE,
  MAX_AGE_SECONDS,
};
