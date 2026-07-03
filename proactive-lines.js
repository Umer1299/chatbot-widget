(function () {
  var BOX_ID = "chatflow-proactive-lines";
  var STYLE_ID = "chatflow-proactive-lines-style";
  var STATE_KEY = "__chatflowProactiveLines";
  var FETCH_PATCHED_KEY = "__chatflowProactiveLinesFetchPatched";
  var XHR_PATCHED_KEY = "__chatflowProactiveLinesXhrPatched";
  var MAX_Z_INDEX = 2147483647;

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

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#" + BOX_ID + "{position:fixed!important;right:20px!important;bottom:116px!important;display:none!important;flex-direction:column!important;gap:10px!important;align-items:flex-end!important;max-width:min(360px,calc(100vw - 40px))!important;margin:0!important;padding:0!important;z-index:" + MAX_Z_INDEX + "!important;pointer-events:auto!important;font-family:Inter,Arial,sans-serif!important;}",
      "#" + BOX_ID + " .chatflow-proactive-line{box-sizing:border-box!important;width:max-content!important;max-width:min(360px,calc(100vw - 40px))!important;background:#fff!important;color:#111827!important;border:1px solid rgba(17,24,39,.12)!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(15,23,42,.10)!important;padding:13px 18px!important;font-size:14px!important;line-height:1.35!important;font-weight:400!important;text-align:left!important;white-space:normal!important;cursor:pointer!important;}",
      "#" + BOX_ID + " .chatflow-proactive-line:hover{box-shadow:0 10px 28px rgba(15,23,42,.14)!important;}",
      "@media(max-width:767px){#" + BOX_ID + "{right:16px!important;bottom:calc(106px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 32px)!important;}#" + BOX_ID + " .chatflow-proactive-line{max-width:calc(100vw - 32px)!important;}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function ensureBox() {
    installStyle();
    var box = document.getElementById(BOX_ID);
    if (!box && document.body) {
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
    box.innerHTML = "";
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

  patchFetch();
  patchXhr();
  ensureBox();
  setInterval(render, 500);
  document.addEventListener("click", function () { setTimeout(render, 100); }, true);
})();
