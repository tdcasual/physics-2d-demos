/**
 * DOM 搬家 helper — 只管 parent/next 快照与还原。
 *
 * hidden / collapsed class / inline style / chrome 打标等语义由调用方
 * 自理；本模块只保证 restore() 把节点放回原来的位置（next 已不在原
 * parent 下时退化为 appendChild）。
 */

export type MovedNode = {
  restore(): void;
};

export function moveNode(el: HTMLElement, newParent: HTMLElement): MovedNode {
  const parent = el.parentElement;
  const next = el.nextSibling;
  newParent.appendChild(el);
  return {
    restore() {
      if (!parent) return;
      if (next && next.parentNode === parent) {
        parent.insertBefore(el, next);
      } else {
        parent.appendChild(el);
      }
    }
  };
}
