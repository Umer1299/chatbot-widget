(function () {
  var CORE_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@68b28d1c7db1bce4afdfdb36a03f313e571950d9/chatbot-widget.js?v=universal-core-1";
  var LOADER_FLAG = "__chatflowUniversalWidgetLoader";

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
      if (window.top && window.top !== window && window.top.document && window.top.document.documentElement) {
        return window.top.document;
      }
    } catch (error) {}

    try {
      if (window.parent && window.parent !== window && window.parent.document && window.parent.document.documentElement) {
        return window.parent.document;
      }
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
      try {
        return !!(window.parent && window.parent !== window && window.parent.document && window.parent.document.documentElement);
      } catch (error2) {
        return false;
      }
    }
  }

  function sanitizeId(value) {
    return String(value || "default").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "default";
  }

  function copyAttributes(source, target) {
    if (!source || !target || !source.attributes) return;
    for (var i = 0; i < source.attributes.length; i += 1) {
      var attr = source.attributes[i];
      if (!attr || attr.name === "src") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  function appendScript(targetDoc, sourceScript) {
    var botId = sourceScript && sourceScript.getAttribute ? sourceScript.getAttribute("data-bot-id") : "";
    var chatId = sourceScript && sourceScript.getAttribute ? (sourceScript.getAttribute("data-chat-id") || sourceScript.getAttribute("data-chatid")) : "";
    var token = sourceScript && sourceScript.getAttribute ? (sourceScript.getAttribute("data-chatbot-token") || sourceScript.getAttribute("data-token") || sourceScript.getAttribute("data-widget-token")) : "";
    var instanceKey = sanitizeId(botId || chatId || token || "default");
    var scriptId = "chatflow-universal-widget-" + instanceKey;

    if (targetDoc.getElementById(scriptId)) return;

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

  function start() {
    var current = getCurrentScriptTag();
    var targetDoc = getSafeTargetDocument();

    try {
      if (!targetDoc.defaultView[LOADER_FLAG]) targetDoc.defaultView[LOADER_FLAG] = {};
    } catch (error) {}

    appendScript(targetDoc, current);

    if (isIframe() && !canAccessParentPage()) {
      if (window.console && console.warn) {
        console.warn("[Chatflow] This HTML embed is inside a cross-origin iframe. Browsers do not allow a script inside that iframe to display a fixed widget on the parent page. Add the Chatflow script in the platform's global Head/Footer/Body custom code instead of an iframe HTML embed.");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
