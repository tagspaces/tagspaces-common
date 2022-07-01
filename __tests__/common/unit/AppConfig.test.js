/* const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../common/default.env"),
  override: false,
  debug: true,
}); */
const AppConfig = require("../../../common/AppConfig");

test("AppConfig", async () => {
  expect(AppConfig.metaFolder === ".ts").toBe(true);
  expect(AppConfig.metaFolderFile === "tsm.json").toBe(true);
});
