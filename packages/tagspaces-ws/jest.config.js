// jest.config.js
export default {
  preset: "ts-jest",
  testEnvironment: "node", // or 'jsdom' if you're testing browser code
  testPathIgnorePatterns: ["/node_modules/", "/build/"], // ignore these paths
  moduleFileExtensions: ["ts", "js", "json", "node"], // file extensions to consider
  transform: {
    "^.+\\.ts$": "ts-jest", // use ts-jest for TypeScript files
  },
};
