(function () {
  var BOX_ID = "chatflow-proactive-lines";
  var STYLE_ID = "chatflow-proactive-lines-style";
  var STATE_KEY = "__chatflowProactiveLines";
  var FETCH_PATCHED_KEY = "__chatflowProactiveLinesFetchPatched";
  var XHR_PATCHED_KEY = "__chatflowProactiveLinesXhrPatched";
  var LAST_REFETCH_KEY = "__chatflowProactiveLinesLastRefetch";
  var INJECTED_PARENT_KEY = "__chatflowProactiveLinesInjectedParent";
  var MAX_Z_INDEX = 2147483647;
  var SOURCE_SCRIPT = getCurrentScriptTag();

  function getCurrentScriptTag() {
    if (document.currentScript && document.currentScript.tagName === "SCRIPT") return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var script = scripts[i];
      if (script && script.src && script.src.indexOf("proactive-lines") !== -1) return script;
    }
    return scripts.length ? scripts[scripts.length - 1] : null;
  }

  function getSafeTargetWindow() {
    try {
      if (window.top && window.top !== window && window.top.document && window.top.document.documentElement) return window.top;
    } catch (error) {}
    try {
      if (window.parent && window.parent !== window && window.parent.document && window.parent.document.documentElement) return window.parent;
    } catch (error2) {}
    return window;
  }

  function injectIntoParentIfNeeded() {
    var targetWin = getSafeTargetWindow();
    if (targetWin === window) return false;
    try {
      if (targetWin[INJECTED_PARENT_KEY]) return true;
      targetWin[INJECTED_PARENT_KEY] = true;
      var targetDoc = targetWin.document;
      var script = targetDoc.createElement("script");
      script.src = SOURCE_SCRIPT && SOURCE_SCRIPT.src ? SOURCE_SCRIPT.src : "";
      if (!script.src) return false;
      copyAttributes(SOURCE_SCRIPT, script);
      script.setAttribute("data-chatflow-parent-injected", "true");
      (targetDoc.head || targetDoc.body || targetDoc.documentElement).appendChild(script);
      return true;
    } catch (error) {
      return false;
    }
  }

  function copyAttributes(source, target) {
    if (!source || !target || !source.attributes) return;
    for (var i = 0; i < source.attributes.length; i += 1) {
      var attr = source.attributes[i];
      if (!attr || attr.name === "src") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  if (injectIntoParentIfNeeded()) return;

  function getAttr(name) {
    return SOURCE_SCRIPT && SOURCE_SCRIPT.getAttribute ? SOURCE_SCRIPT.getAttribute(name) : "";
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  function normalizeKey(key) {
    return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function parseJsonMaybe(value) {
    if (typeof value !== "string") return value;
    var raw = value.trim();
    if (!raw) return value;
    if ((raw.charAt(0) === "{" && raw.charAt(raw.length - 1) === "}") || (raw.charAt(0) === "[" && raw.charAt(raw.length - 1) === "]")) {
      try { return JSON.parse(raw); } catch (error) { return value; }
    }
    return value;
  }

  function addMessage(messages, value) {
    value = parseJsonMaybe(value);
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) addMessage(messages, value[i]);
      return;
    }
    if (value && typeof value === "object") {
      var fields = ["text", "message", "content", "body", "label", "title", "value", "name"];
      for (var j = 0; j < fields.length; j += 1) {
        if (value[fields[j]]) {
          addMessage(messages, value[fields[j]]);
          return;
        }
      }
      return;
    }
    var raw = normalizeText(value);
    if (!raw) return;
    raw.split(/\n{2,}|\s*\|\|\s*/g).forEach(function (part) {
      var text = normalizeText(part);
      if (text) messages.push(text);
    });
  }

  function getValue(obj, keys) {
    if (!obj || typeof obj !== "object") return undefined;
    var normalizedMap = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) normalizedMap[normalizeKey(key)] = obj[key];
    }
    for (var i = 0; i < keys.length; i += 1) {
      if (obj[keys[i]]) return obj[keys[i]];
      var mapped = normalizedMap[normalizeKey(keys[i])];
      if (mapped) return mapped;
    }
    return undefined;
  }

  function collectMessages(messages, obj) {
    obj = parseJsonMaybe(obj);
    if (!obj || typeof obj !== "object") return;

    [
      "proactiveMessages", "proactive_messages", "proactive message", "proactive messages", "Proactive Messages",
      "proactiveMessage", "proactive_message", "proactiveMessageText", "proactive_message_text",
      "launcherMessages", "launcher_messages", "launcher message", "launcher messages",
      "launcherMessage", "launcher_message", "teaserMessages", "teaser_messages",
      "greetingMessages", "greeting_messages", "chatbaseMessages", "chatbase_messages"
    ].forEach(function (key) { addMessage(messages, getValue(obj, [key])); });

    var bases = [
      "proactive_message_", "proactive message ", "proactiveMessage", "Proactive Message ",
      "launcher_message_", "launcher message ", "launcherMessage", "Launcher Message ",
      "teaser_message_", "teaser message ", "teaserMessage", "Teaser Message ",
      "greeting_message_", "greeting message ", "greetingMessage", "Greeting Message "
    ];

    for (var n = 1; n <= 5; n += 1) {
      for (var b = 0; b < bases.length; b += 1) addMessage(messages, getValue(obj, [bases[b] + n]));
    }

    for (var key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      var normalized = normalizeKey(key);
      var looksLikeProactive = normalized.indexOf("proactive") !== -1 || normalized.indexOf("launcher") !== -1 || normalized.indexOf("teaser") !== -1 || normalized.indexOf("greeting") !== -1 || normalized.indexOf("chatbase") !== -1 || normalized.indexOf("welcomepopup") !== -1;
      var looksLikeMessage = normalized.indexOf("message") !== -1 || normalized.indexOf("messages") !== -1 || normalized.indexOf("text") !== -1 || normalized.indexOf("bubble") !== -1 || normalized.indexOf("prompt") !== -1;
      if (looksLikeProactive && looksLikeMessage) addMessage(messages, obj[key]);
    }
  }

  function readMessages(data) {
    var messages = [];
    var response = data && data.response && typeof data.response === "object" ? data.response : data;
    collectMessages(messages, response);
    if (response && typeof response === "object") {
      collectMessages(messages, response.themeConfig);
      collectMessages(messages, response.theme_config);
      collectMessages(messages, response.settings);
      collectMessages(messages, response.widgetSettings);
      collectMessages(messages, response.widget_settings);
    }
    var unique = [];
    for (var i = 0; i < messages.length; i += 1) {
      if (messages[i] && unique.indexOf(messages[i]) === -1) unique.push(messages[i]);
    }
    return unique.slice(0, 2);
  }

  function getScriptMessages() {
    var messages = [];
    addMessage(messages, getAttr("data-proactive-messages"));
    addMessage(messages, getAttr("data-proactive-message"));
    addMessage(messages, getAttr("data-launcher-messages"));
    addMessage(messages, getAttr("data-launcher-message"));
    for (var i = 1; i <= 5; i += 1) {
      addMessage(messages, getAttr("data-proactive-message-" + i));
      addMessage(messages, getAttr("data-launcher-message-" + i));
    }
    var unique = [];
    for (var j = 0; j < messages.length; j += 1) {
      if (messages[j] && unique.indexOf(messages[j]) === -1) unique.push(messages[j]);
    }
    return unique.slice(0, 2);
  }

  function getWidgetRoot() {
    var host = document.querySelector("[data-chatbot-widget-host]");
    return host && host.shadowRoot ? host.shadowRoot.querySelector(".widget-root") : null;
  }

  function getLauncher() {
    var host = document.querySelector("[data-chatbot-widget-host]");
    return host && host.shadowRoot ? host.shadowRoot.querySelector(".launcher") : null;
  }

  function isChatOpen() {
    var root = getWidgetRoot();
    return root && root.getAttribute("data-open") === "true";
  }

  function getSide() {
    var side = normalizeText(getAttr("data-position") || getAttr("data-side")).toLowerCase();
    if (side === "left") return "left";
    var root = getWidgetRoot();
    if (root && root.getAttribute("data-position") === "left") return "left";
    return "right";
  }

  function getBottom() {
    var value = normalizeText(getAttr("data-bottom"));
    return value || "116px";
  }

  function getMobileBottom() {
    var value = normalizeText(getAttr("data-mobile-bottom"));
    return value || "calc(106px + env(safe-area-inset-bottom))";
  }

  function installStyle() {
    var side = getSide();
    var desktopSide = side === "left" ? "left:20px!important;right:auto!important;align-items:flex-start!important;" : "right:20px!important;left:auto!important;align-items:flex-end!important;";
    var mobileSide = side === "left" ? "left:16px!important;right:auto!important;" : "right:16px!important;left:auto!important;";
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = [
      "#" + BOX_ID + "{position:fixed!important;" + desktopSide + "bottom:" + getBottom() + "!important;display:none!important;flex-direction:column!important;gap:10px!important;max-width:min(360px,calc(100vw - 40px))!important;margin:0!important;padding:0!important;z-index:" + MAX_Z_INDEX + "!important;pointer-events:auto!important;font-family:Inter,Arial,sans-serif!important;}",
      "#" + BOX_ID + " .chatflow-proactive-line{box-sizing:border-box!important;width:max-content!important;max-width:min(360px,calc(100vw - 40px))!important;background:#fff!important;color:#111827!important;border:1px solid rgba(17,24,39,.12)!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(15,23,42,.10)!important;padding:13px 18px!important;font-size:14px!important;line-height:1.35!important;font-weight:400!important;text-align:left!important;white-space:normal!important;cursor:pointer!important;}",
      "#" + BOX_ID + " .chatflow-proactive-line:hover{box-shadow:0 10px 28px rgba(15,23,42,.14)!important;}",
      "@media(max-width:767px){#" + BOX_ID + "{" + mobileSide + "bottom:" + getMobileBottom() + "!important;max-width:calc(100vw - 32px)!important;}#" + BOX_ID + " .chatflow-proactive-line{max-width:calc(100vw - 32px)!important;}}"
    ].join("\n");
  }

  function ensureBox() {
    if (!document.head || !document.body) return null;
    installStyle();
    var box = document.getElementById(BOX_ID);
    if (!box) {
      box = document.createElement("div");
      box.id = BOX_ID;
      document.body.appendChild(box);
    }
    return box;
  }

  function render() {
    var box = ensureBox();
    if (!box) return;
    var state = window[STATE_KEY] || {};
    var messages = Array.isArray(state.messages) ? state.messages : [];
    if (!messages.length) messages = getScriptMessages();
    box.innerHTML = "";
    installStyle();
    if (!messages.length || isChatOpen()) {
      box.style.setProperty("display", "none", "important");
      return;
    }
    messages.forEach(function (message) {
      var item = document.createElement("div");
      item.className = "chatflow-proactive-line";
      item.textContent = message;
      box.appendChild(item);
    });
    box.onclick = function () {
      var launcher = getLauncher();
      if (launcher && typeof launcher.click === "function") launcher.click();
      setTimeout(render, 100);
    };
    box.style.setProperty("display", "flex", "important");
  }

  function store(data) {
    var messages = readMessages(data);
    if (!messages.length) messages = getScriptMessages();
    window[STATE_KEY] = { messages: messages, updatedAt: Date.now() };
    setTimeout(render, 0);
    setTimeout(render, 150);
    setTimeout(render, 600);
  }

  function patchFetch() {
    if (!window.fetch || window[FETCH_PATCHED_KEY]) return;
    window[FETCH_PATCHED_KEY] = true;
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      return nativeFetch(input, init).then(function (response) {
        if (url.indexOf("/api/1.1/wf/get-chatbot") !== -1 && response && response.clone) {
          response.clone().json().then(store).catch(function () {});
        }
        return response;
      });
    };
  }

  function patchXhr() {
    if (!window.XMLHttpRequest || window[XHR_PATCHED_KEY]) return;
    window[XHR_PATCHED_KEY] = true;
    var NativeXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      var xhr = new NativeXHR();
      var open = xhr.open;
      var requestUrl = "";
      xhr.open = function (method, url) {
        requestUrl = String(url || "");
        return open.apply(xhr, arguments);
      };
      xhr.addEventListener("load", function () {
        if (requestUrl.indexOf("/api/1.1/wf/get-chatbot") === -1) return;
        try { store(JSON.parse(xhr.responseText)); } catch (error) {}
      });
      return xhr;
    };
  }

  function findLastGetChatbotUrl() {
    try {
      if (!window.performance || !performance.getEntriesByType) return "";
      var entries = performance.getEntriesByType("resource") || [];
      for (var i = entries.length - 1; i >= 0; i -= 1) {
        var name = entries[i] && entries[i].name ? String(entries[i].name) : "";
        if (name.indexOf("/api/1.1/wf/get-chatbot") !== -1) return name;
      }
    } catch (error) {}
    return "";
  }

  function refetchUrl(url) {
    if (!window.fetch || !url || window[LAST_REFETCH_KEY] === url) return;
    window[LAST_REFETCH_KEY] = url;
    fetch(url, { credentials: "include", cache: "no-store" })
      .then(function (response) { return response && response.json ? response.json() : null; })
      .then(function (data) { if (data) store(data); })
      .catch(function () { window[LAST_REFETCH_KEY] = ""; });
  }

  function refetchExistingGetChatbot() {
    refetchUrl(getAttr("data-config-url") || getAttr("data-get-chatbot-url") || findLastGetChatbotUrl());
  }

  function start() {
    patchFetch();
    patchXhr();
    ensureBox();
    var scriptMessages = getScriptMessages();
    if (scriptMessages.length) window[STATE_KEY] = { messages: scriptMessages, updatedAt: Date.now() };
    render();
    refetchExistingGetChatbot();
    setTimeout(refetchExistingGetChatbot, 500);
    setTimeout(refetchExistingGetChatbot, 1500);
    setTimeout(refetchExistingGetChatbot, 3000);
    setInterval(render, 500);
    document.addEventListener("click", function () { setTimeout(render, 100); }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
