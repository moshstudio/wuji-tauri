import antfu from "@antfu/eslint-config";

export default antfu(
  {
    vue: true,
    unocss: true,
    typescript: true,
    formatters: true,
    ignores: [`.github`, `bin`, `md-cli`, `src/assets`],
  },
  {
    rules: {
      semi: [`error`, `never`],
      quotes: [`error`, `backtick`],
      "no-unused-vars": `off`,
      "no-console": `off`,
      "no-debugger": `off`,
      "vue/html-closing-bracket-newline": [
        `error`,
        {
          singleline: `never`,
          multiline: `never`,
        },
      ],
      "vue/html-self-closing": [
        `error`,
        {
          html: {
            void: `always`,
            normal: `always`,
            component: `always`,
          },
          svg: `always`,
          math: `always`,
        },
      ],
    },
  }
);
