(function () {
  var CORE_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@aa55dba4ee9b7893961bb73cb455f7a6b1edb386/chatbot-widget.js?v=universal-core-icon-bg-stable-2";
  var LOADER_FLAG = "__chatflowUniversalWidgetLoader";
  var ICON_BG_STYLE_ID = "chatflow-force-launcher-bg-stable";
  var PATCHED_ROOT_FLAG = "__chatflowLauncherBgStablePatched";
  var PROACTIVE_STATE_KEY = "__chatflowProactiveMessages";
  var PROACTIVE_STYLE_ID = "chatflow-proactive-overlay-style";
  var PROACTIVE_BOX_ID = "chatflow-proactive-overlay-messages";
  var PROACTIVE_FETCH_FLAG = "__chatflowProactiveOverlayFetchPatched";
  var MAX_Z_INDEX = 2147483647;

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
      if (!attr || attr.name === "src" || attr.name === "data-core-widget-src") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  function normalizeKey(key) {
    return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function parseJsonMaybe(value) {
    if (typeof value !== "string") return value;
    var raw = value.trim();
    if (!raw) return value;
    if ((raw.charAt(0) === "[" && raw.charAt(raw.length - 1) === "]") || (raw.charAt(0) === "{" && raw.charAt(raw.length - 1) === "}")) {
      try { return JSON.parse(raw); } catch (error) { return value; }
    }
    return value;
  }

  function normalizeProactiveText(value) {
    if (value === null || value === undefined) return "";
    value = parseJsonMaybe(value);
    if (typeof value === "object") {
      var fields = ["text", "message", "content", "body", "label", "title", "value", "name"];
      for (var i = 0; i < fields.length; i += 1) {
        if (value[fields[i]] !== null && value[fields[i]] !== undefined && String(value[fields[i]]).trim()) return String(value[fields[i]]).replace(/\s+/g, " ").trim();
      }
      var normalizedMap = {};
      for (var key in value) if (Object.prototype.hasOwnProperty.call(value, key)) normalizedMap[normalizeKey(key)] = value[key];
      for (var j = 0; j < fields.length; j += 1) {
        var mapped = normalizedMap[normalizeKey(fields[j])];
        if (mapped !== null && mapped !== undefined && String(mapped).trim()) return String(mapped).replace(/\s+/g, " ").trim();
      }
      return "";
    }
    return String(value).replace(/\s+/g, " ").trim();
  }

  function appendProactiveMessages(messages, value) {
    if (value === null || value === undefined) return;
    value = parseJsonMaybe(value);
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i += 1) appendProactiveMessages(messages, value[i]);
      return;
    }
    if (typeof value === "object") {
      var objectText = normalizeProactiveText(value);
      if (objectText) messages.push(objectText);
      return;
    }
    var raw = String(value || "").trim();
    if (!raw) return;
    var parts = raw.split(/\n{2,}|\s*\|\|\s*/g);
    for (var j = 0; j < parts.length; j += 1) {
      var text = normalizeProactiveText(parts[j]);
      if (text) messages.push(text);
    }
  }

  function getConfigValue(config, keys) {
    if (!config || typeof config !== "object") return undefined;
    var normalizedMap = {};
    for (var key in config) if (Object.prototype.hasOwnProperty.call(config, key)) normalizedMap[normalizeKey(key)] = config[key];
    for (var i = 0; i < keys.length; i += 1) {
      var direct = config[keys[i]];
      if (direct !== undefined && direct !== null && String(direct).trim() !== "") return direct;
      var mapped = normalizedMap[normalizeKey(keys[i])];
      if (mapped !== undefined && mapped !== null && String(mapped).trim() !== "") return mapped;
    }
    return undefined;
  }

  function collectFromConfigObject(messages, config) {
    config = parseJsonMaybe(config);
    if (!config || typeof config !== "object") return;
    var exactKeys = [
      "proactiveMessages", "proactive_messages", "proactive message", "proactive messages", "Proactive Messages",
      "proactiveMessage", "proactive_message", "proactive message text", "proactiveMessageText", "proactive_message_text",
      "launcherMessages", "launcher_messages", "launcher message", "launcher messages", "Launcher Messages",
      "launcherMessage", "launcher_message", "welcomeMessages", "welcome_messages", "welcome message", "welcome messages",
      "teaserMessages", "teaser_messages", "teaser message", "teaser messages", "greetingMessages", "greeting_messages",
      "chatbaseMessages", "chatbase_messages", "chatbase message", "chatbase messages"
    ];
    for (var i = 0; i < exactKeys.length; i += 1) appendProactiveMessages(messages, getConfigValue(config, [exactKeys[i]]));
    var bases = [
      "proactive_message_", "proactive message ", "proactiveMessage", "Proactive Message ",
      "launcher_message_", "launcher message ", "launcherMessage", "Launcher Message ",
      "welcome_message_", "welcome message ", "welcomeMessage", "Welcome Message ",
      "teaser_message_", "teaser message ", "teaserMessage", "Teaser Message ",
      "greeting_message_", "greeting message ", "greetingMessage", "Greeting Message "
    ];
    for (var n = 1; n <= 5; n += 1) for (var b = 0; b < bases.length; b += 1) appendProactiveMessages(messages, getConfigValue(config, [bases[b] + n]));
    for (var key in config) {
      if (!Object.prototype.hasOwnProperty.call(config, key)) continue;
      var normalized = normalizeKey(key);
      var looksLikeProactive = normalized.indexOf("proactive") !== -1 || normalized.indexOf("launcher") !== -1 || normalized.indexOf("teaser") !== -1 || normalized.indexOf("greeting") !== -1 || normalized.indexOf("chatbase") !== -1 || normalized.indexOf("welcomepopup") !== -1;
      var looksLikeMessage = normalized.indexOf("message") !== -1 || normalized.indexOf("messages") !== -1 || normalized.indexOf("text") !== -1 || normalized.indexOf("bubble") !== -1 || normalized.indexOf("prompt") !== -1;
      if (looksLikeProactive && looksLikeMessage) appendProactiveMessages(messages, config[key]);
    }
  }

  function extractProactiveMessages(data) {
    var messages = [];
    var response = data && typeof data === "object" && data.response && typeof data.response === "object" ? data.response : null;
    var config = response || data;
    collectFromConfigObject(messages, config);
    if (config && typeof config === "object") {
      collectFromConfigObject(messages, config.themeConfig);
      collectFromConfigObject(messages, config.theme_config);
      collectFromConfigObject(messages, config.settings);
      collectFromConfigObject(messages, config.widgetSettings);
      collectFromConfigObject(messages, config.widget_settings);
    }
    var unique = [];
    for (var i = 0; i < messages.length; i += 1) if (messages[i] && unique.indexOf(messages[i]) === -1) unique.push(messages[i]);
    return unique.slice(0, 2);
  }

  function getWidgetRoot(targetDoc) {
    var host = targetDoc.querySelector("[data-chatbot-widget-host]");
    return host && host.shadowRoot ? host.shadowRoot.querySelector(".widget-root") : null;
  }

  function getLauncher(targetDoc) {
    var host = targetDoc.querySelector("[data-chatbot-widget-host]");
    return host && host.shadowRoot ? host.shadowRoot.querySelector(".launcher") : null;
  }

  function isChatOpen(targetDoc) {
    var widgetRoot = getWidgetRoot(targetDoc);
    return widgetRoot && widgetRoot.getAttribute("data-open") === "true";
  }

  function installProactiveStyle(targetDoc) {
    if (!targetDoc.head || targetDoc.getElementById(PROACTIVE_STYLE_ID)) return;
    var style = targetDoc.createElement("style");
    style.id = PROACTIVE_STYLE_ID;
    style.textContent = [
      "#" + PROACTIVE_BOX_ID + "{position:fixed!important;right:20px!important;bottom:116px!important;display:none!important;flex-direction:column!important;gap:10px!important;align-items:flex-end!important;max-width:min(360px,calc(100vw - 40px))!important;margin:0!important;padding:0!important;pointer-events:auto!important;z-index:" + MAX_Z_INDEX + "!important;font-family:Inter,Arial,sans-serif!important;}",
      "#" + PROACTIVE_BOX_ID + "[data-position='left']{right:auto!important;left:20px!important;align-items:flex-start!important;}",
      "#" + PROACTIVE_BOX_ID + " .chatflow-proactive-overlay-message{box-sizing:border-box!important;width:max-content!important;max-width:min(360px,calc(100vw - 40px))!important;background:#fff!important;color:#111827!important;border:1px solid rgba(17,24,39,.12)!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(15,23,42,.10)!important;padding:13px 18px!important;font-size:14px!important;line-height:1.35!important;font-weight:400!important;text-align:left!important;white-space:normal!important;cursor:pointer!important;}",
      "#" + PROACTIVE_BOX_ID + " .chatflow-proactive-overlay-message:hover{box-shadow:0 10px 28px rgba(15,23,42,.14)!important;}",
      "@media(max-width:767px){#" + PROACTIVE_BOX_ID + "{right:16px!important;bottom:calc(106px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 32px)!important;}#" + PROACTIVE_BOX_ID + "[data-position='left']{right:auto!important;left:16px!important;}#" + PROACTIVE_BOX_ID + " .chatflow-proactive-overlay-message{max-width:calc(100vw - 32px)!important;}}"
    ].join("\n");
    targetDoc.head.appendChild(style);
  }

  function renderProactiveOverlay(targetDoc) {
    if (!targetDoc || !targetDoc.body) return;
    var win = targetDoc.defaultView || window;
    var state = win[PROACTIVE_STATE_KEY] || {};
    var messages = Array.isArray(state.messages) ? state.messages : [];
    installProactiveStyle(targetDoc);
    var box = targetDoc.getElementById(PROACTIVE_BOX_ID);
    if (!box) {
      box = targetDoc.createElement("div");
      box.id = PROACTIVE_BOX_ID;
      targetDoc.body.appendChild(box);
    }
    box.setAttribute("data-position", state.position === "left" ? "left" : "right");
    box.innerHTML = "";
    if (!messages.length || isChatOpen(targetDoc)) {
      box.style.setProperty("display", "none", "important");
      return;
    }
    for (var i = 0; i < messages.length; i += 1) {
      var bubble = targetDoc.createElement("div");
      bubble.className = "chatflow-proactive-overlay-message";
      bubble.textContent = messages[i];
      box.appendChild(bubble);
    }
    box.onclick = function () {
      var launcher = getLauncher(targetDoc);
      if (launcher && typeof launcher.click === "function") launcher.click();
      renderProactiveOverlay(targetDoc);
    };
    box.style.setProperty("display", "flex", "important");
  }

  function storeProactiveMessages(targetDoc, data) {
    var win = targetDoc.defaultView || window;
    var response = data && typeof data === "object" && data.response && typeof data.response === "object" ? data.response : data;
    var messages = extractProactiveMessages(data);
    win[PROACTIVE_STATE_KEY] = {
      messages: messages,
      position: response && response.position === "left" ? "left" : "right",
      updatedAt: Date.now()
    };
    renderProactiveOverlay(targetDoc);
  }

  function installProactiveFetchInterceptor(targetDoc) {
    var win = targetDoc.defaultView || window;
    if (!win.fetch || win[PROACTIVE_FETCH_FLAG]) return;
    win[PROACTIVE_FETCH_FLAG] = true;
    var nativeFetch = win.fetch.bind(win);
    win.fetch = function (input, init) {
      var requestUrl = typeof input === "string" ? input : (input && input.url) || "";
      return nativeFetch(input, init).then(function (response) {
        if (!requestUrl || requestUrl.indexOf("/api/1.1/wf/get-chatbot") === -1) return response;
        if (!response || !response.clone) return response;
        response.clone().json().then(function (data) {
          storeProactiveMessages(targetDoc, data);
          win.setTimeout(function () { renderProactiveOverlay(targetDoc); }, 0);
          win.setTimeout(function () { renderProactiveOverlay(targetDoc); }, 150);
          win.setTimeout(function () { renderProactiveOverlay(targetDoc); }, 600);
        }).catch(function () {});
        return response;
      });
    };
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
    renderProactiveOverlay(targetDoc);
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
      renderProactiveOverlay(targetDoc);
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

    installProactiveFetchInterceptor(targetDoc);

    if (!targetDoc.getElementById(scriptId)) {
      var script = targetDoc.createElement("script");
      script.id = scriptId;
      copyAttributes(sourceScript, script);
      script.setAttribute("data-chatflow-universal-injected", "true");
      script.src = CORE_WIDGET_SRC;
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
