(function () {
  var DEFAULT_API_HOST = "https://chatflowai.io";
  var INIT_STATE = "__chatbotWidgetInitState";
  var HOST_STATE = "__chatbotWidgetHostState";
  var MAX_INIT_ATTEMPTS = 20;
  var INIT_RETRY_DELAY = 400;
  var FALLBACK_TIMEOUTS = [0, 250, 750, 1500, 3000, 5000, 8000];
  var MAX_Z_INDEX = 2147483647;
  var REQUEST_TIMEOUT = 10000;
  var API_PATHS = {
    config: "/api/1.1/wf/get-chatbot?chatID=",
    createChat: "/api/1.1/wf/create-chat"
  };
  var EXECUTING_SCRIPT = detectCurrentScriptTag();

  function getScriptSignature(script) {
    if (!script) return "";
    return [
      script.getAttribute("src") || "",
      script.getAttribute("data-bot-id") || "",
      script.getAttribute("data-api-host") || ""
    ].join("::");
  }

  function getStackScriptSrc() {
    try {
      throw new Error();
    } catch (error) {
      var stack = (error && error.stack) || "";
      var srcMatch = stack.match(/(https?:[^\s)]+\.js(?:\?[^\s)]*)?)/i);
      if (srcMatch && srcMatch[1]) {
        return srcMatch[1];
      }

      var fileMatch = stack.match(/(file:[^\s)]+\.js(?:\?[^\s)]*)?)/i);
      return fileMatch && fileMatch[1] ? fileMatch[1] : "";
    }
  }

  function findScriptBySrc(src) {
    if (!src) return null;

    var normalizedSrc = src.split("#")[0];
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var candidate = scripts[i];
      if (!candidate || !candidate.src) {
        continue;
      }

      if (candidate.src === normalizedSrc || candidate.src.split("#")[0] === normalizedSrc) {
        return candidate;
      }
    }

    return null;
  }

  function findInteractiveScript() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      if (scripts[i] && scripts[i].readyState === "interactive") {
        return scripts[i];
      }
    }

    return null;
  }

  function detectCurrentScriptTag() {
    if (typeof document === "undefined") {
      return null;
    }

    if (document.currentScript && document.currentScript.tagName === "SCRIPT") {
      return document.currentScript;
    }

    var interactiveScript = findInteractiveScript();
    if (interactiveScript) {
      return interactiveScript;
    }

    var stackScript = findScriptBySrc(getStackScriptSrc());
    if (stackScript) {
      return stackScript;
    }

    var configuredScripts = document.querySelectorAll("script[data-bot-id]");
    if (configuredScripts.length === 1) {
      return configuredScripts[0];
    }

    if (configuredScripts.length > 1) {
      return configuredScripts[configuredScripts.length - 1];
    }

    return null;
  }

  function getCurrentScriptTag() {
    if (EXECUTING_SCRIPT && EXECUTING_SCRIPT.isConnected !== false) {
      return EXECUTING_SCRIPT;
    }

    return detectCurrentScriptTag();
  }

  function parseJson(value, fallback) {
    if (!value) return fallback;

    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function toBoolean(value, fallback) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      var normalized = value.toLowerCase().trim();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }

    return typeof fallback === "boolean" ? fallback : false;
  }

  function normalizeFontSize(value, fallback) {
    if (typeof value === "number" && !isNaN(value)) {
      return value + "px";
    }

    if (typeof value === "string" && value.trim()) {
      if (/^\d+(?:\.\d+)?$/.test(value.trim())) {
        return value.trim() + "px";
      }
      return value.trim();
    }

    return fallback;
  }

  function getDefaultLauncherIcon() {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
      '<rect width="64" height="64" rx="32" fill="#2563eb"/>' +
      '<path d="M20 23.5C20 19.9101 22.9101 17 26.5 17H37.5C41.0899 17 44 19.9101 44 23.5V30.5C44 34.0899 41.0899 37 37.5 37H31.5L24.5 43V37.7719C21.8692 36.9238 20 34.4607 20 31.5625V23.5Z" fill="white"/>' +
      '</svg>'
    );
  }

  function hasUserMessages(history) {
    for (var i = 0; i < history.length; i += 1) {
      if (history[i] && history[i].role === "user") {
        return true;
      }
    }

    return false;
  }

  function normalizeIconUrl(url, baseHost) {
    var raw = String(url || "").trim();
    if (!raw) return "";
    if (raw.indexOf("data:") === 0) return raw;
    if (raw.indexOf("blob:") === 0) return raw;
    if (/^https?:\/\//i.test(raw)) return encodeURI(raw);
    if (/^\/\//.test(raw) && typeof window !== "undefined" && window.location && window.location.protocol) {
      return window.location.protocol + raw;
    }
    if (/^\//.test(raw)) {
      if (baseHost) {
        return String(baseHost).replace(/\/$/, "") + raw;
      }
      if (typeof window !== "undefined" && window.location && window.location.origin) {
        return window.location.origin + raw;
      }
    }
    if (baseHost && !/^https?:\/\//i.test(raw)) {
      return String(baseHost).replace(/\/$/, "") + "/" + raw.replace(/^\//, "");
    }
    return encodeURI(raw);
  }

  function getCssBackgroundImage(url, baseHost) {
    var normalized = normalizeIconUrl(url, baseHost);
    return normalized ? ('url("' + normalized.replace(/"/g, "%22") + '")') : "none";
  }

  function getApiUrl(apiHost, path) {
    return String(apiHost || DEFAULT_API_HOST).replace(/\/$/, "") + path;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderMarkdown(text) {
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(text);
    }

    var source = String(text || "").replace(/\r\n/g, "\n");
    if (!source.trim()) {
      return "";
    }

    var codeBlocks = [];
    source = source.replace(/```([\s\S]*?)```/g, function (_, code) {
      var token = "__CODE_BLOCK_" + codeBlocks.length + "__";
      codeBlocks.push('<pre><code>' + escapeHtml(code).replace(/\n$/, "") + '</code></pre>');
      return token;
    });

    var blocks = source.split(/\n\s*\n/);
    var html = [];

    for (var i = 0; i < blocks.length; i += 1) {
      var block = blocks[i].trim();
      if (!block) {
        continue;
      }

      if (/^([-*]\s.+\n?)+$/.test(block)) {
        var items = block.split("\n");
        var listItems = [];
        for (var j = 0; j < items.length; j += 1) {
          if (!items[j]) continue;
          listItems.push("<li>" + renderInlineMarkdown(items[j].replace(/^[-*]\s+/, "")) + "</li>");
        }
        html.push("<ul>" + listItems.join("") + "</ul>");
      } else {
        html.push("<p>" + renderInlineMarkdown(block).replace(/\n/g, "<br>") + "</p>");
      }
    }

    var joined = html.join("");
    for (var k = 0; k < codeBlocks.length; k += 1) {
      joined = joined.replace("__CODE_BLOCK_" + k + "__", codeBlocks[k]);
    }

    return joined;
  }

  function createUid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "cw_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function getSessionStorageKey(botId) {
    return "chatbot-widget-session:" + botId;
  }

  function getHistoryStorageKey(botId) {
    return "chatbot-widget-history:" + botId;
  }

  function getStateStorageKey(botId) {
    return "chatbot-widget-ui-state:" + botId;
  }

  function getOrCreateSessionId(botId) {
    var key = getSessionStorageKey(botId);
    var existing = "";

    try {
      existing = window.localStorage.getItem(key) || "";
      if (!existing) {
        existing = createUid();
        window.localStorage.setItem(key, existing);
      }
    } catch (error) {
      existing = createUid();
    }

    return existing;
  }

  function loadStoredHistory(botId) {
    try {
      var stored = window.localStorage.getItem(getHistoryStorageKey(botId));
      return parseJson(stored, []) || [];
    } catch (error) {
      return [];
    }
  }

  function saveStoredHistory(botId, history) {
    try {
      window.localStorage.setItem(getHistoryStorageKey(botId), JSON.stringify(history || []));
    } catch (error) {
      return;
    }
  }

  function loadStoredUiState(botId) {
    try {
      return parseJson(window.localStorage.getItem(getStateStorageKey(botId)), {}) || {};
    } catch (error) {
      return {};
    }
  }

  function saveStoredUiState(botId, state) {
    try {
      window.localStorage.setItem(getStateStorageKey(botId), JSON.stringify(state || {}));
    } catch (error) {
      return;
    }
  }

  function requestWithTimeout(url, options, timeoutMs) {
    var controller = window.AbortController ? new AbortController() : null;
    var requestOptions = options || {};
    var timeoutId = null;

    if (controller) {
      requestOptions.signal = controller.signal;
    }

    return new Promise(function (resolve, reject) {
      timeoutId = window.setTimeout(function () {
        if (controller) {
          controller.abort();
        }
        reject(new Error("Request timed out"));
      }, timeoutMs);

      fetch(url, requestOptions).then(function (response) {
        window.clearTimeout(timeoutId);
        resolve(response);
      }).catch(function (error) {
        window.clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  function ensureHighZIndex(botId) {
    var styleId = "chatbot-widget-zindex-" + botId;
    if (document.getElementById(styleId)) {
      return;
    }

    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = [
      '[data-chatbot-widget-host="' + botId + '"] { z-index: ' + MAX_Z_INDEX + ' !important; }',
      '[data-chatbot-widget-host="' + botId + '"] * { box-sizing: border-box; }'
    ].join("\n");

    (document.head || document.documentElement).appendChild(style);
  }

  function getWidgetConfig(scriptTag) {
    return {
      botId: scriptTag.getAttribute("data-bot-id"),
      apiHost: scriptTag.getAttribute("data-api-host") || DEFAULT_API_HOST,
      chatPosition: scriptTag.getAttribute("data-position") || "right",
      userId: scriptTag.getAttribute("data-user-id") || "",
      themeConfig: parseJson(scriptTag.getAttribute("data-theme-config"), {})
    };
  }

  function normalizeRemoteConfig(widgetState, remoteConfig) {
    var fallbackThemeConfig = widgetState.config.themeConfig || {};
    var position = remoteConfig.position || widgetState.config.chatPosition || fallbackThemeConfig.position || "right";
    var normalizedPrompts = remoteConfig.starterPrompts;
    var resolvedIconUrl = remoteConfig.iconUrl ||
      remoteConfig.iconURL ||
      remoteConfig.icon ||
      remoteConfig.avatar ||
      remoteConfig.chatIcon ||
      remoteConfig.launcherIcon ||
      fallbackThemeConfig.iconUrl ||
      fallbackThemeConfig.icon ||
      "";
    var resolvedBrandingName = remoteConfig.brandingName ||
      remoteConfig.brandingText ||
      remoteConfig.brandName ||
      fallbackThemeConfig.brandingName ||
      fallbackThemeConfig.brandingText ||
      fallbackThemeConfig.brandName ||
      "Chatflow AI";
    var resolvedBrandingUrl = remoteConfig.brandingUrl ||
      remoteConfig.brandUrl ||
      fallbackThemeConfig.brandingUrl ||
      fallbackThemeConfig.brandUrl ||
      "https://chatflowai.io";

    if (typeof normalizedPrompts === "string") {
      normalizedPrompts = parseJson(normalizedPrompts, normalizedPrompts);
    }

    if (!Array.isArray(normalizedPrompts)) {
      normalizedPrompts = Array.isArray(fallbackThemeConfig.starterPrompts) ? fallbackThemeConfig.starterPrompts : [];
    }

    return {
      name: remoteConfig.name || fallbackThemeConfig.title || "Chat Assistant",
      primaryColor: remoteConfig.primaryColor || fallbackThemeConfig.primaryColor || "#2563eb",
      welcomeMessage: remoteConfig.welcomeMessage || fallbackThemeConfig.welcomeMessage || "",
      starterPrompts: normalizedPrompts,
      inputPlaceholder: remoteConfig.inputPlaceholder || fallbackThemeConfig.inputPlaceholder || "Message...",
      iconUrl: resolvedIconUrl,
      showBranding: toBoolean(remoteConfig.showBranding, toBoolean(fallbackThemeConfig.showBranding, false)),
      brandingText: resolvedBrandingName,
      brandingUrl: resolvedBrandingUrl,
      autoOpen: toBoolean(remoteConfig.autoOpen, toBoolean(fallbackThemeConfig.autoOpen, false)),
      theme: (remoteConfig.theme || fallbackThemeConfig.theme || "light").toLowerCase() === "dark" ? "dark" : "light",
      fontFamily: remoteConfig.fontFamily || fallbackThemeConfig.fontFamily || "Inter, Arial, sans-serif",
      fontSize: normalizeFontSize(remoteConfig.fontSize || fallbackThemeConfig.fontSize, "14px"),
      position: position === "left" ? "left" : "right"
    };
  }

  function buildWidgetMarkup(root, chatPosition) {
    root.innerHTML = [
      '<style>',
      ':host { all: initial; }',
      '.widget-root {',
      '  position: fixed;',
      '  bottom: calc(24px + env(safe-area-inset-bottom));',
      '  right: 20px;',
      '  z-index: ' + MAX_Z_INDEX + ';',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: flex-end;',
      '  gap: 14px;',
      '  font-family: var(--chatbot-font-family, Inter, Arial, sans-serif);',
      '  font-size: var(--chatbot-font-size, 14px);',
      '  color: #111827;',
      '  pointer-events: auto;',
      '}',
      '.widget-root[data-position="left"] { left: 20px; right: auto; align-items: flex-start; }',
      '.widget-root[data-theme="dark"] { color: #f9fafb; }',
      '.launcher {',
      '  width: 60px;',
      '  height: 60px;',
      '  border: none;',
      '  border-radius: 999px;',
      '  overflow: hidden;',
      '  cursor: pointer;',
      '  color: #fff;',
      '  background-color: var(--chatbot-primary, #2563eb);',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '  background-size: cover;',
      '  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);',
      '  font-size: 24px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  pointer-events: auto;',
      '}',
      '.panel {',
      '  width: min(400px, calc(100vw - 32px));',
      '  height: min(680px, calc(100vh - 116px - env(safe-area-inset-bottom)));',
      '  max-height: calc(100vh - 116px - env(safe-area-inset-bottom));',
      '  border-radius: 24px;',
      '  overflow: hidden;',
      '  background: #f5f5f5;',
      '  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.16);',
      '  border: 1px solid rgba(229, 231, 235, 0.9);',
      '  display: none;',
      '  pointer-events: auto;',
      '}',
      '.widget-root[data-open="true"] .panel { display: flex; flex-direction: column; }',
      '.widget-root[data-theme="dark"] .panel { background: #111827; border-color: rgba(55, 65, 81, 0.9); }',
      '.chat-container { flex: 1; display: flex; flex-direction: column; height: 100%; width: 100%; background: #f5f5f5; pointer-events: auto; min-height: 0; }',
      '.widget-root[data-theme="dark"] .chat-container { background: #111827; }',
      '.header { padding: 16px; font-weight: 600; color: white; background: var(--chatbot-primary, #2563eb); display: flex; align-items: center; justify-content: space-between; gap: 12px; }',
      '.header-main { display: flex; align-items: center; gap: 10px; min-width: 0; }',
      '.header-avatar { width: 28px; height: 28px; border-radius: 999px; background-color: rgba(255, 255, 255, 0.18); background-repeat: no-repeat; background-position: center; background-size: cover; flex: 0 0 auto; }',
      '.header-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.header-actions { display: flex; align-items: center; gap: 8px; }',
      '.header-btn { background: transparent; border: none; color: inherit; cursor: pointer; font-size: 18px; line-height: 1; padding: 0; }',
      '.messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; background: #f5f5f5; scrollbar-width: thin; scrollbar-color: var(--chatbot-primary, #2563eb) transparent; }',
      '.messages::-webkit-scrollbar { width: 6px; }',
      '.messages::-webkit-scrollbar-thumb { background: var(--chatbot-primary, #2563eb); border-radius: 10px; }',
      '.widget-root[data-theme="dark"] .messages { background: #111827; }',
      '.message { margin-bottom: 12px; display: flex; flex-direction: column; max-width: 100%; }',
      '.user { align-items: flex-end; }',
      '.bot { align-items: flex-start; }',
      '.bubble-msg { max-width: 75%; padding: 12px 14px; border-radius: 16px; font-size: 1em; line-height: 1.5; word-break: break-word; white-space: normal; }',
      '.bubble-msg p { margin: 4px 0; }',
      '.bubble-msg ul { padding-left: 18px; margin: 6px 0; }',
      '.bubble-msg li { margin: 3px 0; }',
      '.bubble-msg a { color: #2563eb; text-decoration: underline; }',
      '.bubble-msg pre { background: #111; color: #fff; padding: 10px; border-radius: 8px; overflow: auto; margin-top: 6px; }',
      '.bubble-msg code { background: #e5e7eb; padding: 2px 4px; border-radius: 4px; }',
      '.widget-root[data-theme="dark"] .bubble-msg code { background: #1f2937; color: #f9fafb; }',
      '.starter-prompts { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; background: #f5f5f5; max-height: 150px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--chatbot-primary, #2563eb) transparent; }',
      '.starter-prompts::-webkit-scrollbar { width: 6px; }',
      '.starter-prompts::-webkit-scrollbar-thumb { background: var(--chatbot-primary, #2563eb); border-radius: 10px; }',
      '.starter-prompts:empty { display: none; }',
      '.widget-root[data-theme="dark"] .starter-prompts { background: #111827; }',
      '.starter-prompts[data-hidden="true"] { display: none; }',
      '.prompt { width: fit-content; max-width: 100%; background: white; border: 1px solid #e5e7eb; padding: 10px 14px; border-radius: 999px; font-size: 0.93em; cursor: pointer; color: inherit; text-align: left; }',
      '.prompt:hover { background: #f9fafb; }',
      '.widget-root[data-theme="dark"] .prompt { background: #1f2937; border-color: #374151; color: #f9fafb; }',
      '.widget-root[data-theme="dark"] .prompt:hover { background: #273449; }',
      '.input-area { padding: 12px; display: flex; background: white; border-top: 1px solid #eee; }',
      '.widget-root[data-theme="dark"] .input-area { background: #0f172a; border-top-color: #1f2937; }',
      '.chat-input { flex: 1; padding: 12px 14px; border-radius: 999px; border: 1px solid #ddd; outline: none; font-size: 1em; font-family: inherit; background: white; color: #111827; }',
      '.chat-input:disabled { background: #f9fafb; cursor: not-allowed; }',
      '.widget-root[data-theme="dark"] .chat-input { background: #111827; border-color: #374151; color: #f9fafb; }',
      '.widget-root[data-theme="dark"] .chat-input:disabled { background: #111827; }',
      '.send-btn { margin-left: 8px; width: 40px; height: 40px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; font-size: 16px; background: var(--chatbot-primary, #2563eb); }',
      '.send-btn:disabled { opacity: 0.7; cursor: not-allowed; }',
      '.typing { display: inline-flex; gap: 4px; }',
      '.typing span { width: 6px; height: 6px; background: #999; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }',
      '.typing span:nth-child(1) { animation-delay: -0.32s; }',
      '.typing span:nth-child(2) { animation-delay: -0.16s; }',
      '.branding { padding: 10px 16px 12px; background: white; border-top: 1px solid #eee; border-bottom: 1px solid #eee; text-align: center; display: none; }',
      '.branding[data-visible="true"] { display: block; }',
      '.widget-root[data-theme="dark"] .branding { background: #0f172a; border-top-color: #1f2937; border-bottom-color: #1f2937; }',
      '.branding-link { font-size: 0.85em; color: #6b7280; text-decoration: none; }',
      '.branding-link:hover { text-decoration: underline; }',
      '.widget-root[data-theme="dark"] .branding-link { color: #cbd5e1; }',
      '.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }',
      '@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }',
      '@media (max-width: 767px) {',
      '  .widget-root { right: 0 !important; left: 0 !important; bottom: 0 !important; gap: 0; justify-content: flex-end; align-items: stretch; }',
      '  .widget-root[data-position="left"] { left: 0 !important; right: 0 !important; }',
      '  .panel { width: 100vw !important; height: 100vh !important; max-height: 100vh !important; border-radius: 0 !important; }',
      '  .widget-root[data-open="true"] .panel { position: fixed; inset: 0; }',
      '  .launcher { position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); }',
      '}',
      '</style>',
      '<div class="widget-root" data-position="' + (chatPosition === "left" ? "left" : "right") + '" data-open="false" data-theme="light">',
      '  <div class="panel">',
      '    <div class="chat-container">',
      '      <div class="header">',
      '        <div class="header-main">',
      '          <div class="header-avatar" data-role="header-avatar"></div>',
      '          <div class="header-title" data-role="header-title">Chat Assistant</div>',
      '        </div>',
      '        <div class="header-actions">',
      '          <button class="header-btn" type="button" data-role="clear-btn" aria-label="Clear conversation">↺</button>',
      '          <button class="header-btn" type="button" data-role="close-btn" aria-label="Close chat">×</button>',
      '        </div>',
      '      </div>',
      '      <div class="messages" data-role="messages"></div>',
      '      <div class="starter-prompts" data-role="prompts"></div>',
      '      <div class="input-area">',
      '        <label class="sr-only" for="chatbot-widget-input">Message</label>',
      '        <input id="chatbot-widget-input" class="chat-input" data-role="input" placeholder="Message..." />',
      '        <button class="send-btn" type="button" data-role="send-btn" aria-label="Send message">➤</button>',
      '      </div>',
      '      <div class="branding" data-role="branding" data-visible="false">',
      '        <a class="branding-link" data-role="branding-link" href="#" target="_blank" rel="noopener noreferrer"></a>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <button class="launcher" type="button" data-role="launcher" aria-label="Open chat">💬</button>',
      '</div>'
    ].join("");
  }

  function createWidgetState(host, root, config) {
    var defaults = normalizeRemoteConfig({ config: config }, {});

    return {
      host: host,
      root: root,
      config: config,
      sessionId: getOrCreateSessionId(config.botId),
      history: loadStoredHistory(config.botId),
      uiState: (function(){
        var ui = loadStoredUiState(config.botId);
        ui.open = false;
        return ui;
      })(),
      elements: {
        widgetRoot: root.querySelector(".widget-root"),
        panel: root.querySelector(".panel"),
        launcher: root.querySelector('[data-role="launcher"]'),
        closeBtn: root.querySelector('[data-role="close-btn"]'),
        clearBtn: root.querySelector('[data-role="clear-btn"]'),
        headerTitle: root.querySelector('[data-role="header-title"]'),
        headerAvatar: root.querySelector('[data-role="header-avatar"]'),
        messages: root.querySelector('[data-role="messages"]'),
        prompts: root.querySelector('[data-role="prompts"]'),
        input: root.querySelector('[data-role="input"]'),
        sendBtn: root.querySelector('[data-role="send-btn"]'),
        branding: root.querySelector('[data-role="branding"]'),
        brandingLink: root.querySelector('[data-role="branding-link"]')
      },
      title: defaults.name,
      primaryColor: defaults.primaryColor,
      welcomeMessage: defaults.welcomeMessage,
      starterPrompts: defaults.starterPrompts,
      placeholder: defaults.inputPlaceholder,
      iconUrl: defaults.iconUrl,
      showBranding: defaults.showBranding,
      brandingText: defaults.brandingText,
      brandingUrl: defaults.brandingUrl,
      autoOpen: defaults.autoOpen,
      theme: defaults.theme,
      fontFamily: defaults.fontFamily,
      fontSize: defaults.fontSize,
      isLoading: false,
      configLoaded: false,
      typingTimer: null
    };
  }

  function ensureWidgetHost(config) {
    if (!window[HOST_STATE]) {
      window[HOST_STATE] = {};
    }

    if (window[HOST_STATE][config.botId]) {
      return window[HOST_STATE][config.botId];
    }

    var existingHost = document.getElementById("chatbot-widget-host-" + config.botId);
    var host = existingHost || document.createElement("div");
    if (!existingHost) {
      host.id = "chatbot-widget-host-" + config.botId;
      host.setAttribute("data-chatbot-widget-host", config.botId);
      host.style.all = "initial";
      host.style.position = "fixed";
      host.style.inset = "0";
      host.style.pointerEvents = "none";
      host.style.zIndex = String(MAX_Z_INDEX);
      document.documentElement.appendChild(host);
    }

    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    if (!root.querySelector(".widget-root")) {
      buildWidgetMarkup(root, config.chatPosition);
    }

    var widgetState = createWidgetState(host, root, config);
    window[HOST_STATE][config.botId] = widgetState;
    return widgetState;
  }

  function ensureConversationStartedState(widgetState) {
    widgetState.uiState.hasStartedConversation = hasUserMessages(widgetState.history);
    saveStoredUiState(widgetState.config.botId, widgetState.uiState);
  }

  function shouldShowStarterPrompts(widgetState) {
    return !widgetState.uiState.hasStartedConversation;
  }

  function syncLauncherState(widgetState) {
    var isOpen = widgetState.elements.widgetRoot.getAttribute("data-open") === "true";

    if (isOpen) {
      widgetState.elements.launcher.style.backgroundImage = "none";
      widgetState.elements.launcher.innerHTML = "<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><path d=\"M6 9L12 15L18 9\" stroke=\"white\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
      widgetState.elements.launcher.style.fontSize = "0";
      return;
    }

    var launcherIcon = normalizeIconUrl(widgetState.iconUrl || getDefaultLauncherIcon(), widgetState.config.apiHost);
    widgetState.elements.launcher.innerHTML = launcherIcon
      ? '<img src="' + launcherIcon.replace(/"/g, "%22") + '" alt="" aria-hidden="true" style="width:100%;height:100%;object-fit:cover;border-radius:999px;display:block;transform:scale(1.12);" />'
      : "";
    widgetState.elements.launcher.style.fontSize = "0";
    widgetState.elements.launcher.style.backgroundImage = "none";
  }

  function setWidgetPosition(widgetState, position) {
    var resolvedPosition = position === "left" ? "left" : "right";
    widgetState.config.chatPosition = resolvedPosition;
    widgetState.elements.widgetRoot.setAttribute("data-position", resolvedPosition);
  }

  function setWidgetOpen(widgetState, isOpen, persistState) {
    widgetState.elements.widgetRoot.setAttribute("data-open", isOpen ? "true" : "false");

    if (persistState !== false) {
      widgetState.uiState.open = !!isOpen;
      saveStoredUiState(widgetState.config.botId, widgetState.uiState);
    }

    syncLauncherState(widgetState);

    if (isOpen) {
      setTimeout(function () {
        widgetState.elements.input.focus();
        widgetState.elements.messages.scrollTop = widgetState.elements.messages.scrollHeight;
      }, 0);
    }
  }

  function updateBranding(widgetState) {
    widgetState.host.style.setProperty("--chatbot-primary", widgetState.primaryColor || "#2563eb");
    widgetState.host.style.setProperty("--chatbot-font-family", widgetState.fontFamily || "Inter, Arial, sans-serif");
    widgetState.host.style.setProperty("--chatbot-font-size", widgetState.fontSize || "14px");

    widgetState.elements.headerTitle.textContent = widgetState.title || "Chat Assistant";
    widgetState.elements.sendBtn.style.background = widgetState.primaryColor;
    widgetState.elements.launcher.style.background = widgetState.primaryColor;
    widgetState.elements.widgetRoot.setAttribute("data-theme", widgetState.theme === "dark" ? "dark" : "light");

    setWidgetPosition(widgetState, widgetState.config.chatPosition);
    syncLauncherState(widgetState);

    var headerIcon = widgetState.iconUrl || getDefaultLauncherIcon();
    widgetState.elements.headerAvatar.style.backgroundImage = getCssBackgroundImage(headerIcon, widgetState.config.apiHost);

    var shouldShowBranding = !!widgetState.showBranding && !!widgetState.brandingText && !!widgetState.brandingUrl;
    widgetState.elements.branding.setAttribute("data-visible", shouldShowBranding ? "true" : "false");
    widgetState.elements.brandingLink.textContent = shouldShowBranding ? widgetState.brandingText : "";
    widgetState.elements.brandingLink.href = shouldShowBranding ? widgetState.brandingUrl : "#";
    widgetState.elements.brandingLink.style.pointerEvents = shouldShowBranding ? "auto" : "none";
    widgetState.elements.input.placeholder = widgetState.placeholder || "Message...";
  }

  function renderPrompts(widgetState, list) {
    var promptsContainer = widgetState.elements.prompts;
    promptsContainer.innerHTML = "";
    promptsContainer.setAttribute("data-hidden", shouldShowStarterPrompts(widgetState) ? "false" : "true");

    if (!shouldShowStarterPrompts(widgetState)) {
      return;
    }

    if (typeof list === "string") {
      list = parseJson(list, []);
    }

    if (!Array.isArray(list)) {
      return;
    }

    for (var i = 0; i < list.length; i += 1) {
      if (!list[i]) continue;
      var btn = document.createElement("button");
      btn.className = "prompt";
      btn.type = "button";
      btn.textContent = list[i];
      btn.addEventListener("click", function (event) {
        widgetState.elements.input.value = event.currentTarget.textContent || "";
        sendMessage(widgetState);
      });
      promptsContainer.appendChild(btn);
    }
  }

  function createTypingMarkup() {
    return '<div class="typing"><span></span><span></span><span></span></div>';
  }

  function scrollMessagesToBottom(widgetState) {
    widgetState.elements.messages.scrollTop = widgetState.elements.messages.scrollHeight;
  }

  function updateMessageScrollMode(widgetState) {
    var onlyWelcomeMessage = widgetState.history.length === 1 &&
      widgetState.history[0] &&
      widgetState.history[0].role === "bot" &&
      widgetState.history[0].text === widgetState.welcomeMessage;

    widgetState.elements.messages.style.overflowY = onlyWelcomeMessage ? "hidden" : "auto";
  }

  function persistHistory(widgetState) {
    saveStoredHistory(widgetState.config.botId, widgetState.history);
  }

  function appendMessage(widgetState, message) {
    var normalized = {
      role: message.role === "user" ? "user" : "bot",
      text: String(message.text || "")
    };

    if (!message.skipPersist) {
      widgetState.history.push({ role: normalized.role, text: normalized.text });
      if (normalized.role === "user") {
        widgetState.uiState.hasStartedConversation = true;
        saveStoredUiState(widgetState.config.botId, widgetState.uiState);
        renderPrompts(widgetState, widgetState.starterPrompts);
      }
      persistHistory(widgetState);
    }

    var msg = document.createElement("div");
    msg.className = "message " + normalized.role;

    var bubble = document.createElement("div");
    bubble.className = "bubble-msg";

    if (normalized.role === "user") {
      bubble.style.background = widgetState.primaryColor;
      bubble.style.color = "white";
      bubble.style.borderBottomRightRadius = "6px";
      bubble.textContent = normalized.text;
    } else {
      bubble.style.background = widgetState.theme === "dark" ? "#1f2937" : "white";
      bubble.style.color = widgetState.theme === "dark" ? "#f9fafb" : "#111";
      bubble.style.borderBottomLeftRadius = "6px";
      bubble.innerHTML = renderMarkdown(normalized.text);
    }

    msg.appendChild(bubble);
    widgetState.elements.messages.appendChild(msg);
    updateMessageScrollMode(widgetState);

    var isOnlyWelcomeMessage = normalized.role === "bot" &&
      widgetState.history.length === 1 &&
      normalized.text === widgetState.welcomeMessage;

    if (isOnlyWelcomeMessage) {
      widgetState.elements.messages.scrollTop = 0;
    } else {
      scrollMessagesToBottom(widgetState);
    }

    return bubble;
  }

  function typeWriter(widgetState, element, text) {
    var i = 0;
    var temp = "";

    if (widgetState.typingTimer) {
      window.clearTimeout(widgetState.typingTimer);
      widgetState.typingTimer = null;
    }

    function type() {
      if (i < text.length) {
        temp += text.charAt(i);
        element.textContent = temp;
        i += 1;
        scrollMessagesToBottom(widgetState);
        widgetState.typingTimer = window.setTimeout(type, 15);
      } else {
        element.innerHTML = renderMarkdown(text);
        widgetState.typingTimer = null;
      }
    }

    type();
  }

  function restoreHistory(widgetState) {
    widgetState.elements.messages.innerHTML = "";

    for (var i = 0; i < widgetState.history.length; i += 1) {
      appendMessage(widgetState, {
        role: widgetState.history[i].role,
        text: widgetState.history[i].text,
        skipPersist: true
      });
    }
    updateMessageScrollMode(widgetState);
  }

  function resetConversation(widgetState) {
    widgetState.history = [];
    widgetState.uiState.hasStartedConversation = false;
    saveStoredUiState(widgetState.config.botId, widgetState.uiState);
    persistHistory(widgetState);
    widgetState.elements.messages.innerHTML = "";
    renderPrompts(widgetState, widgetState.starterPrompts);
    if (widgetState.welcomeMessage) {
      appendMessage(widgetState, { role: "bot", text: widgetState.welcomeMessage });
    }
    updateMessageScrollMode(widgetState);
  }

  function normalizeConfigResponse(data) {
    return (data && data.response) || data || {};
  }

  function applyRemoteConfig(widgetState, remoteConfig) {
    var normalized = normalizeRemoteConfig(widgetState, remoteConfig);

    widgetState.title = normalized.name;
    widgetState.primaryColor = normalized.primaryColor;
    widgetState.welcomeMessage = normalized.welcomeMessage;
    widgetState.starterPrompts = normalized.starterPrompts;
    widgetState.placeholder = normalized.inputPlaceholder;
    widgetState.iconUrl = normalized.iconUrl;
    widgetState.showBranding = normalized.showBranding;
    widgetState.brandingText = normalized.brandingText;
    widgetState.brandingUrl = normalized.brandingUrl;
    widgetState.autoOpen = normalized.autoOpen;
    widgetState.theme = normalized.theme;
    widgetState.fontFamily = normalized.fontFamily;
    widgetState.fontSize = normalized.fontSize;
    widgetState.config.chatPosition = normalized.position;
    widgetState.configLoaded = true;

    ensureConversationStartedState(widgetState);
    updateBranding(widgetState);
    restoreHistory(widgetState);
    renderPrompts(widgetState, widgetState.starterPrompts);

    if (!widgetState.history.length && widgetState.welcomeMessage) {
      appendMessage(widgetState, { role: "bot", text: widgetState.welcomeMessage });
    }

    if (widgetState.autoOpen) {
      setWidgetOpen(widgetState, true);
    } else {
      setWidgetOpen(widgetState, false, false);
    }
  }

  function loadRemoteConfig(widgetState) {
    var url = getApiUrl(widgetState.config.apiHost, API_PATHS.config + encodeURIComponent(widgetState.config.botId));

    return requestWithTimeout(url, { method: "GET" }, REQUEST_TIMEOUT)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Config request failed");
        }
        return response.json();
      })
      .then(function (data) {
        applyRemoteConfig(widgetState, normalizeConfigResponse(data));
      }).catch(function () {
        applyRemoteConfig(widgetState, {});
      });
  }

  function setLoadingState(widgetState, isLoading) {
    widgetState.isLoading = !!isLoading;
    widgetState.elements.sendBtn.disabled = !!isLoading;
    widgetState.elements.input.disabled = !!isLoading;
  }

  function createBotLoadingBubble(widgetState) {
    var bubble = appendMessage(widgetState, { role: "bot", text: "", skipPersist: true });
    bubble.innerHTML = createTypingMarkup();
    return bubble;
  }

  function updatePendingBotMessage(widgetState, bubble, text) {
    var lastMessage = widgetState.history[widgetState.history.length - 1];
    if (!lastMessage || lastMessage.role !== "bot" || lastMessage.text !== text) {
      widgetState.history.push({ role: "bot", text: text });
      persistHistory(widgetState);
    }
    typeWriter(widgetState, bubble, text);
  }

  function sendChatRequest(widgetState, messageText, attempt) {
    var url = getApiUrl(widgetState.config.apiHost, API_PATHS.createChat);
    var payload = {
      botId: widgetState.config.botId,
      message: messageText,
      sessionId: widgetState.sessionId
    };

    if (widgetState.config.userId) {
      payload.userId = widgetState.config.userId;
    }

    return requestWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }, REQUEST_TIMEOUT).then(function (response) {
      if (!response.ok) {
        throw new Error("Chat request failed");
      }
      return response.json();
    }).catch(function (error) {
      if (attempt < 1) {
        return sendChatRequest(widgetState, messageText, attempt + 1);
      }
      throw error;
    });
  }

  function sendMessage(widgetState) {
    if (widgetState.isLoading) {
      return;
    }

    var input = widgetState.elements.input;
    var text = String(input.value || "").trim();
    if (!text) {
      return;
    }

    setWidgetOpen(widgetState, true);
    appendMessage(widgetState, { role: "user", text: text });
    input.value = "";
    var botBubble = createBotLoadingBubble(widgetState);
    setLoadingState(widgetState, true);

    sendChatRequest(widgetState, text, 0).then(function (data) {
      var reply = data.text || (data.response && data.response.text) || "No response.";
      updatePendingBotMessage(widgetState, botBubble, reply);
      setLoadingState(widgetState, false);
      input.focus();
    }).catch(function () {
      var errorText = "Server error. Please try again.";
      updatePendingBotMessage(widgetState, botBubble, errorText);
      setLoadingState(widgetState, false);
      input.focus();
    });
  }

  function bindWidgetEvents(widgetState) {
    if (widgetState.eventsBound) {
      return;
    }

    widgetState.eventsBound = true;

    widgetState.elements.launcher.addEventListener("click", function () {
      setWidgetOpen(widgetState, widgetState.elements.widgetRoot.getAttribute("data-open") !== "true");
    });

    widgetState.elements.closeBtn.addEventListener("click", function () {
      setWidgetOpen(widgetState, false);
    });

    widgetState.elements.clearBtn.addEventListener("click", function () {
      resetConversation(widgetState);
    });

    widgetState.elements.sendBtn.addEventListener("click", function () {
      sendMessage(widgetState);
    });

    widgetState.elements.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage(widgetState);
      }
    });
  }

  function bootstrapWidget(widgetState) {
    ensureHighZIndex(widgetState.config.botId);
    bindWidgetEvents(widgetState);
    ensureConversationStartedState(widgetState);
    restoreHistory(widgetState);
    applyRemoteConfig(widgetState, {});
    loadRemoteConfig(widgetState);
  }

  function scheduleInitAttempt(reason) {
    if (!window[INIT_STATE] || !window[INIT_STATE].bootstrapped) {
      return;
    }

    var state = window[INIT_STATE];
    if (state.scheduledReasons[reason]) {
      return;
    }

    state.scheduledReasons[reason] = true;
    attemptInit(reason);
  }

  function attemptInit(reason) {
    var state = window[INIT_STATE];
    if (!state) {
      return;
    }

    var scriptTag = getCurrentScriptTag();
    if (!scriptTag) {
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () {
          attemptInit("retry-no-script-" + state.attempts);
        }, INIT_RETRY_DELAY);
      }
      return;
    }

    var signature = getScriptSignature(scriptTag);
    if (state.lastSignature && state.lastSignature !== signature) {
      state.started = false;
    }
    state.lastSignature = signature;

    var config = getWidgetConfig(scriptTag);
    if (!config.botId) {
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () {
          attemptInit("retry-no-bot-id-" + state.attempts);
        }, INIT_RETRY_DELAY);
      }
      return;
    }

    if (!document.documentElement) {
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () {
          attemptInit("retry-no-dom-" + state.attempts);
        }, INIT_RETRY_DELAY);
      }
      return;
    }

    if (state.started && state.botId === config.botId) {
      return;
    }

    state.started = true;
    state.botId = config.botId;

    if (!state.bots[config.botId]) {
      state.bots[config.botId] = { initialized: false, initializing: false };
    }

    var botState = state.bots[config.botId];
    if (botState.initialized || botState.initializing) {
      return;
    }

    botState.initializing = true;

    try {
      var widgetState = ensureWidgetHost(config);
      bootstrapWidget(widgetState);
      botState.initializing = false;
      botState.initialized = true;
      state.completedReason = reason;
    } catch (error) {
      botState.initializing = false;
      state.started = false;
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () {
          attemptInit("retry-bootstrap-" + state.attempts);
        }, INIT_RETRY_DELAY);
      }
    }
  }

  function bootstrapInitTriggers() {
    if (!window[INIT_STATE]) {
      window[INIT_STATE] = {
        attempts: 0,
        bots: {},
        bootstrapped: true,
        started: false,
        botId: "",
        lastSignature: "",
        scheduledReasons: {}
      };
    }

    var state = window[INIT_STATE];
    if (state.listenersBound) {
      scheduleInitAttempt("reentrant-call");
      return;
    }

    state.listenersBound = true;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        scheduleInitAttempt("dom-content-loaded");
      }, { once: true });
    } else {
      scheduleInitAttempt("dom-already-ready");
    }

    window.addEventListener("load", function () {
      scheduleInitAttempt("window-load");
    }, { once: true });

    for (var i = 0; i < FALLBACK_TIMEOUTS.length; i += 1) {
      (function (delay) {
        setTimeout(function () {
          scheduleInitAttempt("timeout-" + delay);
        }, delay);
      })(FALLBACK_TIMEOUTS[i]);
    }

    scheduleInitAttempt("immediate");
  }

  bootstrapInitTriggers();
})();
