import { DirectiveBinding, ObjectDirective } from "vue";

// 定义一个扩展了 HTMLElement 的类型
interface TooltipElement extends HTMLElement {
  _tooltip?: HTMLDivElement;
  _showTooltip?: () => void;
  _hideTooltip?: () => void;
}

// 定义 Tooltip 指令
const TooltipDirective: ObjectDirective<TooltipElement, string> = {
  mounted(el: TooltipElement, binding: DirectiveBinding<string>) {
    // 创建 Tooltip 元素
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerText = binding.value;
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.style.position = "absolute"; // 确保 Tooltip 使用绝对定位
    tooltip.style.display = "none"; // 默认隐藏
    document.body.appendChild(tooltip);

    // 显示 Tooltip
    const showTooltip = () => {
      const rect = el.getBoundingClientRect();
      const tooltipHeight = tooltip.offsetHeight;
      const tooltipWidth = tooltip.offsetWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // 计算 Tooltip 的位置
      let top = rect.bottom + window.scrollY;
      let left = rect.left + window.scrollX;

      // 检查是否有足够的空间在下方显示
      if (rect.bottom + tooltipHeight > viewportHeight) {
        // 显示在上方
        top = rect.top - tooltipHeight + window.scrollY;
      }

      // 检查是否有足够的空间在右侧显示
      if (rect.left + tooltipWidth > viewportWidth) {
        // 显示在左侧
        left = rect.right - tooltipWidth + window.scrollX;
      }

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      tooltip.style.display = "block";
      tooltip.setAttribute("aria-hidden", "false");
    };

    // 隐藏 Tooltip
    const hideTooltip = () => {
      tooltip.style.display = "none";
      tooltip.setAttribute("aria-hidden", "true");
    };

    // 添加事件监听器
    el.addEventListener("mouseenter", showTooltip);
    el.addEventListener("mouseleave", hideTooltip);
    // 全局监听点击事件，点击时隐藏 Tooltip
    document.addEventListener("click", hideTooltip);

    // 将 Tooltip 元素和事件监听器绑定到 el 上，以便在 unmounted 时清理
    el._tooltip = tooltip;
    el._showTooltip = showTooltip;
    el._hideTooltip = hideTooltip;
  },
  unmounted(el: TooltipElement) {
    // 移除 Tooltip 元素和事件监听器
    if (el._tooltip) {
      document.body.removeChild(el._tooltip);
    }
    if (el._showTooltip) {
      el.removeEventListener("mouseenter", el._showTooltip as EventListener);
    }
    if (el._hideTooltip) {
      el.removeEventListener("mouseleave", el._hideTooltip as EventListener);
      document.removeEventListener("click", el._hideTooltip);
    }
  },
};

// 导出 Tooltip 指令
export default TooltipDirective;
