const { resolve } = require("path");

module.exports = {
  ignorePatterns: [
    "/*",
    "!src/",
  ],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:jsx-a11y/recommended",
    "@electron-toolkit/eslint-config-ts/recommended",
    "@electron-toolkit/eslint-config-prettier",
  ],
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      [resolve("./electron-vite-resolver.cjs")]: {
        viteConfigPath: "./electron.vite.config.cjs",
        // Turn on resolver logs by uncommenting this line
        // debug: true,
      },
    },
  },
  rules: {
    // General Rules
    camelcase: "warn",
    "sort-imports": [
      "error",
      {
        ignoreDeclarationSort: true,
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",

    // React Rules
    "react/button-has-type": "warn",
    "react/checked-requires-onchange-or-readonly": "warn",
    "react/function-component-definition": [
      "error",
      {
        unnamedComponents: "arrow-function",
        namedComponents: "function-declaration",
      },
    ],
    "react/hook-use-state": "warn",
    "react/jsx-boolean-value": "warn",
    "react/jsx-curly-newline": "warn",
    "react/jsx-no-useless-fragment": "error",
    "react/jsx-pascal-case": "warn",
    "react/no-array-index-key": "warn",
    "react/no-multi-comp": "warn",
    "react/void-dom-elements-no-children": "error",

    // React Hooks Rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // import Rules
    "import/no-deprecated": "warn",
    "import/no-empty-named-blocks": "error",
    "import/no-mutable-exports": "error",
    "import/no-unused-modules": "warn",
    "import/no-cycle": "error",
    "import/no-useless-path-segments": "error",
    "import/consistent-type-specifier-style": [
      "error",
      "prefer-inline"
    ],
    "import/first": "warn",
    "import/newline-after-import": [
      "warn",
      {
        count: 1,
        exactCount: true,
        considerComments: true,
      },
    ],
    "import/no-default-export": "error",

    // Import Sorting
    "import/order": [
      "warn",
      {
        "newlines-between": "never",
        distinctGroup: false,
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
        groups: [
          "builtin",
          "external",
          "internal",
          "sibling",
          "parent",
          "type",
          "index",
        ],
        pathGroups: [
          {
            pattern: "react",
            group: "external",
            position: "before",
          },
          {
            pattern: "~/**",
            group: "internal",
            position: "before",
          },
          {
            pattern: "$*",
            group: "internal",
            position: "before",
          },
        ],
        pathGroupsExcludedImportTypes: ["react"],
      },
    ],
  },
};
