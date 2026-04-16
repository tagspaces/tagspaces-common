module.exports = async () => {
  return {
    verbose: false,
    rootDir: ".",
    testEnvironment: "node",
    moduleFileExtensions: ["js"],
    moduleDirectories: ["node_modules"],
    testMatch: ["**/*.test.js"],
    maxWorkers: 1,
  };
};
