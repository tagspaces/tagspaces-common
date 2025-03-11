import * as reactHooks from 'eslint-plugin-react-hooks';

export default [
  /*{
    features: {
    tooling: true,
        // Enable TypeScript support
        typescript: true
},
// Add TypeScript-specific configuration
typescript: {
    parserOptions: {
        parser: '@typescript-eslint/parser',
            sourceType: 'module',
            extraFileExtensions: ['.ts','tsx']
    }
}},*/
  /*{
        parser: "@typescript-eslint/parser",
        parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
        },
        extends: [
            "plugin:@typescript-eslint/recommended",
            "plugin:prettier/recommended"
        ],
        rules: {
            "@typescript-eslint/explicit-module-boundary-types": "off"
        }
    },*/
  reactHooks.configs['recommended-latest']
];
