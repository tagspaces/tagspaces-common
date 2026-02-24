const AppConfig = require("@tagspaces/tagspaces-common/AppConfig");

test("AppConfig", async () => {
  expect(AppConfig.metaFolder === ".ts").toBe(true);
  expect(AppConfig.metaFolderFile === "tsm.json").toBe(true);
});
