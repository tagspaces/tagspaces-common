module.exports = async () => {
  return {
    verbose: false,
    rootDir: "./__tests__",
    /**
     * globalSetup: ran once before all tests
     *
     * https://jestjs.io/docs/en/configuration#globalsetup-string
     */
    globalSetup: "../scripts/S3rverStart.js",
    /**
     * globalTeardown: ran once after all tests
     *
     * https://jestjs.io/docs/en/configuration#globalteardown-string
     */
    globalTeardown: "../scripts/S3rverStop.js",
    moduleNameMapper: {
      "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
        "<rootDir>/internals/mocks/fileMock.js",
      "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    },
    moduleFileExtensions: ["js"],
    moduleDirectories: ["node_modules"],
    testMatch: ["**/unit/*.test.js"],
    maxWorkers: 1,
  };
};
