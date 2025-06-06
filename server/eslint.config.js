import prettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tslint from 'typescript-eslint';

/**********************************************************************************/

// Export the relevant rules for the relevant folders
export default tslint.config({
  files: ['src/**/*.ts', 'eslint.config.js'],
  plugins: {
    '@typescript-eslint': tslint.plugin,
    '@security': security,
  },
  extends: [prettier],
  languageOptions: {
    globals: {
      ...globals.builtin,
      ...globals.node,
      ...globals.es2025,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tslint.parser,
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: 'error',
    reportUnusedInlineConfigs: 'error',
  },
  rules: {
    // JavaScript
    'array-callback-return': ['error', { checkForEach: true }],
    'constructor-super': 'error',
    'for-direction': 'error',
    'getter-return': 'error',
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'error',
    'no-class-assign': 'error',
    'no-compare-neg-zero': 'error',
    'no-cond-assign': 'error',
    'no-const-assign': 'error',
    'no-constant-binary-expression': 'error',
    'no-constant-condition': 'error',
    'no-constructor-return': 'error',
    'no-control-regex': 'error',
    'no-debugger': 'error',
    'no-dupe-args': 'error',
    'no-dupe-class-members': 'error',
    'no-dupe-else-if': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-duplicate-imports': ['error', { includeExports: true }],
    'no-empty-character-class': 'error',
    'no-empty-pattern': 'error',
    'no-ex-assign': 'error',
    'no-func-assign': 'error',
    'no-import-assign': 'error',
    'no-inner-declarations': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-loss-of-precision': 'error',
    'no-misleading-character-class': 'error',
    'no-new-native-nonconstructor': 'error',
    'no-obj-calls': 'error',
    'no-promise-executor-return': 'error',
    'no-prototype-builtins': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-setter-return': 'error',
    'no-sparse-arrays': 'error',
    'no-template-curly-in-string': 'error',
    'no-this-before-super': 'error',
    'no-unexpected-multiline': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unused-private-class-members': 'error',
    'no-unused-vars': [
      'error',
      { args: 'after-used', ignoreRestSiblings: true },
    ],
    // 'no-use-before-define': ['error', { functions: false }], // Uncomment if using javascript
    'no-useless-backreference': 'error',
    'require-atomic-updates': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    'arrow-body-style': ['error', 'always'],
    complexity: 'error',
    'consistent-return': 'error',
    curly: 'error',
    'default-case-last': 'error',
    // 'default-param-last': 'error', // Uncomment if using javascript
    // 'dot-notation': 'error', // Uncomment if using javascript
    eqeqeq: 'error',
    'guard-for-in': 'error',
    // 'init-declarations': ['error', 'always'], // Uncomment if using javascript
    'max-depth': ['error', 4],
    // 'max-params': ['error', { max: 4 }], // Uncomment if using javascript
    // 'no-array-constructor': 'error', // Uncomment if using javascript
    'no-caller': 'error',
    'no-case-declarations': 'error',
    'no-delete-var': 'error',
    'no-else-return': 'error',
    'no-empty': 'error',
    // 'no-empty-function': 'error', // Uncomment if using javascript
    'no-empty-static-block': 'error',
    'no-eq-null': 'error',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-boolean-cast': 'error',
    'no-extra-label': 'error',
    'no-global-assign': 'error',
    'no-implicit-coercion': ['error', { allow: ['!!'] }],
    // 'no-implied-eval': 'error', // Uncomment if using javascript
    'no-invalid-this': 'error',
    'no-iterator': 'error',
    'no-label-var': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-lonely-if': 'error',
    // 'no-loop-func': 'error', // Uncomment if using javascript
    'no-multi-assign': 'error',
    'no-nested-ternary': 'error',
    'no-new-wrappers': 'error',
    'no-nonoctal-decimal-escape': 'error',
    'no-object-constructor': 'error',
    'no-param-reassign': 'error',
    'no-proto': 'error',
    'no-redeclare': 'error',
    'no-regex-spaces': 'error',
    'no-return-assign': ['error', 'always'],
    'no-sequences': 'error',
    // 'no-throw-literal': 'error', // Uncomment if using javascript
    'no-unneeded-ternary': 'error',
    // 'no-unused-expressions': 'error', // Uncomment if using javascript
    'no-useless-call': 'error',
    'no-useless-catch': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    // 'no-useless-constructor': 'error', // Uncomment if using javascript
    'no-useless-escape': 'error',
    'no-useless-rename': 'error',
    'no-useless-return': 'error',
    'no-with': 'error',
    'prefer-const': 'error',
    // 'prefer-destructuring': ['error', { array: false, object: true }], // Uncomment if using javascript
    'prefer-object-spread': 'error',
    // 'prefer-promise-reject-errors': 'error', // Uncomment if using javascript
    'prefer-template': 'error',
    // 'require-await': 'error', // Uncomment if using javascript
    'require-yield': 'error',

    // Typescript (Remove this section if you are using JavaScript)
    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    '@typescript-eslint/ban-tslint-comment': 'error',
    '@typescript-eslint/consistent-generic-constructors': 'error',
    '@typescript-eslint/consistent-indexed-object-style': [
      'error',
      'index-signature',
    ],
    '@typescript-eslint/consistent-type-assertions': 'error',
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/consistent-type-exports': [
      'error',
      { fixMixedExportsWithInlineTypeSpecifier: true },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        disallowTypeAnnotations: false,
        fixStyle: 'inline-type-imports',
        prefer: 'type-imports',
      },
    ],
    // Note: you must disable the base rule as it can report incorrect errors
    'default-param-last': 'off',
    '@typescript-eslint/default-param-last': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'dot-notation': 'off',
    '@typescript-eslint/dot-notation': 'error',
    '@typescript-eslint/explicit-member-accessibility': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'init-declarations': 'off',
    '@typescript-eslint/init-declarations': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'max-params': 'off',
    '@typescript-eslint/max-params': ['error', { max: 4 }],
    '@typescript-eslint/method-signature-style': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-array-constructor': 'off',
    '@typescript-eslint/no-array-constructor': 'error',
    '@typescript-eslint/no-array-delete': 'error',
    '@typescript-eslint/no-base-to-string': 'error',
    '@typescript-eslint/no-confusing-non-null-assertion': 'error',
    '@typescript-eslint/no-confusing-void-expression': 'error',
    '@typescript-eslint/no-deprecated': 'error',
    '@typescript-eslint/no-duplicate-enum-values': 'error',
    '@typescript-eslint/no-duplicate-type-constituents': 'error',
    '@typescript-eslint/no-dynamic-delete': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-extra-non-null-assertion': 'error',
    '@typescript-eslint/no-extraneous-class': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-for-in-array': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-implied-eval': 'off',
    '@typescript-eslint/no-implied-eval': 'error',
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-invalid-void-type': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-loop-func': 'off',
    '@typescript-eslint/no-loop-func': 'error',
    '@typescript-eslint/no-meaningless-void-operator': 'error',
    '@typescript-eslint/no-misused-new': 'error',
    // Disables checking an asynchronous function returned in a function whose return type is a function that returns `void`.
    // Mainly used for async event handlers
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { arguments: false } },
    ],
    '@typescript-eslint/no-mixed-enums': 'error',
    '@typescript-eslint/no-namespace': 'error',
    '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    '@typescript-eslint/no-redundant-type-constituents': 'error',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-this-alias': 'error',
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/no-unnecessary-template-expression': 'error',
    '@typescript-eslint/no-unnecessary-type-arguments': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unnecessary-type-constraint': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-declaration-merging': 'error',
    '@typescript-eslint/no-unsafe-enum-comparison': 'error',
    '@typescript-eslint/no-unsafe-function-type': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-unary-minus': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    // Note: you must disable the base rule as it can report incorrect errors
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/no-useless-empty-export': 'error',
    '@typescript-eslint/no-wrapper-object-types': 'error',
    '@typescript-eslint/non-nullable-type-assertion-style': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-throw-literal': 'off',
    '@typescript-eslint/only-throw-error': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'prefer-destructuring': 'off',
    '@typescript-eslint/prefer-destructuring': [
      'error',
      { array: false, object: true },
    ],
    '@typescript-eslint/prefer-enum-initializers': 'error',
    '@typescript-eslint/prefer-find': 'error',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/prefer-includes': 'error',
    '@typescript-eslint/prefer-literal-enum-member': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'prefer-promise-reject-errors': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/prefer-promise-reject-errors': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-reduce-type-parameter': 'error',
    '@typescript-eslint/prefer-return-this-type': 'error',
    '@typescript-eslint/require-array-sort-compare': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'require-await': 'off',
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/restrict-plus-operands': 'error',
    // Note: you must disable the base rule as it can report incorrect errors
    'no-return-await': 'off',
    '@typescript-eslint/return-await': ['error', 'always'],
    '@typescript-eslint/unified-signatures': 'error',
    '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',

    // Security related
    '@security/detect-bidi-characters': 'error',
    '@security/detect-buffer-noassert': 'error',
    '@security/detect-child-process': 'error',
    '@security/detect-disable-mustache-escape': 'error',
    '@security/detect-eval-with-expression': 'error',
    '@security/detect-new-buffer': 'error',
    '@security/detect-no-csrf-before-method-override': 'error',
    '@security/detect-non-literal-regexp': 'error',
    '@security/detect-non-literal-require': 'error',
    // Note: The reason this rule is turned off is because
    // it marks every [] brackets with dynamic index as error.
    // Therefore it is disabled, HOWEVER make sure you DO NOT
    // iterate over object with user input value because it is
    // a major security issue.
    '@security/detect-object-injection': 'off',
    '@security/detect-possible-timing-attacks': 'error',
    '@security/detect-pseudoRandomBytes': 'error',
    '@security/detect-unsafe-regex': 'error',
  },
});
