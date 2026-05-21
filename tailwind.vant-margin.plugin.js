import plugin from 'tailwindcss/plugin';

/**
 * Vant 部分组件的 margin 会盖掉 Tailwind 的 mt/mb/m 工具类：
 * - .van-cell-group--inset { margin: 0 var(--van-padding-md) }  (0,2,0)
 * - .van-button { margin: 0 }  (0,1,0)
 *
 * 为「组件根节点 + Tailwind 边距类」生成更高优先级的组合选择器。
 */
function shouldIncludeSpacingKey(key) {
  if (key === 'px')
    return true;
  const n = Number(key);
  return !Number.isNaN(n) && n <= 16;
}

export default plugin(({ addComponents, theme }) => {
  const spacing = theme('spacing');
  const insetX = 'var(--van-padding-md)';
  const rules = {};

  for (const [key, value] of Object.entries(spacing)) {
    if (typeof value !== 'string' || !shouldIncludeSpacingKey(key))
      continue;

    const mt = `.van-cell-group--inset.mt-${key}`;
    const mb = `.van-cell-group--inset.mb-${key}`;
    const my = `.van-cell-group--inset.my-${key}`;
    const m = `.van-cell-group--inset.m-${key}`;

    rules[mt] = { margin: `${value} ${insetX} 0` };
    rules[mb] = { margin: `0 ${insetX} ${value}` };
    rules[my] = { margin: `${value} ${insetX}` };
    rules[m] = { margin: value };

    rules[`.van-button.mt-${key}`] = { marginTop: value };
    rules[`.van-button.mb-${key}`] = { marginBottom: value };
    rules[`.van-button.ml-${key}`] = { marginLeft: value };
    rules[`.van-button.mr-${key}`] = { marginRight: value };
    rules[`.van-button.mx-${key}`] = {
      marginLeft: value,
      marginRight: value,
    };
    rules[`.van-button.my-${key}`] = {
      marginTop: value,
      marginBottom: value,
    };
    rules[`.van-button.m-${key}`] = { margin: value };
  }

  addComponents(rules);
});
