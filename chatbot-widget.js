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

  function buildWidgetMarkup(root, chatPosition) {
    root.innerHTML = [
      '<style>',
      ':host { all: initial; }',
      '.widget-root {',
      '  position: fixed;',
      '  bottom: calc(24px + env(safe-area-inset-bottom));',
      '  right: 20px;',
      '  z-index: ' + MAX_Z_INDEX + ';',
      '  font-family: Inter, Arial, sans-serif;',
      '  color: #111827;',
      '}',
      '.widget-root[data-position="left"] { left: 20px; right: auto; }',
      '.launcher {',
      '  width: 60px;',
      '  height: 60px;',
      '  border: none;',
      '  border-radius: 999px;',
      '  cursor: pointer;',
      '  color: #fff;',
      '  background: #2563eb;',
      '  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.35);',
      '  font-size: 24px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      '.panel {',
      '  width: min(380px, calc(100vw - 24px));',
      '  height: min(640px, calc(100vh - 96px - env(safe-area-inset-bottom)));',
      '  max-height: calc(100vh - 96px - env(safe-area-inset-bottom));',
      '  margin-bottom: 14px;',
      '  border-radius: 24px;',
      '  overflow: hidden;',
      '  background: #f3f4f6;',
      '  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.24);',
      '  border: 1px solid rgba(229, 231, 235, 0.9);',
      '  display: none;',
      '}',
      '.widget-root[data-open="true"] .panel { display: flex; flex-direction: column; }',
      '.chat-container { flex: 1; display: flex; flex-direction: column; height: 100%; width: 100%; background: #f3f4f6; }',
      '.header { padding: 16px; font-weight: 600; color: white; background: #2563eb; display: flex; align-items: center; justify-content: space-between; gap: 12px; }',
      '.header-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.header-actions { display: flex; align-items: center; gap: 8px; }',
      '.header-btn { background: transparent; border: none; color: inherit; cursor: pointer; font-size: 18px; line-height: 1; padding: 0; }',
      '.messages { flex: 1; overflow-y: auto; padding: 16px; background: #f3f4f6; }',
      '.message { margin-bottom: 12px; display: flex; flex-direction: column; max-width: 100%; }',
      '.user { align-items: flex-end; }',
      '.bot { align-items: flex-start; }',
      '.bubble-msg { max-width: 75%; padding: 12px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-break: break-word; white-space: normal; }',
      '.bubble-msg p { margin: 4px 0; }',
      '.bubble-msg ul { padding-left: 18px; margin: 6px 0; }',
      '.bubble-msg li { margin: 3px 0; }',
      '.bubble-msg a { color: #2563eb; text-decoration: underline; }',
      '.bubble-msg pre { background: #111; color: #fff; padding: 10px; border-radius: 8px; overflow: auto; margin-top: 6px; }',
      '.bubble-msg code { background: #e5e7eb; padding: 2px 4px; border-radius: 4px; }',
      '.starter-prompts { padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 8px; background: #f3f4f6; }',
      '.starter-prompts:empty { display: none; }',
      '.prompt { background: white; border: 1px solid #e5e7eb; padding: 8px 12px; border-radius: 20px; font-size: 13px; cursor: pointer; }',
      '.prompt:hover { background: #f9fafb; }',
      '.input-area { padding: 12px; display: flex; background: white; border-top: 1px solid #eee; }',
      '.chat-input { flex: 1; padding: 12px 14px; border-radius: 999px; border: 1px solid #ddd; outline: none; font-size: 14px; font-family: inherit; }',
      '.chat-input:disabled { background: #f9fafb; cursor: not-allowed; }',
      '.send-btn { margin-left: 8px; width: 40px; height: 40px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; font-size: 16px; background: #2563eb; }',
      '.send-btn:disabled { opacity: 0.7; cursor: not-allowed; }',
      '.typing { display: inline-flex; gap: 4px; }',
      '.typing span { width: 6px; height: 6px; background: #999; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }',
      '.typing span:nth-child(1) { animation-delay: -0.32s; }',
      '.typing span:nth-child(2) { animation-delay: -0.16s; }',
      '.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }',
      '@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }',
      '@media (max-width: 767px) {',
      '  .widget-root { bottom: calc(24px + env(safe-area-inset-bottom)); right: 12px; }',
      '  .widget-root[data-position="left"] { left: 12px; right: auto; }',
      '  .panel { width: min(100vw - 24px, 420px); height: min(70vh, calc(100vh - 110px - env(safe-area-inset-bottom))); }',
      '}',
      '</style>',
      '<div class="widget-root" data-position="' + (chatPosition === "left" ? "left" : "right") + '" data-open="false">',
      '  <div class="panel">',
      '    <div class="chat-container">',
      '      <div class="header">',
      '        <div class="header-title" data-role="header-title">Chat Assistant</div>',
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
      '    </div>',
      '  </div>',
      '  <button class="launcher" type="button" data-role="launcher" aria-label="Open chat">💬</button>',
      '</div>'
    ].join("");
  }

  function createWidgetState(host, root, config) {
    return {
      host: host,
      root: root,
      config: config,
      sessionId: getOrCreateSessionId(config.botId),
      history: loadStoredHistory(config.botId),
      uiState: loadStoredUiState(config.botId),
      elements: {
        widgetRoot: root.querySelector(".widget-root"),
        panel: root.querySelector(".panel"),
        launcher: root.querySelector('[data-role="launcher"]'),
        closeBtn: root.querySelector('[data-role="close-btn"]'),
        clearBtn: root.querySelector('[data-role="clear-btn"]'),
        headerTitle: root.querySelector('[data-role="header-title"]'),
        messages: root.querySelector('[data-role="messages"]'),
        prompts: root.querySelector('[data-role="prompts"]'),
        input: root.querySelector('[data-role="input"]'),
        sendBtn: root.querySelector('[data-role="send-btn"]')
      },
      primaryColor: config.themeConfig.primaryColor || "#2563eb",
      title: config.themeConfig.title || "Chat Assistant",
      welcomeMessage: config.themeConfig.welcomeMessage || "",
      starterPrompts: config.themeConfig.starterPrompts || [],
      placeholder: config.themeConfig.inputPlaceholder || "Message...",
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

  function setWidgetPosition(widgetState, position) {
    widgetState.elements.widgetRoot.setAttribute("data-position", position === "left" ? "left" : "right");
  }

  function setWidgetOpen(widgetState, isOpen) {
    widgetState.elements.widgetRoot.setAttribute("data-open", isOpen ? "true" : "false");
    widgetState.uiState.open = !!isOpen;
    saveStoredUiState(widgetState.config.botId, widgetState.uiState);
    if (isOpen) {
      setTimeout(function () {
        widgetState.elements.input.focus();
        widgetState.elements.messages.scrollTop = widgetState.elements.messages.scrollHeight;
      }, 0);
    }
  }

  function updateBranding(widgetState) {
    widgetState.elements.headerTitle.textContent = widgetState.title || "Chat Assistant";
    widgetState.elements.sendBtn.style.background = widgetState.primaryColor;
    widgetState.elements.launcher.style.background = widgetState.primaryColor;
    widgetState.elements.headerTitle.parentNode.style.background = widgetState.primaryColor;
  }

  function renderPrompts(widgetState, list) {
    var promptsContainer = widgetState.elements.prompts;
    promptsContainer.innerHTML = "";

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
      bubble.style.background = "white";
      bubble.style.color = "#111";
      bubble.style.borderBottomLeftRadius = "6px";
      bubble.innerHTML = renderMarkdown(normalized.text);
    }

    msg.appendChild(bubble);
    widgetState.elements.messages.appendChild(msg);
    scrollMessagesToBottom(widgetState);

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
  }

  function resetConversation(widgetState) {
    widgetState.history = [];
    persistHistory(widgetState);
    widgetState.elements.messages.innerHTML = "";
    if (widgetState.welcomeMessage) {
      appendMessage(widgetState, { role: "bot", text: widgetState.welcomeMessage });
    }
  }

  function normalizeConfigResponse(data) {
    return (data && data.response) || data || {};
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
        var remoteConfig = normalizeConfigResponse(data);
        widgetState.title = remoteConfig.name || widgetState.title || "Chat Assistant";
        widgetState.primaryColor = remoteConfig.primaryColor || widgetState.primaryColor;
        widgetState.welcomeMessage = remoteConfig.welcomeMessage || widgetState.welcomeMessage || "";
        widgetState.starterPrompts = remoteConfig.starterPrompts || widgetState.starterPrompts || [];
        widgetState.placeholder = remoteConfig.inputPlaceholder || widgetState.placeholder || "Message...";
        widgetState.configLoaded = true;
        updateBranding(widgetState);
        widgetState.elements.input.placeholder = widgetState.placeholder;
        renderPrompts(widgetState, widgetState.starterPrompts);

        if (!widgetState.history.length && widgetState.welcomeMessage) {
          appendMessage(widgetState, { role: "bot", text: widgetState.welcomeMessage });
        }
      }).catch(function () {
        widgetState.title = widgetState.title || "Chat Assistant";
        widgetState.placeholder = widgetState.placeholder || "Message...";
        updateBranding(widgetState);
        widgetState.elements.input.placeholder = widgetState.placeholder;
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
    setWidgetPosition(widgetState, widgetState.config.chatPosition);
    bindWidgetEvents(widgetState);
    restoreHistory(widgetState);
    updateBranding(widgetState);

    if (widgetState.uiState.open) {
      setWidgetOpen(widgetState, true);
    }

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
