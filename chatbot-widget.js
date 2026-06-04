(function () {
  var DEFAULT_API_HOST = "https://chatflowai.io";
  var INIT_STATE = "__chatbotWidgetInitState";
  var HOST_STATE = "__chatbotWidgetHostState";
  var MAX_INIT_ATTEMPTS = 20;
  var INIT_RETRY_DELAY = 400;
  var FALLBACK_TIMEOUTS = [0, 250, 750, 1500, 3000, 5000, 8000];
  var MAX_Z_INDEX = 2147483647;
  var REQUEST_TIMEOUT = 60000;
  var API_PATHS = {
    config: "/api/1.1/wf/get-chatbot?botId=",
    createChat: "/api/1.1/wf/create-chat"
  };
  var STREAM_CHAT_URL = "https://chatbot-backend-w1ju.onrender.com/api/chat?stream=true";
  var EXECUTING_SCRIPT = detectCurrentScriptTag();

  function getScriptSignature(script) {
    if (!script) return "";
    return [
      script.getAttribute("src") || "",
      script.getAttribute("data-bot-id") || "",
      script.getAttribute("data-chat-id") || script.getAttribute("data-chatid") || "",
      script.getAttribute("data-api-host") || "",
      script.getAttribute("data-chatbot-token") || script.getAttribute("data-token") || script.getAttribute("data-widget-token") || "",
      script.getAttribute("data-stream-api-url") || "",
      script.getAttribute("data-bubble-version") || script.getAttribute("data-version") || script.getAttribute("data-bubble-env") || script.getAttribute("data-env") || script.getAttribute("data-mode") || script.getAttribute("data-is-test-version") || ""
    ].join("::");
  }

  function getStackScriptSrc() {
    try { throw new Error(); }
    catch (error) {
      var stack = (error && error.stack) || "";
      var srcMatch = stack.match(/(https?:[^\s)]+\.js(?:\?[^\s)]*)?)/i);
      if (srcMatch && srcMatch[1]) return srcMatch[1];
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
      if (!candidate || !candidate.src) continue;
      if (candidate.src === normalizedSrc || candidate.src.split("#")[0] === normalizedSrc) return candidate;
    }
    return null;
  }

  function findInteractiveScript() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      if (scripts[i] && scripts[i].readyState === "interactive") return scripts[i];
    }
    return null;
  }

  function detectCurrentScriptTag() {
    if (typeof document === "undefined") return null;
    if (document.currentScript && document.currentScript.tagName === "SCRIPT") return document.currentScript;
    var interactiveScript = findInteractiveScript();
    if (interactiveScript) return interactiveScript;
    var stackScript = findScriptBySrc(getStackScriptSrc());
    if (stackScript) return stackScript;
    var configuredScripts = document.querySelectorAll("script[data-bot-id]");
    if (configuredScripts.length === 1) return configuredScripts[0];
    if (configuredScripts.length > 1) return configuredScripts[configuredScripts.length - 1];
    return null;
  }

  function getCurrentScriptTag() {
    if (EXECUTING_SCRIPT && EXECUTING_SCRIPT.isConnected !== false) return EXECUTING_SCRIPT;
    return detectCurrentScriptTag();
  }

  function parseJson(value, fallback) {
    if (!value) return fallback;
    try { return JSON.parse(value); }
    catch (error) { return fallback; }
  }

  function toBoolean(value, fallback) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      var normalized = value.toLowerCase().trim();
      if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
      if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    }
    return typeof fallback === "boolean" ? fallback : false;
  }

  function normalizeFontSize(value, fallback) {
    if (typeof value === "number" && !isNaN(value)) return value + "px";
    if (typeof value === "string" && value.trim()) {
      if (/^\d+(?:\.\d+)?$/.test(value.trim())) return value.trim() + "px";
      return value.trim();
    }
    return fallback;
  }

  function getDefaultLauncherIcon() {
    return "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="32" fill="#2563eb"/><path d="M20 23.5C20 19.9101 22.9101 17 26.5 17H37.5C41.0899 17 44 19.9101 44 23.5V30.5C44 34.0899 41.0899 37 37.5 37H31.5L24.5 43V37.7719C21.8692 36.9238 20 34.4607 20 31.5625V23.5Z" fill="white"/></svg>');
  }

  function hasUserMessages(history) {
    for (var i = 0; i < history.length; i += 1) if (history[i] && history[i].role === "user") return true;
    return false;
  }

  function normalizeIconUrl(url, baseHost) {
    var raw = String(url || "").trim();
    if (!raw) return "";
    if (raw.indexOf("data:") === 0 || raw.indexOf("blob:") === 0) return raw;
    if (/^https?:\/\//i.test(raw)) return encodeURI(raw);
    if (/^\/\//.test(raw) && window.location && window.location.protocol) return window.location.protocol + raw;
    if (/^\//.test(raw)) return baseHost ? String(baseHost).replace(/\/$/, "") + raw : window.location.origin + raw;
    if (baseHost && !/^https?:\/\//i.test(raw)) return String(baseHost).replace(/\/$/, "") + "/" + raw.replace(/^\//, "");
    return encodeURI(raw);
  }

  function getCssBackgroundImage(url, baseHost) {
    var normalized = normalizeIconUrl(url, baseHost);
    return normalized ? ('url("' + normalized.replace(/"/g, "%22") + '")') : "none";
  }

  function isTestVersionValue(value) {
    if (typeof value === "boolean") return value;
    var normalized = String(value || "").toLowerCase().trim();
    return normalized === "test" || normalized === "version-test" || normalized === "development" || normalized === "dev" || normalized === "true" || normalized === "1" || normalized === "yes";
  }

  function getBubbleVersionFromScript(scriptTag) {
    return scriptTag.getAttribute("data-bubble-version") || scriptTag.getAttribute("data-version") || scriptTag.getAttribute("data-bubble-env") || scriptTag.getAttribute("data-env") || scriptTag.getAttribute("data-mode") || scriptTag.getAttribute("data-is-test-version") || "live";
  }

  function getVersionedApiHost(apiHost, isTestVersion) {
    var host = String(apiHost || DEFAULT_API_HOST).replace(/\/$/, "");
    if (isTestVersionValue(isTestVersion)) return /\/version-test$/i.test(host) ? host : host + "/version-test";
    return host.replace(/\/version-test$/i, "");
  }

  function getApiUrl(apiHostOrConfig, path) {
    var apiHost = apiHostOrConfig, isTestVersion = false;
    if (apiHostOrConfig && typeof apiHostOrConfig === "object") {
      apiHost = apiHostOrConfig.apiHost;
      isTestVersion = apiHostOrConfig.isTestVersion;
    }
    return getVersionedApiHost(apiHost, isTestVersion) + path;
  }

  function getFirstValue(source, fieldNames) {
    if (!source) return "";
    for (var i = 0; i < fieldNames.length; i += 1) {
      var value = source[fieldNames[i]];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function normalizeIdentifier(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function getChatIdForRequests(widgetState) {
    return normalizeIdentifier(widgetState.config.chatId || widgetState.config.botId);
  }

  function getConversationStorageId(config) {
    var chatId = normalizeIdentifier(config && config.chatId);
    var botId = normalizeIdentifier(config && config.botId);
    return chatId ? botId + ":" + chatId : botId;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function renderMarkdown(text) {
    if (window.marked && typeof window.marked.parse === "function") return window.marked.parse(text);
    var source = String(text || "").replace(/\r\n/g, "\n");
    if (!source.trim()) return "";
    return "<p>" + renderInlineMarkdown(source).replace(/\n/g, "<br>") + "</p>";
  }

  function createUid() {
    return window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : "cw_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function getSessionStorageKey(botId) { return "chatbot-widget-session:" + botId; }
  function getHistoryStorageKey(botId) { return "chatbot-widget-history:" + botId; }
  function getStateStorageKey(botId) { return "chatbot-widget-ui-state:" + botId; }

  function getOrCreateSessionId(botId) {
    var key = getSessionStorageKey(botId), existing = "";
    try {
      existing = window.localStorage.getItem(key) || "";
      if (!existing) {
        existing = createUid();
        window.localStorage.setItem(key, existing);
      }
    } catch (e) { existing = createUid(); }
    return existing;
  }

  function loadStoredHistory(botId) { try { return parseJson(window.localStorage.getItem(getHistoryStorageKey(botId)), []) || []; } catch (e) { return []; } }
  function saveStoredHistory(botId, history) { try { window.localStorage.setItem(getHistoryStorageKey(botId), JSON.stringify(history || [])); } catch (e) {} }
  function loadStoredUiState(botId) { try { return parseJson(window.localStorage.getItem(getStateStorageKey(botId)), {}) || {}; } catch (e) { return {}; } }
  function saveStoredUiState(botId, state) { try { window.localStorage.setItem(getStateStorageKey(botId), JSON.stringify(state || {})); } catch (e) {} }
  function persistHistory(widgetState) { saveStoredHistory(getConversationStorageId(widgetState.config), widgetState.history || []); }

  function requestWithTimeout(url, options, timeoutMs) {
    var controller = window.AbortController ? new AbortController() : null;
    var requestOptions = options || {};
    var timeoutId = null;
    if (controller) requestOptions.signal = controller.signal;
    return new Promise(function (resolve, reject) {
      timeoutId = window.setTimeout(function () {
        if (controller) controller.abort();
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
    if (document.getElementById(styleId)) return;
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = '[data-chatbot-widget-host="' + botId + '"] { z-index: ' + MAX_Z_INDEX + ' !important; } [data-chatbot-widget-host="' + botId + '"] * { box-sizing: border-box; }';
    (document.head || document.documentElement).appendChild(style);
  }

  function getWidgetConfig(scriptTag) {
    return {
      botId: normalizeIdentifier(scriptTag.getAttribute("data-bot-id")),
      chatId: normalizeIdentifier(scriptTag.getAttribute("data-chat-id") || scriptTag.getAttribute("data-chatid") || scriptTag.getAttribute("data-chat-i-d")),
      apiHost: scriptTag.getAttribute("data-api-host") || DEFAULT_API_HOST,
      bubbleVersion: getBubbleVersionFromScript(scriptTag),
      isTestVersion: isTestVersionValue(getBubbleVersionFromScript(scriptTag)),
      chatPosition: scriptTag.getAttribute("data-position") || "right",
      userId: "",
      aiModel: "gpt-4o-mini",
      chatbotToken: normalizeIdentifier(scriptTag.getAttribute("data-chatbot-token") || scriptTag.getAttribute("data-token") || scriptTag.getAttribute("data-widget-token")),
      streamApiUrl: scriptTag.getAttribute("data-stream-api-url") || STREAM_CHAT_URL,
      themeConfig: parseJson(scriptTag.getAttribute("data-theme-config"), {})
    };
  }

  function normalizeRemoteConfig(widgetState, remoteConfig) {
    var fallbackThemeConfig = widgetState.config.themeConfig || {};
    var position = remoteConfig.position || widgetState.config.chatPosition || fallbackThemeConfig.position || "right";
    var prompts = remoteConfig.starterPrompts;
    if (typeof prompts === "string") prompts = parseJson(prompts, prompts);
    if (!Array.isArray(prompts)) prompts = Array.isArray(fallbackThemeConfig.starterPrompts) ? fallbackThemeConfig.starterPrompts : [];
    return {
      name: remoteConfig.name || fallbackThemeConfig.title || "Chat Assistant",
      primaryColor: remoteConfig.primaryColor || fallbackThemeConfig.primaryColor || "#2563eb",
      welcomeMessage: remoteConfig.welcomeMessage || fallbackThemeConfig.welcomeMessage || "",
      starterPrompts: prompts,
      inputPlaceholder: remoteConfig.inputPlaceholder || fallbackThemeConfig.inputPlaceholder || "Message...",
      iconUrl: remoteConfig.iconUrl || remoteConfig.iconURL || remoteConfig.icon || remoteConfig.avatar || remoteConfig.chatIcon || remoteConfig.launcherIcon || fallbackThemeConfig.iconUrl || fallbackThemeConfig.icon || "",
      showBranding: toBoolean(remoteConfig.showBranding, toBoolean(fallbackThemeConfig.showBranding, false)),
      brandingText: remoteConfig.brandingName || remoteConfig.brandingText || remoteConfig.brandName || fallbackThemeConfig.brandingName || fallbackThemeConfig.brandingText || fallbackThemeConfig.brandName || "Chatflow AI",
      brandingUrl: remoteConfig.brandingUrl || remoteConfig.brandUrl || fallbackThemeConfig.brandingUrl || fallbackThemeConfig.brandUrl || "https://chatflowai.io",
      autoOpen: toBoolean(remoteConfig.autoOpen, toBoolean(fallbackThemeConfig.autoOpen, false)),
      theme: (remoteConfig.theme || fallbackThemeConfig.theme || "light").toLowerCase() === "dark" ? "dark" : "light",
      fontFamily: remoteConfig.fontFamily || fallbackThemeConfig.fontFamily || "Inter, Arial, sans-serif",
      fontSize: normalizeFontSize(remoteConfig.fontSize || fallbackThemeConfig.fontSize, "14px"),
      position: position === "left" ? "left" : "right",
      botId: normalizeIdentifier(getFirstValue(remoteConfig, ["botId", "botID", "bot_id", "bot"]) || widgetState.config.botId),
      chatId: normalizeIdentifier(getFirstValue(remoteConfig, ["chatID", "chatId", "chat_id", "chat"]) || widgetState.config.chatId),
      userId: remoteConfig.userId || remoteConfig.user_id || remoteConfig.userid || remoteConfig.userID || remoteConfig.user || widgetState.config.userId || "",
      aiModel: remoteConfig.aiModel || remoteConfig.ai_model || remoteConfig.aiModelName || remoteConfig.model || widgetState.config.aiModel || "gpt-4o-mini",
      chatbotToken: remoteConfig.chatbotToken || remoteConfig.chatbot_token || remoteConfig.widgetToken || remoteConfig.token || widgetState.config.chatbotToken || "",
      streamApiUrl: remoteConfig.streamApiUrl || remoteConfig.stream_api_url || remoteConfig.streamURL || remoteConfig.streamUrl || remoteConfig.chatApiUrl || remoteConfig.chat_api_url || widgetState.config.streamApiUrl || STREAM_CHAT_URL,
      bubbleVersion: widgetState.config.bubbleVersion || (widgetState.config.isTestVersion ? "test" : "live"),
      isTestVersion: isTestVersionValue(widgetState.config.isTestVersion)
    };
  }

  function buildWidgetMarkup(root, chatPosition) {
    root.innerHTML = [
      '<style>',
      ':host{all:initial}.widget-root{position:fixed;bottom:calc(24px + env(safe-area-inset-bottom));right:20px;z-index:' + MAX_Z_INDEX + ';display:flex;flex-direction:column;align-items:flex-end;gap:14px;font-family:var(--chatbot-font-family,Inter,Arial,sans-serif);font-size:var(--chatbot-font-size,14px);color:#111827;pointer-events:auto}.widget-root[data-position="left"]{right:auto;left:20px;align-items:flex-start}.chat-panel{width:min(380px,calc(100vw - 32px));height:min(620px,calc(100vh - 110px));background:#fff;border:1px solid rgba(15,23,42,.12);border-radius:20px;box-shadow:0 18px 60px rgba(15,23,42,.2);overflow:hidden;display:none;flex-direction:column}.widget-root[data-open="true"] .chat-panel{display:flex}.chat-header{display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--chatbot-primary,#2563eb);color:#fff}.avatar{width:36px;height:36px;border-radius:999px;background-size:cover;background-position:center;background-color:rgba(255,255,255,.25)}.title{font-weight:700;flex:1}.icon-btn{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:10px;width:32px;height:32px;cursor:pointer}.messages{flex:1;overflow:auto;padding:16px;background:#f8fafc}.message{display:flex;margin:0 0 12px}.message.user{justify-content:flex-end}.bubble-msg{max-width:82%;padding:10px 12px;border-radius:16px;line-height:1.45;box-shadow:0 1px 2px rgba(15,23,42,.08);word-break:break-word}.bubble-msg p{margin:0}.prompts{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #e5e7eb;background:#fff}.prompts[data-hidden="true"]{display:none}.prompt{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:7px 10px;cursor:pointer;font:inherit}.composer{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb;background:#fff}.composer textarea{flex:1;resize:none;min-height:42px;max-height:110px;padding:10px 12px;border:1px solid #d1d5db;border-radius:14px;font:inherit;outline:none}.send-btn{border:0;color:#fff;border-radius:14px;padding:0 14px;font-weight:700;cursor:pointer}.send-btn:disabled{opacity:.6;cursor:not-allowed}.launcher{width:62px;height:62px;border:0;border-radius:999px;box-shadow:0 12px 30px rgba(15,23,42,.24);cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff}.branding{display:none;text-align:center;padding:8px 12px;font-size:12px;border-top:1px solid #e5e7eb;background:#fff}.branding[data-visible="true"]{display:block}.branding a{color:#64748b;text-decoration:none}.typing span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#94a3b8;margin:0 2px;animation:cwBlink 1.2s infinite}.typing span:nth-child(2){animation-delay:.15s}.typing span:nth-child(3){animation-delay:.3s}@keyframes cwBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}.bot-cta{margin:4px 0 0 0;border:0;background:var(--chatbot-primary,#2563eb);color:#fff;border-radius:12px;padding:9px 12px;cursor:pointer}.widget-root[data-theme="dark"] .chat-panel,.widget-root[data-theme="dark"] .composer,.widget-root[data-theme="dark"] .prompts,.widget-root[data-theme="dark"] .branding{background:#111827;color:#f9fafb}.widget-root[data-theme="dark"] .messages{background:#0f172a}.widget-root[data-theme="dark"] .composer textarea{background:#1f2937;color:#f9fafb;border-color:#374151}',
      '</style>',
      '<div class="widget-root" data-open="false" data-position="' + (chatPosition === "left" ? "left" : "right") + '" data-theme="light">',
      '<div class="chat-panel">',
      '<div class="chat-header"><div class="avatar"></div><div class="title">Chat Assistant</div><button class="icon-btn clear-btn" type="button" title="Clear">↺</button><button class="icon-btn close-btn" type="button" title="Close">×</button></div>',
      '<div class="messages"></div>',
      '<div class="prompts" data-hidden="true"></div>',
      '<div class="composer"><textarea rows="1" placeholder="Message..."></textarea><button class="send-btn" type="button">Send</button></div>',
      '<div class="branding" data-visible="false"><a target="_blank" rel="noopener noreferrer"></a></div>',
      '</div>',
      '<button class="launcher" type="button" aria-label="Open chat"></button>',
      '</div>'
    ].join("");
  }

  function createWidgetState(host, root, config) {
    var conversationId = getConversationStorageId(config);
    var widgetRoot = root.querySelector(".widget-root");
    return {
      host: host,
      root: root,
      config: config,
      sessionId: getOrCreateSessionId(conversationId),
      history: loadStoredHistory(conversationId),
      uiState: loadStoredUiState(conversationId),
      isLoading: false,
      configLoaded: false,
      eventsBound: false,
      primaryColor: "#2563eb",
      title: "Chat Assistant",
      welcomeMessage: "",
      starterPrompts: [],
      placeholder: "Message...",
      iconUrl: "",
      showBranding: false,
      brandingText: "Chatflow AI",
      brandingUrl: "https://chatflowai.io",
      autoOpen: false,
      theme: "light",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px",
      elements: {
        widgetRoot: widgetRoot,
        panel: root.querySelector(".chat-panel"),
        launcher: root.querySelector(".launcher"),
        closeBtn: root.querySelector(".close-btn"),
        clearBtn: root.querySelector(".clear-btn"),
        headerTitle: root.querySelector(".title"),
        headerAvatar: root.querySelector(".avatar"),
        messages: root.querySelector(".messages"),
        prompts: root.querySelector(".prompts"),
        input: root.querySelector("textarea"),
        sendBtn: root.querySelector(".send-btn"),
        branding: root.querySelector(".branding"),
        brandingLink: root.querySelector(".branding a")
      }
    };
  }

  function ensureWidgetHost(config) {
    if (!window[HOST_STATE]) window[HOST_STATE] = {};
    var instanceId = getConversationStorageId(config);
    if (window[HOST_STATE][instanceId]) return window[HOST_STATE][instanceId];
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
    if (!root.querySelector(".widget-root")) buildWidgetMarkup(root, config.chatPosition);
    var widgetState = createWidgetState(host, root, config);
    window[HOST_STATE][instanceId] = widgetState;
    return widgetState;
  }

  function ensureConversationStartedState(widgetState) {
    widgetState.uiState.hasStartedConversation = hasUserMessages(widgetState.history);
    saveStoredUiState(getConversationStorageId(widgetState.config), widgetState.uiState);
  }

  function shouldShowStarterPrompts(widgetState) { return !widgetState.uiState.hasStartedConversation; }

  function syncLauncherState(widgetState) {
    var isOpen = widgetState.elements.widgetRoot.getAttribute("data-open") === "true";
    if (isOpen) {
      widgetState.elements.launcher.style.background = widgetState.primaryColor || "#2563eb";
      widgetState.elements.launcher.innerHTML = "⌄";
      widgetState.elements.launcher.style.fontSize = "28px";
      return;
    }
    var launcherIcon = normalizeIconUrl(widgetState.iconUrl || getDefaultLauncherIcon(), widgetState.config.apiHost);
    widgetState.elements.launcher.style.background = "transparent";
    widgetState.elements.launcher.innerHTML = launcherIcon ? '<img src="' + launcherIcon.replace(/"/g, "%22") + '" alt="" aria-hidden="true" style="width:100%;height:100%;object-fit:cover;border-radius:999px;display:block;margin:auto;" />' : "";
    widgetState.elements.launcher.style.fontSize = "0";
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
      saveStoredUiState(getConversationStorageId(widgetState.config), widgetState.uiState);
    }
    syncLauncherState(widgetState);
    if (isOpen) setTimeout(function () {
      widgetState.elements.input.focus();
      widgetState.elements.messages.scrollTop = widgetState.elements.messages.scrollHeight;
    }, 0);
  }

  function updateBranding(widgetState) {
    widgetState.host.style.setProperty("--chatbot-primary", widgetState.primaryColor || "#2563eb");
    widgetState.host.style.setProperty("--chatbot-font-family", widgetState.fontFamily || "Inter, Arial, sans-serif");
    widgetState.host.style.setProperty("--chatbot-font-size", widgetState.fontSize || "14px");
    widgetState.elements.headerTitle.textContent = widgetState.title || "Chat Assistant";
    widgetState.elements.sendBtn.style.background = widgetState.primaryColor;
    widgetState.elements.widgetRoot.setAttribute("data-theme", widgetState.theme === "dark" ? "dark" : "light");
    setWidgetPosition(widgetState, widgetState.config.chatPosition);
    syncLauncherState(widgetState);
    widgetState.elements.headerAvatar.style.backgroundImage = getCssBackgroundImage(widgetState.iconUrl || getDefaultLauncherIcon(), widgetState.config.apiHost);
    var show = !!widgetState.showBranding && !!widgetState.brandingText && !!widgetState.brandingUrl;
    widgetState.elements.branding.setAttribute("data-visible", show ? "true" : "false");
    widgetState.elements.brandingLink.textContent = show ? widgetState.brandingText : "";
    widgetState.elements.brandingLink.href = show ? widgetState.brandingUrl : "#";
    widgetState.elements.input.placeholder = widgetState.placeholder || "Message...";
  }

  function submitPrompt(widgetState, text) {
    var t = String(text || "").trim();
    if (!t || widgetState.isLoading) return;
    widgetState.elements.input.value = t;
    sendMessage(widgetState, t);
  }

  function renderPrompts(widgetState, list) {
    var c = widgetState.elements.prompts;
    c.innerHTML = "";
    c.setAttribute("data-hidden", shouldShowStarterPrompts(widgetState) ? "false" : "true");
    if (!shouldShowStarterPrompts(widgetState)) return;
    if (typeof list === "string") list = parseJson(list, []);
    if (!Array.isArray(list)) return;
    for (var i = 0; i < list.length; i += 1) {
      if (!list[i]) continue;
      var btn = document.createElement("button");
      btn.className = "prompt";
      btn.type = "button";
      btn.textContent = list[i];
      btn.addEventListener("click", function (e) { e.preventDefault(); submitPrompt(widgetState, e.currentTarget.textContent); });
      c.appendChild(btn);
    }
  }

  function createTypingMarkup() { return '<div class="typing"><span></span><span></span><span></span></div>'; }
  function scrollMessagesToBottom(widgetState) { widgetState.elements.messages.scrollTop = widgetState.elements.messages.scrollHeight; }

  function appendMessage(widgetState, message) {
    var normalized = { role: message.role === "user" ? "user" : "bot", text: String(message.text || "") };
    if (!message.skipPersist) {
      widgetState.history.push({ role: normalized.role, text: normalized.text });
      if (normalized.role === "user") {
        widgetState.uiState.hasStartedConversation = true;
        saveStoredUiState(getConversationStorageId(widgetState.config), widgetState.uiState);
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
    scrollMessagesToBottom(widgetState);
    return bubble;
  }

  function typeWriter(widgetState, element, text) { element.innerHTML = renderMarkdown(text); scrollMessagesToBottom(widgetState); }
  function restoreHistory(widgetState) { widgetState.elements.messages.innerHTML = ""; for (var i = 0; i < widgetState.history.length; i += 1) appendMessage(widgetState, { role: widgetState.history[i].role, text: widgetState.history[i].text, skipPersist: true }); }
  function resetConversation(widgetState) { widgetState.history = []; widgetState.uiState.hasStartedConversation = false; saveStoredUiState(getConversationStorageId(widgetState.config), widgetState.uiState); persistHistory(widgetState); widgetState.elements.messages.innerHTML = ""; if (widgetState.welcomeMessage) appendMessage(widgetState, { role: "bot", text: widgetState.welcomeMessage, skipPersist: true }); renderPrompts(widgetState, widgetState.starterPrompts); }
  function normalizeConfigResponse(data) { return (data && data.response) || data || {}; }

  function applyRemoteConfig(widgetState, remoteConfig, options) {
    var normalized = normalizeRemoteConfig(widgetState, remoteConfig), opts = options || {};
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
    widgetState.config.botId = normalized.botId;
    widgetState.config.chatId = normalized.chatId;
    widgetState.config.userId = normalized.userId;
    widgetState.config.aiModel = normalized.aiModel;
    widgetState.config.chatbotToken = normalized.chatbotToken;
    widgetState.config.streamApiUrl = normalized.streamApiUrl;
    widgetState.config.bubbleVersion = normalized.bubbleVersion;
    widgetState.config.isTestVersion = normalized.isTestVersion;
    widgetState.configLoaded = !!opts.markAsLoaded;
    ensureConversationStartedState(widgetState);
    updateBranding(widgetState);
    restoreHistory(widgetState);
    renderPrompts(widgetState, widgetState.starterPrompts);
    if (!widgetState.history.length && widgetState.welcomeMessage) appendMessage(widgetState, { role: "bot", text: widgetState.welcomeMessage });
    if (widgetState.autoOpen) setWidgetOpen(widgetState, true);
    else setWidgetOpen(widgetState, false, false);
  }

  function loadRemoteConfig(widgetState) {
    var configId = normalizeIdentifier(widgetState.config.botId || getChatIdForRequests(widgetState));
    var url = getApiUrl(widgetState.config, API_PATHS.config + encodeURIComponent(configId));
    return requestWithTimeout(url, { method: "GET" }, REQUEST_TIMEOUT)
      .then(function (response) { if (!response.ok) throw new Error("Config request failed"); return response.json(); })
      .then(function (data) { applyRemoteConfig(widgetState, normalizeConfigResponse(data), { markAsLoaded: true }); })
      .catch(function () { applyRemoteConfig(widgetState, {}, { markAsLoaded: true }); })
      .then(function () { setLoadingState(widgetState, false); });
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
    var last = widgetState.history[widgetState.history.length - 1];
    if (!last || last.role !== "bot" || last.text !== text) {
      widgetState.history.push({ role: "bot", text: text });
      persistHistory(widgetState);
    }
    typeWriter(widgetState, bubble, text);
  }

  function persistBotMessage(widgetState, text) {
    var t = String(text || "").trim();
    if (!t) return;
    var last = widgetState.history[widgetState.history.length - 1];
    if (!last || last.role !== "bot" || last.text !== t) {
      widgetState.history.push({ role: "bot", text: t });
      persistHistory(widgetState);
    }
  }

  function normalizeCredits(value) {
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function getCreditsFromPayload(payload) {
    if (!payload || typeof payload !== "object") return 0;
    if (payload.creditsUsed !== undefined) return normalizeCredits(payload.creditsUsed);
    if (payload.credits !== undefined) return normalizeCredits(payload.credits);
    if (payload.usage && payload.usage.creditsUsed !== undefined) return normalizeCredits(payload.usage.creditsUsed);
    if (payload.usage && payload.usage.credits !== undefined) return normalizeCredits(payload.usage.credits);
    if (payload.response && payload.response.usage && payload.response.usage.creditsUsed !== undefined) return normalizeCredits(payload.response.usage.creditsUsed);
    return 0;
  }

  function parseStreamPayload(rawChunk) {
    var n = String(rawChunk || "").trim();
    if (!n) return { kind: "ignore" };
    if (n === "[DONE]") return { kind: "done" };
    var p = parseJson(n, null);
    if (!p) return { kind: "chunk", text: n };
    if (typeof p === "string") return { kind: "chunk", text: p };
    if (p.type === "ready") return { kind: "ignore" };
    if (p.type === "error") return { kind: "error", text: p.message || p.error || "Something went wrong. Please try again." };
    if (p.type === "meta") return { kind: "meta", reply: typeof p.reply === "string" ? p.reply : "", creditsUsed: getCreditsFromPayload(p) };
    if (p.type === "calendly_button") return { kind: "calendly_button", label: p.label || p.text || "Book a time", url: p.url || p.link || p.href || "" };
    if (typeof p.reply === "string") return { kind: "meta", reply: p.reply, creditsUsed: getCreditsFromPayload(p) };
    if (typeof p.token === "string") return { kind: "chunk", text: p.token };
    if (typeof p.text === "string") return { kind: "chunk", text: p.text };
    return { kind: "ignore" };
  }

  function mergeStreamText(currentText, incomingPiece) {
    var base = String(currentText || ""), piece = String(incomingPiece || "");
    if (!piece) return base;
    if (piece.indexOf(base) === 0) return piece;
    return base + piece;
  }

  function extractReplyFromJson(data) {
    return String((data && (data.reply || data.text || data.token || (data.response && (data.response.reply || data.response.text || data.response.token)))) || "").trim();
  }

  function sendStreamChatRequest(widgetState, messageText, handlers) {
    var payload = {
      botId: widgetState.config.botId || "",
      chatID: getChatIdForRequests(widgetState),
      bubbleVersion: widgetState.config.bubbleVersion || (widgetState.config.isTestVersion ? "test" : "live"),
      sessionId: widgetState.sessionId || "",
      message: messageText
    };
    if (widgetState.config.userId) payload.userId = widgetState.config.userId;
    if (widgetState.config.aiModel) payload.model = widgetState.config.aiModel;
    var tokenHeader = widgetState.config.chatbotToken;
    if (!tokenHeader) throw new Error("Missing data-chatbot-token");
    return requestWithTimeout(widgetState.config.streamApiUrl || STREAM_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-chatbot-token": tokenHeader },
      body: JSON.stringify(payload)
    }, REQUEST_TIMEOUT).then(function (response) {
      if (!response.ok) throw new Error("Stream chat request failed");
      var contentType = String(response.headers && response.headers.get ? response.headers.get("content-type") || "" : "").toLowerCase();
      if (contentType.indexOf("application/json") !== -1) {
        return response.json().then(function (data) {
          var reply = extractReplyFromJson(data);
          var creditsUsed = getCreditsFromPayload(data);
          if (handlers && typeof handlers.onChunk === "function" && reply) handlers.onChunk(reply);
          return { streamText: reply, finalReply: reply, creditsUsed: creditsUsed };
        });
      }
      if (!response.body || typeof response.body.getReader !== "function") throw new Error("Streaming is not supported by this browser");
      var reader = response.body.getReader(), decoder = new TextDecoder(), buffered = "", streamText = "", finalReply = "", creditsUsed = 0;
      return new Promise(function (resolve, reject) {
        function applyPayload(r) {
          if (!r || r.kind === "ignore") return false;
          if (r.kind === "done") return true;
          if (r.kind === "meta") {
            if (r.reply) finalReply = r.reply;
            if (r.creditsUsed !== undefined) creditsUsed = normalizeCredits(r.creditsUsed);
            return false;
          }
          if (r.kind === "error") {
            if (handlers && typeof handlers.onError === "function") handlers.onError(r.text);
            return false;
          }
          if (r.kind === "calendly_button") {
            if (handlers && typeof handlers.onCalendlyButton === "function") handlers.onCalendlyButton(r);
            return false;
          }
          if (r.kind === "chunk") {
            streamText = mergeStreamText(streamText, r.text);
            if (handlers && typeof handlers.onChunk === "function") handlers.onChunk(streamText);
          }
          return false;
        }
        function finish() { resolve({ streamText: streamText, finalReply: finalReply, creditsUsed: creditsUsed }); }
        function readNext() {
          reader.read().then(function (result) {
            if (result.done) {
              var rem = buffered.trim();
              if (rem) applyPayload(parseStreamPayload(rem.replace(/^data:\s*/i, "")));
              finish();
              return;
            }
            buffered += decoder.decode(result.value, { stream: true });
            var lines = buffered.split(/\r?\n/);
            buffered = lines.pop() || "";
            for (var i = 0; i < lines.length; i += 1) {
              var line = lines[i].trim();
              if (!line) continue;
              if (line.indexOf(":") !== -1 && line.indexOf("data:") !== 0) continue;
              var payloadText = line.indexOf("data:") === 0 ? line.slice(5).trim() : line;
              if (applyPayload(parseStreamPayload(payloadText))) { finish(); return; }
            }
            readNext();
          }).catch(reject);
        }
        readNext();
      });
    });
  }

  function saveChatToBubble(widgetState, userMessage, botMessage, creditsUsed) {
    var credits = normalizeCredits(creditsUsed);
    var url = getApiUrl(widgetState.config, API_PATHS.createChat);
    var payload = {
      botId: widgetState.config.botId || "",
      chatID: getChatIdForRequests(widgetState),
      bubbleVersion: widgetState.config.bubbleVersion || (widgetState.config.isTestVersion ? "test" : "live"),
      userId: widgetState.config.userId || "",
      sessionId: widgetState.sessionId || "",
      message: String(userMessage || ""),
      userMessage: String(userMessage || ""),
      botMessage: String(botMessage || ""),
      credits: credits,
      creditsUsed: credits,
      timestamp: new Date().toISOString()
    };
    if (window.console && console.debug) console.debug("[chatbot-widget] create-chat payload credits", credits, payload);
    var headers = { "Content-Type": "application/json" };
    if (widgetState.config.chatbotToken) headers["x-chatbot-token"] = widgetState.config.chatbotToken;
    return requestWithTimeout(url, { method: "POST", headers: headers, body: JSON.stringify(payload) }, REQUEST_TIMEOUT).then(function (response) {
      if (!response.ok) throw new Error("Create chat request failed");
      return response;
    });
  }

  function sendChatRequest(widgetState, messageText, attempt) {
    var url = getApiUrl(widgetState.config, API_PATHS.createChat);
    var payload = {
      botId: widgetState.config.botId || "",
      chatID: getChatIdForRequests(widgetState),
      bubbleVersion: widgetState.config.bubbleVersion || (widgetState.config.isTestVersion ? "test" : "live"),
      message: messageText,
      sessionId: widgetState.sessionId || "",
      credits: 0,
      creditsUsed: 0
    };
    if (widgetState.config.userId) payload.userId = widgetState.config.userId;
    return requestWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, REQUEST_TIMEOUT)
      .then(function (response) { if (!response.ok) throw new Error("Chat request failed"); return response.json(); })
      .catch(function (error) { if (attempt < 1) return sendChatRequest(widgetState, messageText, attempt + 1); throw error; });
  }

  function handleSendAction(widgetState, event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    sendMessage(widgetState, widgetState.elements.input ? widgetState.elements.input.value : "");
  }

  function renderCalendlyButton(widgetState, botBubble, payload) {
    if (!botBubble || !botBubble.parentNode) return;
    var existing = botBubble.parentNode.querySelector(".bot-cta");
    if (existing) existing.parentNode.removeChild(existing);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "bot-cta";
    button.textContent = payload.label || "Book a time";
    button.addEventListener("click", function () { if (payload.url) window.open(payload.url, "_blank", "noopener,noreferrer"); });
    botBubble.parentNode.appendChild(button);
  }

  function sendMessage(widgetState, textOverride) {
    if (widgetState.isLoading) return;
    if (!widgetState.configLoaded) {
      setLoadingState(widgetState, true);
      loadRemoteConfig(widgetState).then(function () { setLoadingState(widgetState, false); sendMessage(widgetState, textOverride); }).catch(function () { setLoadingState(widgetState, false); });
      return;
    }
    var input = widgetState.elements.input;
    var text = String(typeof textOverride === "string" ? textOverride : (input && input.value) || "").trim();
    if (!text) return;
    setWidgetOpen(widgetState, true);
    appendMessage(widgetState, { role: "user", text: text });
    if (input) input.value = "";
    var botBubble = createBotLoadingBubble(widgetState);
    var queuedStreamText = "";
    function flush() { botBubble.textContent = queuedStreamText; scrollMessagesToBottom(widgetState); }
    setLoadingState(widgetState, true);
    sendStreamChatRequest(widgetState, text, {
      onChunk: function (streamText) { queuedStreamText = streamText; flush(); },
      onCalendlyButton: function (payload) { renderCalendlyButton(widgetState, botBubble, payload); },
      onError: function (errorText) { queuedStreamText = String(errorText || "Something went wrong. Please try again."); flush(); }
    }).then(function (streamResult) {
      var finalReply = String((streamResult && streamResult.finalReply) || (streamResult && streamResult.streamText) || "").trim() || "No response.";
      var creditsUsed = normalizeCredits(streamResult && streamResult.creditsUsed);
      botBubble.innerHTML = renderMarkdown(finalReply);
      persistBotMessage(widgetState, finalReply);
      setLoadingState(widgetState, false);
      if (input && input.focus) input.focus();
      saveChatToBubble(widgetState, text, finalReply, creditsUsed).catch(function (error) {
        if (window.console && console.warn) console.warn("Unable to send chat credits to Bubble create-chat after stream completion.", error);
        return null;
      });
    }).catch(function () {
      sendChatRequest(widgetState, text, 0).then(function (data) {
        var reply = extractReplyFromJson(data) || "No response.";
        var creditsUsed = getCreditsFromPayload(data);
        updatePendingBotMessage(widgetState, botBubble, reply);
        return saveChatToBubble(widgetState, text, reply, creditsUsed).catch(function () { return null; });
      }).catch(function () {
        updatePendingBotMessage(widgetState, botBubble, "Server error. Please try again.");
      }).then(function () {
        setLoadingState(widgetState, false);
        if (input && input.focus) input.focus();
      });
    });
  }

  function bindWidgetEvents(widgetState) {
    if (widgetState.eventsBound) return;
    widgetState.eventsBound = true;
    widgetState.elements.launcher.addEventListener("click", function () { setWidgetOpen(widgetState, widgetState.elements.widgetRoot.getAttribute("data-open") !== "true"); });
    widgetState.elements.closeBtn.addEventListener("click", function () { setWidgetOpen(widgetState, false); });
    widgetState.elements.clearBtn.addEventListener("click", function () {
      setLoadingState(widgetState, false);
      resetConversation(widgetState);
      if (widgetState.elements.input) {
        widgetState.elements.input.value = "";
        widgetState.elements.input.focus();
      }
      setWidgetOpen(widgetState, true);
    });
    widgetState.elements.sendBtn.addEventListener("click", function (event) { handleSendAction(widgetState, event); });
    widgetState.elements.input.addEventListener("keydown", function (event) { if (event.key === "Enter" && !event.shiftKey) handleSendAction(widgetState, event); });
  }

  function bootstrapWidget(widgetState) {
    ensureHighZIndex(widgetState.config.botId);
    bindWidgetEvents(widgetState);
    ensureConversationStartedState(widgetState);
    restoreHistory(widgetState);
    applyRemoteConfig(widgetState, {}, { markAsLoaded: false });
    setLoadingState(widgetState, true);
    loadRemoteConfig(widgetState);
  }

  function scheduleInitAttempt(reason) {
    if (!window[INIT_STATE] || !window[INIT_STATE].bootstrapped) return;
    var state = window[INIT_STATE];
    if (state.scheduledReasons[reason]) return;
    state.scheduledReasons[reason] = true;
    attemptInit(reason);
  }

  function attemptInit(reason) {
    var state = window[INIT_STATE];
    if (!state) return;
    var scriptTag = getCurrentScriptTag();
    if (!scriptTag) {
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () { attemptInit("retry-no-script-" + state.attempts); }, INIT_RETRY_DELAY);
      }
      return;
    }
    var signature = getScriptSignature(scriptTag);
    if (state.lastSignature && state.lastSignature !== signature) state.started = false;
    state.lastSignature = signature;
    var config = getWidgetConfig(scriptTag);
    if (!config.botId) {
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () { attemptInit("retry-no-bot-id-" + state.attempts); }, INIT_RETRY_DELAY);
      }
      return;
    }
    if (!document.documentElement) {
      if (state.attempts < MAX_INIT_ATTEMPTS) {
        state.attempts += 1;
        setTimeout(function () { attemptInit("retry-no-dom-" + state.attempts); }, INIT_RETRY_DELAY);
      }
      return;
    }
    var instanceId = getConversationStorageId(config);
    if (state.started && state.instanceId === instanceId) return;
    state.started = true;
    state.botId = config.botId;
    state.chatId = config.chatId;
    state.instanceId = instanceId;
    if (!state.bots[instanceId]) state.bots[instanceId] = { initialized: false, initializing: false };
    var botState = state.bots[instanceId];
    if (botState.initialized || botState.initializing) return;
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
        setTimeout(function () { attemptInit("retry-bootstrap-" + state.attempts); }, INIT_RETRY_DELAY);
      }
    }
  }

  function bootstrapInitTriggers() {
    if (!window[INIT_STATE]) window[INIT_STATE] = { attempts: 0, bots: {}, bootstrapped: true, started: false, botId: "", chatId: "", instanceId: "", lastSignature: "", scheduledReasons: {} };
    var state = window[INIT_STATE];
    if (state.listenersBound) {
      scheduleInitAttempt("reentrant-call");
      return;
    }
    state.listenersBound = true;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { scheduleInitAttempt("dom-content-loaded"); }, { once: true });
    else scheduleInitAttempt("dom-already-ready");
    window.addEventListener("load", function () { scheduleInitAttempt("window-load"); }, { once: true });
    for (var i = 0; i < FALLBACK_TIMEOUTS.length; i += 1) {
      (function (delay) { setTimeout(function () { scheduleInitAttempt("timeout-" + delay); }, delay); })(FALLBACK_TIMEOUTS[i]);
    }
    scheduleInitAttempt("immediate");
  }

  bootstrapInitTriggers();
})();
