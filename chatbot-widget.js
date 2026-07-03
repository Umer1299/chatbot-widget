(function () {
  var ORIGINAL_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@67f09c2c76c3d25d5f7665118e466a2b9ae70a1f/chatbot-widget.js";
  var STYLE_ID = "chatbot-widget-exact-chatflow-layout-v5";
  var FONT_LINK_ID = "chatflow-inter-font-link";
  var MAX_Z_INDEX = 2147483647;
  var SCAN_INTERVAL_MS = 80;
  var MAX_SCAN_ATTEMPTS = 400;
  var PROACTIVE_MESSAGES_KEY = "__chatflowProactiveMessages";
  var DOWN_CHEVRON_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='12' viewBox='0 0 20 12' fill='none'%3E%3Cpath d='M3 3L10 9L17 3' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  var SCRIPT_TAG = getCurrentScriptTag();

  function getCurrentScriptTag() {
    if (document.currentScript && document.currentScript.tagName === "SCRIPT") return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      if (scripts[i] && scripts[i].src && scripts[i].src.indexOf("chatbot-widget") !== -1) return scripts[i];
    }
    return scripts.length ? scripts[scripts.length - 1] : null;
  }

  function copyAttributes(source, target) {
    if (!source || !target || !source.attributes) return;
    for (var i = 0; i < source.attributes.length; i += 1) {
      var attr = source.attributes[i];
      if (!attr || attr.name === "src") continue;
      target.setAttribute(attr.name, attr.value);
    }
  }

  function normalizeCssColor(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
    if (/^(rgb|rgba|hsl|hsla)\([0-9\s,%.]+\)$/i.test(raw)) return raw;
    return "";
  }

  function getIconBgColor() {
    var script = SCRIPT_TAG || getCurrentScriptTag();
    if (!script || !script.getAttribute) return "";
    return normalizeCssColor(
      script.getAttribute("data-icon-bg-color") ||
      script.getAttribute("data-launcher-bg-color") ||
      script.getAttribute("data-button-bg-color") ||
      ""
    );
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
        if (value[fields[i]] !== null && value[fields[i]] !== undefined && String(value[fields[i]]).trim()) {
          return String(value[fields[i]]).replace(/\s+/g, " ").trim();
        }
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
    for (var key in config) {
      if (Object.prototype.hasOwnProperty.call(config, key)) normalizedMap[normalizeKey(key)] = config[key];
    }
    for (var i = 0; i < keys.length; i += 1) {
      var direct = config[keys[i]];
      if (direct !== undefined && direct !== null && String(direct).trim() !== "") return direct;
      var mapped = normalizedMap[normalizeKey(keys[i])];
      if (mapped !== undefined && mapped !== null && String(mapped).trim() !== "") return mapped;
    }
    return undefined;
  }

  function collectDynamicProactiveKeys(messages, config) {
    if (!config || typeof config !== "object") return;
    for (var key in config) {
      if (!Object.prototype.hasOwnProperty.call(config, key)) continue;
      var normalized = normalizeKey(key);
      var looksLikeProactive = (normalized.indexOf("proactive") !== -1 || normalized.indexOf("launcher") !== -1 || normalized.indexOf("teaser") !== -1 || normalized.indexOf("greeting") !== -1 || normalized.indexOf("chatbase") !== -1 || normalized.indexOf("welcomepopup") !== -1);
      var looksLikeMessage = (normalized.indexOf("message") !== -1 || normalized.indexOf("messages") !== -1 || normalized.indexOf("text") !== -1 || normalized.indexOf("bubble") !== -1 || normalized.indexOf("prompt") !== -1);
      if (looksLikeProactive && looksLikeMessage) appendProactiveMessages(messages, config[key]);
    }
  }

  function collectFromConfigObject(messages, config) {
    if (!config || typeof config !== "object") return;
    config = parseJsonMaybe(config);
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
    for (var n = 1; n <= 5; n += 1) {
      for (var b = 0; b < bases.length; b += 1) appendProactiveMessages(messages, getConfigValue(config, [bases[b] + n]));
    }
    collectDynamicProactiveKeys(messages, config);
  }

  function getScriptProactiveMessages() {
    var script = SCRIPT_TAG || getCurrentScriptTag();
    var messages = [];
    if (!script || !script.getAttribute) return messages;
    var attrs = [
      "data-proactive-messages", "data-proactive-message", "data-launcher-messages", "data-launcher-message",
      "data-welcome-messages", "data-welcome-message", "data-teaser-messages", "data-teaser-message"
    ];
    for (var i = 0; i < attrs.length; i += 1) appendProactiveMessages(messages, script.getAttribute(attrs[i]));
    for (var n = 1; n <= 5; n += 1) {
      appendProactiveMessages(messages, script.getAttribute("data-proactive-message-" + n));
      appendProactiveMessages(messages, script.getAttribute("data-launcher-message-" + n));
      appendProactiveMessages(messages, script.getAttribute("data-welcome-message-" + n));
    }
    return messages;
  }

  function extractProactiveMessages(data) {
    var messages = getScriptProactiveMessages();
    var response = data && typeof data === "object" && data.response && typeof data.response === "object" ? data.response : null;
    var config = response || data;
    collectFromConfigObject(messages, config);
    if (config && typeof config === "object") {
      collectFromConfigObject(messages, parseJsonMaybe(config.themeConfig));
      collectFromConfigObject(messages, parseJsonMaybe(config.theme_config));
      collectFromConfigObject(messages, parseJsonMaybe(config.settings));
      collectFromConfigObject(messages, parseJsonMaybe(config.widgetSettings));
      collectFromConfigObject(messages, parseJsonMaybe(config.widget_settings));
    }
    var unique = [];
    for (var m = 0; m < messages.length; m += 1) {
      if (unique.indexOf(messages[m]) === -1) unique.push(messages[m]);
    }
    return unique.slice(0, 2);
  }

  function storeProactiveMessagesFromConfig(data) {
    var messages = extractProactiveMessages(data);
    window[PROACTIVE_MESSAGES_KEY] = { messages: messages, updatedAt: Date.now() };
  }

  function getStoredProactiveMessages() {
    var state = window[PROACTIVE_MESSAGES_KEY];
    var messages = state && Array.isArray(state.messages) ? state.messages : [];
    if (messages.length) return messages;
    return getScriptProactiveMessages().slice(0, 2);
  }

  function installInterFont() {
    if (!document || !document.head || document.getElementById(FONT_LINK_ID)) return;
    var preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnect1);
    var preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    document.head.appendChild(preconnect2);
    var link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }

  function decodePathForOriginalWidget(url) {
    var raw = String(url || "").trim();
    if (!raw) return "";
    raw = raw.replace(/&amp;/g, "&").replace(/^[\'\"]|[\'\"]$/g, "").trim();
    var cssMatch = raw.match(/^url\(([\'\"]?)(.*?)\1\)$/i);
    if (cssMatch && cssMatch[2]) raw = cssMatch[2].trim();
    if (!raw || raw.indexOf("data:") === 0 || raw.indexOf("blob:") === 0) return raw;
    raw = raw.replace(/%25/g, "%");
    var hash = "";
    var hashIndex = raw.indexOf("#");
    if (hashIndex !== -1) { hash = raw.slice(hashIndex); raw = raw.slice(0, hashIndex); }
    var queryIndex = raw.indexOf("?");
    var withoutQuery = queryIndex !== -1 ? raw.slice(0, queryIndex) : raw;
    if (/\.cdn\.bubble\.io\//i.test(withoutQuery)) {
      try {
        var parsed = new URL(withoutQuery, window.location && window.location.href ? window.location.href : undefined);
        return parsed.origin + decodeURIComponent(parsed.pathname) + hash;
      } catch (error) {
        try { return decodeURIComponent(withoutQuery) + hash; }
        catch (decodeError) { return withoutQuery + hash; }
      }
    }
    try { return decodeURIComponent(withoutQuery) + hash; }
    catch (error2) { return withoutQuery + hash; }
  }

  function installConfigResponseInterceptor() {
    if (!window.fetch || window.__chatflowConfigInterceptor) return;
    window.__chatflowConfigInterceptor = true;
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var requestUrl = typeof input === "string" ? input : (input && input.url) || "";
      return nativeFetch(input, init).then(function (response) {
        if (!requestUrl || requestUrl.indexOf("/api/1.1/wf/get-chatbot") === -1) return response;
        if (!response || !response.clone || typeof Response !== "function") return response;
        return response.clone().json().then(function (data) {
          var iconFields = ["iconUrl", "iconURL", "icon", "avatar", "chatIcon", "launcherIcon"];
          function sanitize(target) {
            if (!target || typeof target !== "object") return;
            for (var i = 0; i < iconFields.length; i += 1) {
              var field = iconFields[i];
              if (typeof target[field] === "string" && target[field].trim()) target[field] = decodePathForOriginalWidget(target[field]);
            }
          }
          sanitize(data);
          if (data && data.response) sanitize(data.response);
          storeProactiveMessagesFromConfig(data);
          window.setTimeout(scanAndPatchWidgets, 0);
          window.setTimeout(scanAndPatchWidgets, 120);
          return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: response.headers });
        }).catch(function () { return response; });
      });
    };
  }

  function styleBrandingText(root) {
    if (!root || !root.querySelector) return;
    var link = root.querySelector(".branding a");
    if (!link || link.querySelector(".chatflow-brand-text")) return;
    var text = link.textContent || "";
    var match = text.match(/Chatflow AI/i);
    if (!match) return;
    var start = match.index;
    var end = start + match[0].length;
    link.textContent = "";
    if (start > 0) link.appendChild(document.createTextNode(text.slice(0, start)));
    var brandSpan = document.createElement("span");
    brandSpan.className = "chatflow-brand-text";
    brandSpan.textContent = text.slice(start, end);
    link.appendChild(brandSpan);
    if (end < text.length) link.appendChild(document.createTextNode(text.slice(end)));
  }

  function hideLeadDataFromMessages(root) {
    if (!root || !root.querySelectorAll) return;
    var bubbles = root.querySelectorAll(".message.bot .bubble-msg,.message.bot .bubble,.bot .bubble-msg");
    for (var i = 0; i < bubbles.length; i += 1) {
      var bubble = bubbles[i];
      var text = bubble.textContent || "";
      var match = text.match(/\bLEAD_DATA\s*:/i);
      if (!match) continue;
      var cleanText = text.slice(0, match.index).trim();
      if (bubble.getAttribute("data-lead-visible-text") === cleanText) continue;
      bubble.setAttribute("data-lead-visible-text", cleanText);
      bubble.innerHTML = "";
      if (!cleanText) { bubble.style.display = "none"; continue; }
      bubble.style.display = "";
      cleanText.split(/\n{2,}/).forEach(function (paragraphText) {
        var paragraph = paragraphText.trim();
        if (!paragraph) return;
        var p = document.createElement("p");
        paragraph.split(/\n/).forEach(function (line, lineIndex) {
          if (lineIndex > 0) p.appendChild(document.createElement("br"));
          p.appendChild(document.createTextNode(line));
        });
        bubble.appendChild(p);
      });
    }
  }

  function patchHeaderIcons(root) {
    if (!root || !root.querySelector) return;
    var clearBtn = root.querySelector(".chat-header .clear-btn");
    var closeBtn = root.querySelector(".chat-header .close-btn");
    if (clearBtn) { clearBtn.setAttribute("aria-label", "Reset chat"); clearBtn.setAttribute("title", "Reset chat"); clearBtn.textContent = "↻"; }
    if (closeBtn) { closeBtn.setAttribute("aria-label", "Close chat"); closeBtn.setAttribute("title", "Close"); closeBtn.textContent = "×"; }
  }

  function patchImages(root) {
    if (!root || !root.querySelectorAll) return;
    var images = root.querySelectorAll(".launcher img,.avatar img");
    for (var i = 0; i < images.length; i += 1) {
      var img = images[i];
      var current = img.getAttribute("src") || img.src || "";
      var clean = decodePathForOriginalWidget(current);
      if (clean && clean !== current) img.setAttribute("src", clean);
      if (!img.getAttribute("alt")) img.setAttribute("alt", "");
      img.style.objectFit = "contain";
      img.style.background = "transparent";
    }
    var avatars = root.querySelectorAll(".avatar");
    for (var j = 0; j < avatars.length; j += 1) {
      avatars[j].style.backgroundSize = "contain";
      avatars[j].style.backgroundRepeat = "no-repeat";
      avatars[j].style.backgroundPosition = "center";
      avatars[j].style.backgroundColor = "transparent";
    }
  }

  function renderProactiveMessages(root) {
    if (!root || !root.querySelector) return;
    var widgetRoot = root.querySelector(".widget-root");
    var launcher = root.querySelector(".launcher");
    var existing = root.querySelector(".chatflow-proactive-messages");
    var messages = getStoredProactiveMessages();
    var isOpen = widgetRoot && widgetRoot.getAttribute("data-open") === "true";
    if (!messages.length || !launcher || isOpen) {
      if (existing) existing.style.setProperty("display", "none", "important");
      return;
    }
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "chatflow-proactive-messages";
      if (widgetRoot) widgetRoot.appendChild(existing);
      else root.appendChild(existing);
    }
    existing.innerHTML = "";
    for (var i = 0; i < messages.length; i += 1) {
      var bubble = document.createElement("div");
      bubble.className = "chatflow-proactive-message";
      bubble.textContent = messages[i];
      existing.appendChild(bubble);
    }
    existing.onclick = function () { if (launcher && typeof launcher.click === "function") launcher.click(); };
    existing.style.setProperty("display", "flex", "important");
  }

  function getDefaultTextareaHeight() { return window.matchMedia && window.matchMedia("(max-width:767px)").matches ? 22 : 24; }
  function getMaxTextareaHeight() { return window.matchMedia && window.matchMedia("(max-width:767px)").matches ? 112 : 118; }

  function resizeComposerInput(root) {
    if (!root || !root.querySelector) return;
    var composer = root.querySelector(".composer");
    var textarea = root.querySelector(".composer textarea");
    if (!composer || !textarea) return;
    var defaultHeight = getDefaultTextareaHeight();
    var maxHeight = getMaxTextareaHeight();
    var value = textarea.value || "";
    textarea.style.setProperty("height", "auto", "important");
    var measuredHeight = textarea.scrollHeight || defaultHeight;
    var nextHeight = Math.max(defaultHeight, Math.min(measuredHeight, maxHeight));
    var isMultiline = value.indexOf("\n") !== -1 || measuredHeight > defaultHeight + 3;
    if (isMultiline) composer.setAttribute("data-multiline", "true");
    else { composer.removeAttribute("data-multiline"); nextHeight = defaultHeight; }
    textarea.style.setProperty("height", nextHeight + "px", "important");
    textarea.style.setProperty("min-height", defaultHeight + "px", "important");
    textarea.style.setProperty("max-height", maxHeight + "px", "important");
    textarea.style.setProperty("overflow-y", isMultiline && measuredHeight >= maxHeight ? "auto" : "hidden", "important");
  }

  function applyIconBgVariables(root) {
    var iconBg = getIconBgColor();
    if (!iconBg || !root) return;
    var host = root.host;
    var widgetRoot = root.querySelector && root.querySelector(".widget-root");
    if (host && host.style) host.style.setProperty("--chatbot-launcher-bg", iconBg);
    if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatbot-launcher-bg", iconBg);
  }

  function applyExactStyles(root) {
    if (!root) return;
    applyIconBgVariables(root);
    var style = root.getElementById(STYLE_ID);
    if (!style) { style = document.createElement("style"); style.id = STYLE_ID; root.appendChild(style); }
    style.textContent = [
      ":host{z-index:" + MAX_Z_INDEX + "!important;--chatbot-launcher-bg:var(--chatbot-primary,#1450d8)}",
      ".widget-root,.widget-root *{font-family:var(--chatbot-font-family,Inter,Arial,sans-serif)!important;font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root .messages,.widget-root .bubble-msg,.widget-root .bubble-msg p,.widget-root .composer textarea,.widget-root .prompt{font-size:var(--chatbot-font-size,14px)!important;font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root em,.widget-root i{font-style:var(--chatbot-font-style,normal)!important}",
      ".chat-header{display:flex!important;align-items:center!important;gap:10px!important;padding:14px 16px!important;background:var(--chatbot-primary,#1450d8)!important;color:#fff!important}",
      ".chat-header .avatar,.avatar{width:36px!important;height:36px!important;min-width:36px!important;flex:0 0 36px!important;border-radius:999px!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;background-color:transparent!important;box-shadow:none!important}",
      ".chat-header .title{font-size:18px!important;font-weight:800!important;line-height:1.2!important;letter-spacing:-0.01em!important;color:#fff!important;flex:1!important}",
      ".chat-header .icon-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 22px!important;width:22px!important;height:22px!important;min-width:22px!important;max-width:22px!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#fff!important;opacity:.98!important;line-height:1!important;text-indent:0!important;overflow:hidden!important;cursor:pointer!important}",
      ".chat-header .clear-btn{margin-left:auto!important;font-size:21px!important;font-weight:600!important;transform:translateY(-1px)!important}",
      ".chat-header .close-btn{margin-left:4px!important;font-size:26px!important;font-weight:600!important;transform:translateY(-1px)!important}",
      ".chat-header .icon-btn:hover,.chat-header .icon-btn:focus{background:transparent!important;box-shadow:none!important;opacity:1!important;outline:0!important}",
      ".message.bot{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important}",
      ".message.bot .bubble-msg{display:block!important;max-width:82%!important}",
      ".message.bot .bot-cta{display:block!important;align-self:flex-start!important;flex:0 0 auto!important;margin:8px 0 0 0!important;max-width:82%!important;white-space:normal!important;text-align:center!important}",
      ".message.user{flex-direction:row!important;align-items:flex-end!important;justify-content:flex-end!important}",
      ".prompts{border-top:1px solid #e5e7eb!important;background:#fff!important;padding:10px 14px!important;gap:8px!important}",
      ".prompt{background:#eff6ff!important;color:#1d4ed8!important;border:1px solid #dbeafe!important;border-radius:999px!important;padding:7px 10px!important;font:inherit!important;cursor:pointer!important}",
      ".composer{position:relative!important;display:block!important;flex:0 0 auto!important;margin:6px 12px 8px!important;padding:8px 50px 8px 14px!important;border:0!important;border-top:0!important;border-bottom:0!important;border-radius:24px!important;background:#fff!important;box-shadow:inset 0 0 0 1px #d1d5db!important;box-sizing:border-box!important;background-clip:padding-box!important;overflow:visible!important;font-family:inherit!important;font-size:inherit!important}",
      ".composer textarea{box-sizing:border-box!important;width:100%!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;outline:0!important;resize:none!important;line-height:1.35!important;display:block!important;box-shadow:none!important;font:inherit!important;font-family:inherit!important;font-size:inherit!important;color:#111827!important}",
      ".composer:not([data-multiline='true']) textarea{height:24px!important;min-height:24px!important;max-height:24px!important;overflow:hidden!important}",
      ".composer[data-multiline='true'] textarea{min-height:24px!important;max-height:118px!important;overflow-y:auto!important}",
      ".composer textarea:focus{outline:0!important;box-shadow:none!important;border:0!important}",
      ".send-btn{position:absolute!important;right:10px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;box-sizing:border-box!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important;padding:0!important;border:0!important;border-radius:999px!important;background:var(--chatbot-primary,#1450d8)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:0!important;line-height:1!important;box-shadow:none!important;text-indent:0!important;overflow:hidden!important;cursor:pointer!important;font-weight:800!important}",
      ".send-btn::before{content:'↑'!important;display:flex!important;align-items:center!important;justify-content:center!important;width:15px!important;height:15px!important;color:#fff!important;font-size:16px!important;font-weight:800!important;line-height:1!important;margin-top:-1px!important}",
      ".send-btn::after{content:none!important;display:none!important}",
      ".send-btn:disabled{opacity:.55!important;cursor:not-allowed!important}",
      ".composer[data-multiline='true'] .send-btn{top:auto!important;bottom:8px!important;transform:none!important}",
      ".branding{display:none!important;text-align:center!important;padding:6px 12px 8px!important;font-size:10px!important;line-height:1.05!important;border-top:0!important;border-bottom:0!important;background:#fff!important;font-family:Inter,Arial,sans-serif!important;box-shadow:none!important;color:#9ca3af!important;font-weight:400!important}",
      ".branding[data-visible='true']{display:block!important}",
      ".branding a{color:#9ca3af!important;text-decoration:none!important;font-size:10px!important;line-height:1.05!important;font-weight:400!important;font-family:Inter,Arial,sans-serif!important}",
      ".branding a .chatflow-brand-text{color:#0949c7!important;font-weight:800!important;font-size:10px!important;line-height:1.05!important}",
      ".launcher{width:80px!important;height:80px!important;min-width:80px!important;min-height:80px!important;border:0!important;border-radius:999px!important;box-shadow:0 12px 30px rgba(15,23,42,.24)!important;cursor:pointer!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important}",
      ".widget-root[data-open='false'] .launcher{background:var(--chatbot-launcher-bg,var(--chatbot-primary,#1450d8))!important;background-color:var(--chatbot-launcher-bg,var(--chatbot-primary,#1450d8))!important;font-size:0!important}",
      ".widget-root[data-open='false'] .launcher img{background:transparent!important;object-fit:contain!important}",
      ".widget-root[data-open='true'] .launcher{background:var(--chatbot-primary,#1450d8)!important;background-color:var(--chatbot-primary,#1450d8)!important;color:transparent!important;font-size:0!important;position:relative!important}",
      ".widget-root[data-open='true'] .launcher img{display:none!important}",
      ".widget-root[data-open='true'] .launcher::before{content:''!important;display:block!important;position:absolute!important;left:50%!important;top:50%!important;width:20px!important;height:12px!important;transform:translate(-50%,-50%)!important;background-repeat:no-repeat!important;background-position:center!important;background-size:20px 12px!important;background-image:" + DOWN_CHEVRON_SVG + "!important}",
      ".widget-root[data-open='true'] .launcher::after{content:none!important;display:none!important}",
      ".launcher img{object-fit:contain!important;background:transparent!important}",
      ".chatflow-proactive-messages{position:fixed!important;right:20px!important;bottom:116px!important;display:flex!important;flex-direction:column!important;gap:10px!important;align-items:flex-end!important;max-width:min(360px,calc(100vw - 40px))!important;margin:0!important;pointer-events:auto!important;z-index:" + MAX_Z_INDEX + "!important}",
      ".chatflow-proactive-message{box-sizing:border-box!important;max-width:min(360px,calc(100vw - 40px))!important;width:max-content!important;background:#fff!important;color:#111827!important;border:1px solid rgba(17,24,39,.12)!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(15,23,42,.10)!important;padding:13px 18px!important;font-size:14px!important;line-height:1.35!important;font-weight:400!important;letter-spacing:0!important;text-align:left!important;white-space:normal!important;cursor:pointer!important}",
      ".chatflow-proactive-message:hover{box-shadow:0 10px 28px rgba(15,23,42,.14)!important}",
      ".widget-root[data-position='left'] .chatflow-proactive-messages{right:auto!important;left:20px!important;align-items:flex-start!important}",
      ".widget-root[data-open='true'] .chatflow-proactive-messages{display:none!important}",
      ".widget-root[data-theme='dark'] .composer{background:#111827!important;color:#f9fafb!important;box-shadow:inset 0 0 0 1px #374151!important}",
      ".widget-root[data-theme='dark'] .branding{background:#111827!important;color:#f9fafb!important}",
      ".widget-root[data-theme='dark'] .composer textarea{background:transparent!important;color:#f9fafb!important;border-color:transparent!important}",
      "@media (max-width:767px){:host{position:fixed!important;inset:0!important;width:100%!important;height:100%!important}.widget-root{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:100%!important;align-items:flex-end!important;gap:0!important}.widget-root[data-position=\"left\"]{left:0!important;right:0!important;align-items:flex-end!important}.widget-root[data-open=\"true\"]{top:0!important;height:100vh!important;height:100dvh!important;align-items:stretch!important}.widget-root[data-open=\"true\"] .chat-panel{position:fixed!important;inset:0!important;width:100vw!important;max-width:100vw!important;height:100vh!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.widget-root[data-open=\"true\"] .launcher{display:none!important}.widget-root[data-open=\"false\"] .launcher{position:fixed!important;right:16px!important;bottom:calc(16px + env(safe-area-inset-bottom))!important}.widget-root[data-open=\"false\"][data-position=\"left\"] .launcher{right:auto!important;left:16px!important}.chatflow-proactive-messages{right:16px!important;bottom:calc(106px + env(safe-area-inset-bottom))!important;max-width:calc(100vw - 32px)!important;align-items:flex-end!important}.widget-root[data-position=\"left\"] .chatflow-proactive-messages{right:auto!important;left:16px!important;align-items:flex-start!important}.chatflow-proactive-message{max-width:calc(100vw - 32px)!important}.chat-header{min-height:56px!important;padding:calc(12px + env(safe-area-inset-top)) 14px 12px!important}.chat-header .avatar,.avatar{width:36px!important;height:36px!important;min-width:36px!important;flex-basis:36px!important}.chat-header .title{padding-right:4px!important;font-size:17px!important}.chat-header .icon-btn{flex-basis:22px!important;width:22px!important;height:22px!important}.chat-header .clear-btn{font-size:21px!important}.chat-header .close-btn{font-size:26px!important}.messages{padding:14px!important}.prompts{padding:10px 12px!important}.composer{margin:6px 10px 8px!important;padding:8px 48px 8px 13px!important;border-radius:23px!important}.composer:not([data-multiline='true']) textarea{height:22px!important;min-height:22px!important;max-height:22px!important}.composer[data-multiline='true'] textarea{min-height:22px!important;max-height:112px!important}.send-btn{right:9px!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important}.send-btn::before{font-size:15px!important}.composer[data-multiline='true'] .send-btn{bottom:8px!important}.branding,.branding a,.branding a .chatflow-brand-text{font-size:10px!important;line-height:1.05!important}}"
    ].join("\n");
  }

  function alignLauncherAndSend(root) {
    if (!root || !root.querySelector) return;
    applyIconBgVariables(root);
    var composer = root.querySelector(".composer");
    var sendBtn = root.querySelector(".send-btn");
    if (composer && sendBtn) {
      sendBtn.style.setProperty("background", "var(--chatbot-primary,#1450d8)", "important");
      if (composer.getAttribute("data-multiline") === "true") {
        sendBtn.style.setProperty("top", "auto", "important");
        sendBtn.style.setProperty("bottom", "8px", "important");
        sendBtn.style.setProperty("transform", "none", "important");
      } else {
        sendBtn.style.setProperty("top", "50%", "important");
        sendBtn.style.setProperty("bottom", "auto", "important");
        sendBtn.style.setProperty("transform", "translateY(-50%)", "important");
      }
    }
    var widgetRoot = root.querySelector(".widget-root");
    var launcher = root.querySelector(".launcher");
    var iconBg = getIconBgColor();
    if (launcher && iconBg && (!widgetRoot || widgetRoot.getAttribute("data-open") !== "true")) {
      launcher.style.setProperty("background", iconBg, "important");
      launcher.style.setProperty("background-color", iconBg, "important");
    }
  }

  function applyStableLayout(root) {
    applyExactStyles(root);
    patchHeaderIcons(root);
    styleBrandingText(root);
    hideLeadDataFromMessages(root);
    patchImages(root);
    renderProactiveMessages(root);
    resizeComposerInput(root);
    alignLauncherAndSend(root);
  }

  function attachExactLayoutBehavior(root) {
    if (!root || root.__chatflowExactLayoutAttached) return;
    root.__chatflowExactLayoutAttached = true;
    var schedule = function () {
      if (root.__chatflowExactLayoutScheduled) return;
      root.__chatflowExactLayoutScheduled = true;
      var run = function () { root.__chatflowExactLayoutScheduled = false; applyStableLayout(root); };
      if (window.requestAnimationFrame) window.requestAnimationFrame(run);
      else window.setTimeout(run, 16);
    };
    root.addEventListener("input", schedule, true);
    root.addEventListener("change", schedule, true);
    root.addEventListener("click", function () { window.setTimeout(schedule, 0); }, true);
    window.addEventListener("resize", schedule);
    if (window.MutationObserver) {
      var observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-open", "data-visible", "style", "class"] });
    }
    schedule();
    window.setTimeout(schedule, 0);
    window.setTimeout(schedule, 80);
    window.setTimeout(schedule, 250);
    window.setTimeout(schedule, 1000);
  }

  function scanAndPatchWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host]");
    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) { applyStableLayout(hosts[i].shadowRoot); attachExactLayoutBehavior(hosts[i].shadowRoot); }
    }
  }

  function keepPatching() {
    var attempts = 0;
    scanAndPatchWidgets();
    var timer = window.setInterval(function () { attempts += 1; scanAndPatchWidgets(); if (attempts >= MAX_SCAN_ATTEMPTS) window.clearInterval(timer); }, SCAN_INTERVAL_MS);
    if (window.MutationObserver) {
      var observer = new MutationObserver(scanAndPatchWidgets);
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  }

  function loadOriginalWidget() {
    installInterFont();
    installConfigResponseInterceptor();
    storeProactiveMessagesFromConfig({});
    var script = document.createElement("script");
    copyAttributes(SCRIPT_TAG || getCurrentScriptTag(), script);
    script.src = ORIGINAL_WIDGET_SRC;
    script.async = false;
    script.defer = false;
    script.onload = keepPatching;
    script.onerror = function () { if (window.console && console.error) console.error("[chatbot-widget] Unable to load original widget script"); keepPatching(); };
    (document.head || document.documentElement || document.body).appendChild(script);
  }

  loadOriginalWidget();
})();
