(function () {
  var CORE_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@aa55dba4ee9b7893961bb73cb455f7a6b1edb386/chatbot-widget.js?v=universal-core-icon-bg-stable-2";
  var LOADER_FLAG = "__chatflowUniversalWidgetLoader";
  var ICON_BG_STYLE_ID = "chatflow-force-launcher-bg-stable";
  var PATCHED_ROOT_FLAG = "__chatflowLauncherBgStablePatched";

  function getCurrentScriptTag() {
    if (document.currentScript && document.currentScript.tagName === "SCRIPT") return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var script = scripts[i];
      if (script && script.src && script.src.indexOf("universal-chatbot-widget") !== -1) return script;
    }
    return scripts.length ? scripts[scripts.length - 1] : null;
  }

  function getSafeTargetDocument() {
    try {
      if (window.top && window.top !== window && window.top.document && window.top.document.documentElement) return window.top.document;
    } catch (error) {}
    try {
      if (window.parent && window.parent !== window && window.parent.document && window.parent.documentElement) return window.parent.document;
    } catch (error2) {}
    return document;
  }

  function isIframe() {
    try { return window.self !== window.top; }
    catch (error) { return true; }
  }

  function canAccessParentPage() {
    try {
      return !!(window.top && window.top !== window && window.top.document && window.top.document.documentElement);
    } catch (error) {
      try { return !!(window.parent && window.parent !== window && window.parent.document && window.parent.documentElement); }
      catch (error2) { return false; }
    }
  }

  function sanitizeId(value) {
    return String(value || "default").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "default";
  }

  function normalizeCssColor(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
    if (/^(rgb|rgba|hsl|hsla)\([0-9\s,%.]+\)$/i.test(raw)) return raw;
    return "";
  }

  function normalizeIconSize(value) {
    var raw = String(value || "").trim();
    if (!raw) return "58%";
    if (/^\d+(?:\.\d+)?$/.test(raw)) return raw + "%";
    if (/^\d+(?:\.\d+)?(?:%|px|rem|em)$/i.test(raw)) return raw;
    return "58%";
  }

  function getIconBgColor(sourceScript) {
    if (!sourceScript || !sourceScript.getAttribute) return "";
    return normalizeCssColor(
      sourceScript.getAttribute("data-icon-bg-color") ||
      sourceScript.getAttribute("data-launcher-bg-color") ||
      sourceScript.getAttribute("data-button-bg-color") ||
      ""
    );
  }

  function getIconSize(sourceScript) {
    if (!sourceScript || !sourceScript.getAttribute) return "58%";
    return normalizeIconSize(sourceScript.getAttribute("data-icon-size") || sourceScript.getAttribute("data-launcher-icon-size") || "58%");
  }

  function copyAttributes(source, target) {
    if (!source || !target || !source.attributes) return;
    for (var i = 0; i < source.attributes.length; i += 1) {
      var attr = source.attributes[i];
      if (!attr || attr.name === "src") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  function installRootStyle(root, targetDoc, color, iconSize) {
    var style = root.getElementById(ICON_BG_STYLE_ID);
    if (!style) {
      style = targetDoc.createElement("style");
      style.id = ICON_BG_STYLE_ID;
      root.appendChild(style);
    }

    style.textContent = [
      ":host{--chatflow-forced-launcher-bg:" + color + "!important}",
      ".widget-root{--chatflow-forced-launcher-bg:" + color + "!important}",
      ".widget-root[data-open='false'] .launcher,.widget-root:not([data-open='true']) .launcher{background:" + color + "!important;background-color:" + color + "!important;background-image:none!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}",
      ".widget-root[data-open='false'] .launcher>img,.widget-root[data-open='false'] .launcher img,.widget-root:not([data-open='true']) .launcher>img,.widget-root:not([data-open='true']) .launcher img{width:" + iconSize + "!important;height:" + iconSize + "!important;min-width:auto!important;min-height:auto!important;max-width:" + iconSize + "!important;max-height:" + iconSize + "!important;object-fit:contain!important;object-position:center!important;margin:auto!important;padding:0!important;background:transparent!important;background-color:transparent!important;border-radius:0!important;display:block!important;box-shadow:none!important}",
      ".widget-root[data-open='true'] .launcher{background:var(--chatbot-primary,#1450d8)!important;background-color:var(--chatbot-primary,#1450d8)!important;background-image:none!important}"
    ].join("\n");
  }

  function patchRoot(root, targetDoc, color, iconSize) {
    if (!root) return;
    installRootStyle(root, targetDoc, color, iconSize);

    var host = root.host;
    if (host && host.style) host.style.setProperty("--chatflow-forced-launcher-bg", color, "important");

    var widgetRoot = root.querySelector(".widget-root");
    if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatflow-forced-launcher-bg", color, "important");

    var launcher = root.querySelector(".launcher");
    var isOpen = widgetRoot && widgetRoot.getAttribute("data-open") === "true";
    if (launcher && !isOpen) {
      launcher.style.setProperty("background", color, "important");
      launcher.style.setProperty("background-color", color, "important");
      launcher.style.setProperty("background-image", "none", "important");
      launcher.style.setProperty("display", "flex", "important");
      launcher.style.setProperty("align-items", "center", "important");
      launcher.style.setProperty("justify-content", "center", "important");

      var images = launcher.querySelectorAll("img");
      for (var i = 0; i < images.length; i += 1) {
        var img = images[i];
        img.style.setProperty("width", iconSize, "important");
        img.style.setProperty("height", iconSize, "important");
        img.style.setProperty("min-width", "auto", "important");
        img.style.setProperty("min-height", "auto", "important");
        img.style.setProperty("max-width", iconSize, "important");
        img.style.setProperty("max-height", iconSize, "important");
        img.style.setProperty("object-fit", "contain", "important");
        img.style.setProperty("object-position", "center", "important");
        img.style.setProperty("margin", "auto", "important");
        img.style.setProperty("background", "transparent", "important");
        img.style.setProperty("background-color", "transparent", "important");
        img.style.setProperty("border-radius", "0", "important");
        img.style.setProperty("box-shadow", "none", "important");
      }
    }
  }

  function attachRootObserver(root, targetDoc, color, iconSize) {
    if (!root || root[PATCHED_ROOT_FLAG]) return;
    root[PATCHED_ROOT_FLAG] = true;

    var scheduled = false;
    function schedulePatch() {
      if (scheduled) return;
      scheduled = true;
      var win = targetDoc.defaultView || window;
      var run = function () {
        scheduled = false;
        patchRoot(root, targetDoc, color, iconSize);
      };
      if (win.requestAnimationFrame) win.requestAnimationFrame(run);
      else win.setTimeout(run, 0);
    }

    patchRoot(root, targetDoc, color, iconSize);
    root.addEventListener("click", schedulePatch, true);

    if ((targetDoc.defaultView || window).MutationObserver) {
      var observer = new (targetDoc.defaultView || window).MutationObserver(schedulePatch);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "data-open", "src"]
      });
    }

    var frames = 0;
    function frameLoop() {
      frames += 1;
      patchRoot(root, targetDoc, color, iconSize);
      if (frames < 180) {
        var win = targetDoc.defaultView || window;
        if (win.requestAnimationFrame) win.requestAnimationFrame(frameLoop);
        else win.setTimeout(frameLoop, 16);
      }
    }
    frameLoop();
  }

  function applyLauncherBackground(targetDoc, sourceScript) {
    var color = getIconBgColor(sourceScript);
    if (!color) return;
    var iconSize = getIconSize(sourceScript);
    var attempts = 0;

    function scan() {
      attempts += 1;
      var hosts = targetDoc.querySelectorAll("[data-chatbot-widget-host]");
      for (var i = 0; i < hosts.length; i += 1) {
        if (hosts[i] && hosts[i].shadowRoot) attachRootObserver(hosts[i].shadowRoot, targetDoc, color, iconSize);
      }
      if (attempts >= 600 && timer) (targetDoc.defaultView || window).clearInterval(timer);
    }

    scan();
    var timer = (targetDoc.defaultView || window).setInterval(scan, 100);

    if ((targetDoc.defaultView || window).MutationObserver) {
      var docObserver = new (targetDoc.defaultView || window).MutationObserver(scan);
      docObserver.observe(targetDoc.documentElement || targetDoc.body, { childList: true, subtree: true });
    }
  }

  function appendScript(targetDoc, sourceScript) {
    var botId = sourceScript && sourceScript.getAttribute ? sourceScript.getAttribute("data-bot-id") : "";
    var chatId = sourceScript && sourceScript.getAttribute ? (sourceScript.getAttribute("data-chat-id") || sourceScript.getAttribute("data-chatid")) : "";
    var token = sourceScript && sourceScript.getAttribute ? (sourceScript.getAttribute("data-chatbot-token") || sourceScript.getAttribute("data-token") || sourceScript.getAttribute("data-widget-token")) : "";
    var instanceKey = sanitizeId(botId || chatId || token || "default");
    var scriptId = "chatflow-universal-widget-" + instanceKey;

    if (!targetDoc.getElementById(scriptId)) {
      var script = targetDoc.createElement("script");
      script.id = scriptId;
      copyAttributes(sourceScript, script);
      script.setAttribute("data-chatflow-universal-injected", "true");
      script.src = (sourceScript && sourceScript.getAttribute && sourceScript.getAttribute("data-core-widget-src")) || CORE_WIDGET_SRC;
      script.async = false;
      script.defer = false;
      var parent = targetDoc.head || targetDoc.body || targetDoc.documentElement;
      parent.appendChild(script);
    }

    applyLauncherBackground(targetDoc, sourceScript);
  }

  function start() {
    var current = getCurrentScriptTag();
    var targetDoc = getSafeTargetDocument();
    try { if (!targetDoc.defaultView[LOADER_FLAG]) targetDoc.defaultView[LOADER_FLAG] = {}; } catch (error) {}
    appendScript(targetDoc, current);
    if (isIframe() && !canAccessParentPage() && window.console && console.warn) {
      console.warn("[Chatflow] This HTML embed is inside a cross-origin iframe. Browsers do not allow a script inside that iframe to display a fixed widget on the parent page. Add the Chatflow script in the platform's global Head/Footer/Body custom code instead of an iframe HTML embed.");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
