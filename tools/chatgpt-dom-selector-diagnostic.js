(() => {
  const selectors = [
    "main",
    "article",
    "section",
    "[data-testid]",
    "[data-testid^='conversation-turn-']",
    "section[data-testid^='conversation-turn-']",
    "article[data-testid^='conversation-turn-']",
    "div[data-testid^='conversation-turn-']",
    "[data-message-author-role]",
    "[data-message-author-role='user']",
    "[data-message-author-role='assistant']",
    ".markdown",
    ".whitespace-pre-wrap",
    "[dir='auto']",
    "div[class*='markdown']",
    "div[class*='prose']",
    "div[class*='whitespace']",
  ];

  const countReport = selectors.map((selector) => ({
    selector,
    count: document.querySelectorAll(selector).length,
  }));

  const visibleText = (el) =>
    (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();

  const describe = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect?.();
    return {
      tag: el.tagName?.toLowerCase(),
      id: el.id || null,
      class: String(el.className || "").slice(0, 180),
      dataTestId: el.getAttribute?.("data-testid"),
      dataMessageAuthorRole: el.getAttribute?.("data-message-author-role"),
      ariaLabel: el.getAttribute?.("aria-label"),
      role: el.getAttribute?.("role"),
      textPreview: visibleText(el).slice(0, 180),
      rect: rect
        ? {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : null,
    };
  };

  const likelyTextNodeAncestorChains = [...document.querySelectorAll("main *")]
    .filter((el) => {
      const text = visibleText(el);
      const rect = el.getBoundingClientRect?.();
      return text.length > 20 && rect && rect.width > 100 && rect.height > 10;
    })
    .slice(0, 80)
    .map((el) => {
      const chain = [];
      let cur = el;
      for (let i = 0; cur && i < 5; i++, cur = cur.parentElement) {
        chain.push(describe(cur));
      }
      return chain;
    });

  const output = {
    href: location.href,
    title: document.title,
    counts: countReport,
    likelyTextNodeAncestorChains,
  };

  console.log("CHATGPT_DOM_DIAGNOSTIC", output);
  copy(JSON.stringify(output, null, 2));
  return output;
})();
