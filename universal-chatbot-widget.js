(function () {
  var CORE_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@aa55dba4ee9b7893961bb73cb455f7a6b1edb386/chatbot-widget.js?v=universal-core-icon-bg-visible-1";
  var LOADER_FLAG = "__chatflowUniversalWidgetLoader";
  var ICON_BG_STYLE_ID = "chatflow-force-launcher-bg";

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
      if (window.parent && window.parent !== window && window.parent.document && window.parent.document.documentElement) return window.parent.document;
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
      try { return !!(window.parent && window.parent !== window && window.parent.document && window.parent.document.documentElement); }
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
    if (!raw) return "62%";
    if (/^\d+(?:\.\d+)?$/.test(raw)) return raw + "%";
    if (/^\d+(?:\.\d+)?(?:%|px|rem|em)$/i.test(raw)) return raw;
    return "62%";
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
    if (!sourceScript || !sourceScript.getAttribute) return "62%";
    return normalizeIconSize(sourceScript.getAttribute("data-icon-size") || sourceScript.getAttribute("data-launcher-icon-size") || "62%");
  }

  function copyAttributes(source, target) {
    if (!source || !target || !source.attributes) return;
    for (var i = 0; i < source.attributes.length; i += 1) {
      var attr = source.attributes[i];
      if (!attr || attr.name === "src") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  function applyLauncherBackground(targetDoc, sourceScript) {
    var color = getIconBgColor(sourceScript);
    if (!color) return;
    var iconSize = getIconSize(sourceScript);
    var attempts = 0;

    function patchOnce() {
      attempts += 1;
      var hosts = targetDoc.querySelectorAll("[data-chatbot-widget-host]");
      for (var i = 0; i < hosts.length; i += 1) {
        var host = hosts[i];
        var root = host && host.shadowRoot;
        if (!root) continue;

        if (host.style) host.style.setProperty("--chatbot-launcher-bg", color);
        var widgetRoot = root.querySelector(".widget-root");
        if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatbot-launcher-bg", color);

        var style = root.getElementById(ICON_BG_STYLE_ID);
        if (!style) {
          style = targetDoc.createElement("style");
          style.id = ICON_BG_STYLE_ID;
          root.appendChild(style);
        }
        style.textContent = [
          ".widget-root[data-open='false'] .launcher{background:" + color + "!important;background-color:" + color + "!important;background-image:none!important;display:flex!important;align-items:center!important;justify-content:center!important}",
          ".widget-root[data-open='false'] .launcher img{width:" + iconSize + "!important;height:" + iconSize + "!important;max-width:" + iconSize + "!important;max-height:" + iconSize + "!important;object-fit:contain!important;margin:auto!important;background:transparent!important;border-radius:0!important;display:block!important}",
          ".widget-root[data-open='true'] .launcher{background:var(--chatbot-primary,#1450d8)!important;background-color:var(--chatbot-primary,#1450d8)!important}"
        ].join("\n");

        var launcher = root.querySelector(".launcher");
        if (launcher && (!widgetRoot || widgetRoot.getAttribute("data-open") !== "true")) {
          launcher.style.setProperty("background", color, "important");
          launcher.style.setProperty("background-color", color, "important");
          launcher.style.setProperty("background-image", "none", "important");
          var img = launcher.querySelector("img");
          if (img) {
            img.style.setProperty("width", iconSize, "important");
            img.style.setProperty("height", iconSize, "important");
            img.style.setProperty("max-width", iconSize, "important");
            img.style.setProperty("max-height", iconSize, "important");
            img.style.setProperty("object-fit", "contain", "important");
            img.style.setProperty("background", "transparent", "important");
            img.style.setProperty("border-radius", "0", "important");
          }
        }
      }
    }

    patchOnce();
    var timer = targetDoc.defaultView.setInterval(function () {
      patchOnce();
      if (attempts >= 240) targetDoc.defaultView.clearInterval(timer);
    }, 250);

    if (targetDoc.defaultView.MutationObserver) {
      var observer = new targetDoc.defaultView.MutationObserver(patchOnce);
      observer.observe(targetDoc.documentElement || targetDoc.body, { childList: true, subtree: true });
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
