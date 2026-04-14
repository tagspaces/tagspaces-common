module.exports = async () => {
  return {
    verbose: false,
    rootDir: ".",
    globalSetup: "../../scripts/S3rverStart.js",
    globalTeardown: "../../scripts/S3rverStop.js",
    testEnvironment: "node",
    moduleNameMapper: {
      "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
        "../../__tests__/internals/mocks/fileMock.js",
      "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    },
    moduleFileExtensions: ["js"],
    moduleDirectories: ["node_modules"],
    testMatch: ["**/*.test.js"],
    maxWorkers: 1,
  };
};
