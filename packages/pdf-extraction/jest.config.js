module.exports = async () => {
  return {
    verbose: false,
    rootDir: ".",
    testEnvironment: "node",
    moduleFileExtensions: ["js"],
    moduleDirectories: ["node_modules"],
    testMatch: ["**/__tests__/unit/*.test.js"],
    maxWorkers: 1,
  };
};
