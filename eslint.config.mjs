import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const eslintConfig = [
  // Global ignores
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  // Base TS/JS config
  {
    name: "pawchive/base",
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  // Next.js recommended + core-web-vitals flat configs (ESLint 10 compatible)
  nextPlugin.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
  // TypeScript ESLint recommended (not strict-type-checked — too noisy for this project)
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  {
    name: "pawchive/ts-parser",
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React hooks
  {
    name: "pawchive/react-hooks",
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      // Hydration from localStorage is an intentional sync-from-external-system pattern
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Project-specific overrides
  {
    name: "pawchive/overrides",
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // img element is intentional — Next.js Image optimization is off for external CDN
      "@next/next/no-img-element": "off",
      // Catch blocks use `any` for practical error handling
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow inline type assertions where TypeScript inference is insufficient
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
];

export default eslintConfig;
