// Paste this whole snippet into the ChatGPT page DevTools console.
// It writes the diagnostic to the console, copies JSON to the clipboard when
// DevTools permits copy(), and downloads a JSON file through the browser.
(async () => {
  const DIAGNOSTIC_NAME = "chatgpt-dom-diagnostic";
  const DIAGNOSTIC_VERSION = "2026-05-11.4";
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
    "button",
    "[aria-expanded]",
  ];

  const countReport = selectors.map((selector) => ({
    selector,
    count: document.querySelectorAll(selector).length,
  }));

  const normalizeText = (text) => String(text || "").replace(/\s+/g, " ").trim();
  const pad = (value) => String(value).padStart(2, "0");
  const timestampForFile = () => {
    const now = new Date();
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join("-") +
      "_" +
      [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("-");
  };
  const sanitizeFilePart = (value) =>
    normalizeText(value)
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "chatgpt-page";
  const saveDiagnosticJson = async (payload, filename) => {
    const json = JSON.stringify(payload, null, 2);
    const result = {
      filename,
      copiedToClipboard: false,
      downloadedWithBlob: false,
      saveMode: "browser-download",
    };

    try {
      copy(json);
      result.copiedToClipboard = true;
    } catch (error) {
      result.clipboardError = String(error?.message || error);
    }

    // Use a normal download instead of showDirectoryPicker(). Chrome can reject
    // OneDrive/Documents folders as containing "system files" when granting a
    // directory handle to chatgpt.com. Downloads are less elegant, but they avoid
    // that folder-handle restriction and still produce a real JSON file Codex can
    // find or the user can save/move into the prepared raw folder.
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    result.downloadedWithBlob = true;
    return result;
  };
  const visibleText = (el) => normalizeText(el?.innerText || el?.textContent);
  const cssPath = (el) => {
    if (!el) return null;
    const parts = [];
    let cur = el;
    for (let i = 0; cur && i < 5; i++, cur = cur.parentElement) {
      let part = cur.tagName?.toLowerCase() || "unknown";
      const testId = cur.getAttribute?.("data-testid");
      const role = cur.getAttribute?.("data-message-author-role");
      const id = cur.id;
      if (id) part += `#${id}`;
      if (testId) part += `[data-testid="${testId}"]`;
      if (role) part += `[data-message-author-role="${role}"]`;
      parts.unshift(part);
    }
    return parts.join(" > ");
  };
  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect?.();
    const style = window.getComputedStyle?.(el);
    return Boolean(
      rect &&
        rect.width > 0 &&
        rect.height > 0 &&
        style &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
    );
  };
  const isInViewport = (el) => {
    const rect = el?.getBoundingClientRect?.();
    if (!rect) return false;
    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };
  const getButtons = (el) =>
    [...(el?.querySelectorAll?.("button") || [])].slice(0, 12).map((button) => ({
      text: visibleText(button).slice(0, 120),
      ariaLabel: button.getAttribute("aria-label"),
      ariaExpanded: button.getAttribute("aria-expanded"),
      dataTestId: button.getAttribute("data-testid"),
      visible: isVisible(button),
    }));

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
      ariaExpanded: el.getAttribute?.("aria-expanded"),
      visible: isVisible(el),
      inViewport: isInViewport(el),
      textLength: visibleText(el).length,
      textPreview: visibleText(el).slice(0, 180),
      cssPath: cssPath(el),
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

  const turnSelector =
    "section[data-testid^='conversation-turn-'], article[data-testid^='conversation-turn-'], div[data-testid^='conversation-turn-']";
  const roleSelector =
    "[data-message-author-role='user'], [data-message-author-role='assistant']";

  const roleNodeReport = [...document.querySelectorAll(roleSelector)].map(
    (node, index) => {
      const turn = node.closest(turnSelector);
      const markdownNodes = [...node.querySelectorAll(".markdown")];
      const whitespaceNodes = [...node.querySelectorAll(".whitespace-pre-wrap")];
      return {
        index,
        role: node.getAttribute("data-message-author-role"),
        visible: isVisible(node),
        inViewport: isInViewport(node),
        textLength: visibleText(node).length,
        textPreview: visibleText(node).slice(0, 300),
        nearestTurn: describe(turn),
        own: describe(node),
        markdownNodeCount: markdownNodes.length,
        markdownPreviews: markdownNodes.slice(0, 4).map((el) => describe(el)),
        whitespaceNodeCount: whitespaceNodes.length,
        whitespacePreviews: whitespaceNodes.slice(0, 4).map((el) =>
          describe(el)
        ),
        buttons: getButtons(node),
      };
    }
  );

  const turnReport = [...document.querySelectorAll(turnSelector)].map(
    (turn, index) => {
      const roleNodes = [...turn.querySelectorAll(roleSelector)];
      return {
        index,
        turn: describe(turn),
        roleNodeCount: roleNodes.length,
        roles: roleNodes.map((node) => node.getAttribute("data-message-author-role")),
        roleTextLengths: roleNodes.map((node) => visibleText(node).length),
        rolePreviews: roleNodes.map((node) => visibleText(node).slice(0, 180)),
        markdownCount: turn.querySelectorAll(".markdown").length,
        whitespacePreWrapCount: turn.querySelectorAll(".whitespace-pre-wrap")
          .length,
        buttons: getButtons(turn),
      };
    }
  );

  const showMoreCandidates = [...document.querySelectorAll("button, [role='button']")]
    .map((el, index) => ({ index, el, text: visibleText(el) }))
    .filter((item) => /show more|continue|expand|read more/i.test(item.text))
    .slice(0, 80)
    .map((item) => ({
      index: item.index,
      button: describe(item.el),
      nearestRoleNode: describe(item.el.closest(roleSelector)),
      nearestTurn: describe(item.el.closest(turnSelector)),
    }));

  const roleSummary = roleNodeReport.reduce(
    (acc, item) => {
      acc[item.role] = (acc[item.role] || 0) + 1;
      if (item.visible) acc.visible[item.role] = (acc.visible[item.role] || 0) + 1;
      if (item.inViewport)
        acc.inViewport[item.role] = (acc.inViewport[item.role] || 0) + 1;
      return acc;
    },
    { visible: {}, inViewport: {} }
  );

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

  const suggestedFileName = `${DIAGNOSTIC_NAME}_${sanitizeFilePart(
    document.title
  )}_${timestampForFile()}.json`;

  const output = {
    diagnosticName: DIAGNOSTIC_NAME,
    diagnosticVersion: DIAGNOSTIC_VERSION,
    createdAtLocal: new Date().toString(),
    suggestedFileName,
    href: location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
    },
    counts: countReport,
    roleSummary,
    roleNodeReport,
    turnReport,
    showMoreCandidates,
    likelyTextNodeAncestorChains,
  };

  console.log("CHATGPT_DOM_DIAGNOSTIC", output);
  const saveResult = await saveDiagnosticJson(output, suggestedFileName);
  output.saveResult = saveResult;
  console.log("CHATGPT_DOM_DIAGNOSTIC_SAVE_RESULT", saveResult);
  return output;
})();
