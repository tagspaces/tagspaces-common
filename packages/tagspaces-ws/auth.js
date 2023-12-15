const jwt = require("jsonwebtoken");

function verifyAuth(token, res) {
  if (!token) {
    console.error("No Auth header provided!");
  } else {
    try {
      const PREFIX = "Bearer ";
      if (token.startsWith(PREFIX)) {
        token = token.slice(PREFIX.length);
      }
      const decoded = jwt.verify(token, key);
      if (decoded) {
        return true;
      }
    } catch (err) {
      console.error(err);
    }
  }
  res.statusCode = 401;
  res.end();
  return false;
}

module.exports = {
  verifyAuth,
};
