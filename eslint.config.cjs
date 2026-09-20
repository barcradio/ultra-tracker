const { resolve } = require("path");
const toolkitPrettier = require("@electron-toolkit/eslint-config-prettier");
const toolkitTs = require("@electron-toolkit/eslint-config-ts");
const js = require("@eslint/js");
const importPlugin = require("eslint-plugin-import");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**", "out/**"]
  },
  ...toolkitTs.configs.recommended,
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  {
    plugins: {
      "react-hooks": reactHooks
    },
    rules: reactHooks.configs.recommended.rules
  },
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  jsxA11y.flatConfigs.recommended,
  {
    // TypeScript already checks undeclared identifiers and understands TS-only constructs
    // (enum members, interface/type params); the base rules produce false positives here.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      // Disabled: fires on the valid TS pattern of reusing an identifier across the
      // type and value namespaces (e.g. `interface Foo` + `const Foo = ...`).
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  },
  {
    settings: {
      react: {
        version: "detect"
      },
      "import/resolver": {
        [resolve("./electron-vite-resolver.cjs")]: {
          viteConfigPath: "./electron.vite.config.cjs"
        }
      }
    },
    rules: {
      camelcase: "warn",
      "sort-imports": [
        "error",
        {
          ignoreDeclarationSort: true
        }
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "react/button-has-type": "warn",
      "react/checked-requires-onchange-or-readonly": "warn",
      "react/function-component-definition": [
        "error",
        {
          unnamedComponents: "arrow-function",
          namedComponents: "function-declaration"
        }
      ],
      "react/hook-use-state": "warn",
      "react/jsx-boolean-value": "warn",
      "react/jsx-curly-newline": "warn",
      "react/jsx-no-useless-fragment": "error",
      "react/jsx-pascal-case": "warn",
      "react/no-array-index-key": "warn",
      "react/no-multi-comp": "warn",
      "react/void-dom-elements-no-children": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "import/no-deprecated": "warn",
      "import/no-empty-named-blocks": "error",
      "import/no-mutable-exports": "error",
      "import/no-unused-modules": "warn",
      "import/no-cycle": "error",
      "import/no-useless-path-segments": "error",
      "import/consistent-type-specifier-style": ["error", "prefer-inline"],
      "import/first": "warn",
      "import/newline-after-import": [
        "warn",
        {
          count: 1,
          exactCount: true,
          considerComments: true
        }
      ],
      "import/no-default-export": "error",
      "import/order": [
        "warn",
        {
          "newlines-between": "never",
          distinctGroup: false,
          alphabetize: {
            order: "asc",
            caseInsensitive: true
          },
          groups: ["builtin", "external", "internal", "sibling", "parent", "type", "index"],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before"
            },
            {
              pattern: "~/**",
              group: "internal",
              position: "before"
            },
            {
              pattern: "$*",
              group: "internal",
              position: "before"
            }
          ],
          pathGroupsExcludedImportTypes: ["react"]
        }
      ]
    }
  },
  toolkitPrettier
];
