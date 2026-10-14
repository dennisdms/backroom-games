// The scoreboard re-ranks as scores change. Rows carry `data-rank-key`; draw()
// measures them before rendering and slides each row from where it was.

/** Each keyed row's top edge, before a render. */
export const rankPositions = (root: HTMLElement): Map<string, number> => {
  const tops = new Map<string, number>();
  for (const el of root.querySelectorAll<HTMLElement>("[data-rank-key]")) {
    if (el.dataset.rankKey) tops.set(el.dataset.rankKey, el.getBoundingClientRect().top);
  }
  return tops;
};

/** Slides every keyed row that moved since `before` back from its old place. */
export const animateRanks = (root: HTMLElement, before: Map<string, number>) => {
  if (before.size === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const el of root.querySelectorAll<HTMLElement>("[data-rank-key]")) {
    const was = el.dataset.rankKey ? before.get(el.dataset.rankKey) : undefined;
    if (was === undefined) continue;
    const dy = was - el.getBoundingClientRect().top;
    if (Math.abs(dy) < 1) continue;
    el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
      duration: 420,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
  }
};
