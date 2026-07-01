(function () {
  var ORIGINAL_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@67f09c2c76c3d25d5f7665118e466a2b9ae70a1f/chatbot-widget.js";
  var STYLE_ID = "chatbot-widget-exact-chatflow-layout";
  var FONT_LINK_ID = "chatflow-inter-font-link";
  var SCAN_INTERVAL_MS = 250;
  var MAX_SCAN_ATTEMPTS = 160;
  var MAX_Z_INDEX = 2147483647;

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

  function parseJson(value, fallback) {
    if (!value) return fallback;
    try { return JSON.parse(value); }
    catch (error) { return fallback; }
  }

  function getUrlParam(names) {
    if (!window.URLSearchParams || !window.location) return "";
    try {
      var params = new URLSearchParams(window.location.search || "");
      for (var i = 0; i < names.length; i += 1) {
        var value = params.get(names[i]);
        if (value !== null && String(value).trim() !== "") return String(value).trim();
      }
    } catch (error) {}
    return "";
  }

  function getFirstValue(source, names) {
    if (!source || typeof source !== "object") return "";
    for (var i = 0; i < names.length; i += 1) {
      var name = names[i];
      if (source[name] !== undefined && source[name] !== null && String(source[name]).trim() !== "") return source[name];
    }
    return "";
  }

  function normalizeFontSize(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d+(?:\.\d+)?$/.test(raw)) return raw + "px";
    if (/^\d+(?:\.\d+)?(?:px|rem|em|%)$/i.test(raw)) return raw;
    return "";
  }

  function normalizeCssColor(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
    if (/^(rgb|rgba|hsl|hsla)\([0-9\s,%.]+\)$/i.test(raw)) return raw;
    return "";
  }

  function normalizeFontStyle(value) {
    var raw = String(value || "").trim().toLowerCase();
    return raw === "italic" || raw === "normal" ? raw : "";
  }

  function normalizeFontFamily(value) {
    var raw = String(value || "").trim();
    if (!raw) return "";
    raw = raw.replace(/^['\"]|['\"]$/g, "").trim();
    if (!raw) return "";
    if (/^inter$/i.test(raw)) return "Inter, Arial, sans-serif";
    if (raw.indexOf(",") === -1 && !/\b(sans-serif|serif|monospace|cursive|fantasy|system-ui)\b/i.test(raw)) return raw + ", Arial, sans-serif";
    return raw;
  }

  function installWebFontForFamily(fontFamily) {
    var family = String(fontFamily || "");
    if (!/\bInter\b/i.test(family)) return;
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

  function isIframeLoaderContext() {
    var script = getCurrentScriptTag();
    var src = String((script && script.src) || "");
    var path = String((window.location && window.location.pathname) || "");
    return !!(
      (script && script.getAttribute && script.getAttribute("data-chatflow-index-loader") === "true") ||
      /\/chatbot-widget\/index\.html$/i.test(path) ||
      /(^|\/)index\.html$/i.test(path) ||
      src.indexOf("cf_cache=") !== -1
    );
  }

  function getThemeOverridesFromRemoteConfig(remoteConfig) {
    var overrides = {};
    if (!remoteConfig || typeof remoteConfig !== "object") return overrides;

    var fontFamily = normalizeFontFamily(getFirstValue(remoteConfig, [
      "fontFamily", "font_family", "font-family", "Font Family", "font", "fontName", "font_name",
      "chatFont", "chat_font", "chatFontFamily", "chat_font_family", "textFont", "text_font",
      "bodyFont", "body_font", "widgetFont", "widget_font"
    ]));
    if (fontFamily) overrides.fontFamily = fontFamily;

    var fontSize = normalizeFontSize(getFirstValue(remoteConfig, [
      "fontSize", "font_size", "font-size", "Font Size", "chatFontSize", "chat_font_size",
      "textSize", "text_size", "bodyFontSize", "body_font_size", "widgetFontSize", "widget_font_size"
    ]));
    if (fontSize) overrides.fontSize = fontSize;

    var fontStyle = normalizeFontStyle(getFirstValue(remoteConfig, [
      "fontStyle", "font_style", "font-style", "Font Style", "chatFontStyle", "chat_font_style"
    ]));
    if (fontStyle) overrides.fontStyle = fontStyle;

    var primaryColor = normalizeCssColor(getFirstValue(remoteConfig, [
      "primaryColor", "primary_color", "primary-color", "Primary Color", "color", "brandColor", "brand_color"
    ]));
    if (primaryColor) overrides.primaryColor = primaryColor;

    return overrides;
  }

  function getThemeOverridesFromCurrentContext(includeIframeDefault) {
    var overrides = {};
    var script = getCurrentScriptTag();
    var themeConfig = parseJson(script && script.getAttribute ? script.getAttribute("data-theme-config") : "", {});
    if (themeConfig && typeof themeConfig === "object") {
      var configFontSize = normalizeFontSize(themeConfig.fontSize || themeConfig.font_size || themeConfig.chatFontSize || themeConfig.chat_font_size);
      if (configFontSize) overrides.fontSize = configFontSize;
      var configPrimaryColor = normalizeCssColor(themeConfig.primaryColor || themeConfig.primary_color || themeConfig.color);
      if (configPrimaryColor) overrides.primaryColor = configPrimaryColor;
      var configFontFamily = normalizeFontFamily(themeConfig.fontFamily || themeConfig.font_family);
      if (configFontFamily) overrides.fontFamily = configFontFamily;
      var configFontStyle = normalizeFontStyle(themeConfig.fontStyle || themeConfig.font_style);
      if (configFontStyle) overrides.fontStyle = configFontStyle;
      if (String(themeConfig.theme || "").toLowerCase() === "dark") overrides.theme = "dark";
      if (String(themeConfig.theme || "").toLowerCase() === "light") overrides.theme = "light";
    }

    var urlFontSize = normalizeFontSize(getUrlParam(["fontSize", "font_size", "chatFontSize", "chat_font_size", "textSize", "text_size"]));
    if (urlFontSize) overrides.fontSize = urlFontSize;
    var urlPrimaryColor = normalizeCssColor(getUrlParam(["primaryColor", "primary_color", "color"]));
    if (urlPrimaryColor) overrides.primaryColor = urlPrimaryColor;
    var urlFontFamily = normalizeFontFamily(getUrlParam(["fontFamily", "font_family"]));
    if (urlFontFamily) overrides.fontFamily = urlFontFamily;
    var urlFontStyle = normalizeFontStyle(getUrlParam(["fontStyle", "font_style"]));
    if (urlFontStyle) overrides.fontStyle = urlFontStyle;
    var urlTheme = String(getUrlParam(["theme"])).toLowerCase();
    if (urlTheme === "dark" || urlTheme === "light") overrides.theme = urlTheme;

    if (includeIframeDefault && !overrides.fontFamily && isIframeLoaderContext()) overrides.fontFamily = "Inter, Arial, sans-serif";
    if (!overrides.fontStyle) overrides.fontStyle = "normal";
    installWebFontForFamily(overrides.fontFamily);
    return overrides;
  }

  function mergeThemeOverrides(baseOverrides, priorityOverrides) {
    var merged = {};
    baseOverrides = baseOverrides || {};
    priorityOverrides = priorityOverrides || {};
    var keys = ["fontSize", "primaryColor", "fontFamily", "fontStyle", "theme"];
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (baseOverrides[key]) merged[key] = baseOverrides[key];
      if (priorityOverrides[key]) merged[key] = priorityOverrides[key];
    }
    if (!merged.fontStyle) merged.fontStyle = "normal";
    if (!merged.fontFamily && isIframeLoaderContext()) merged.fontFamily = "Inter, Arial, sans-serif";
    installWebFontForFamily(merged.fontFamily);
    return merged;
  }

  function applyThemeOverridesToConfig(target, overrides) {
    if (!target || typeof target !== "object" || !overrides) return target;
    if (overrides.fontSize) target.fontSize = overrides.fontSize;
    if (overrides.primaryColor) target.primaryColor = overrides.primaryColor;
    if (overrides.fontFamily) target.fontFamily = normalizeFontFamily(overrides.fontFamily);
    if (overrides.fontStyle) target.fontStyle = overrides.fontStyle;
    if (overrides.theme) target.theme = overrides.theme;
    return target;
  }

  function applyThemeOverridesToDom(root, overrides) {
    if (!root || !overrides) return;
    var host = root.host;
    var widgetRoot = root.querySelector && root.querySelector(".widget-root");
    if (overrides.fontSize) {
      if (host && host.style) host.style.setProperty("--chatbot-font-size", overrides.fontSize);
      if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatbot-font-size", overrides.fontSize);
    }
    if (overrides.primaryColor) {
      if (host && host.style) host.style.setProperty("--chatbot-primary", overrides.primaryColor);
      if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatbot-primary", overrides.primaryColor);
    }
    if (overrides.fontFamily) {
      var normalizedFamily = normalizeFontFamily(overrides.fontFamily);
      installWebFontForFamily(normalizedFamily);
      if (host && host.style) host.style.setProperty("--chatbot-font-family", normalizedFamily);
      if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatbot-font-family", normalizedFamily);
    }
    if (overrides.fontStyle) {
      if (host && host.style) host.style.setProperty("--chatbot-font-style", overrides.fontStyle);
      if (widgetRoot && widgetRoot.style) widgetRoot.style.setProperty("--chatbot-font-style", overrides.fontStyle);
    }
    if (overrides.theme && widgetRoot) widgetRoot.setAttribute("data-theme", overrides.theme);
  }

  function decodePathForOriginalWidget(url) {
    var raw = String(url || "").trim();
    if (!raw) return "";
    raw = raw.replace(/&amp;/g, "&").replace(/^['\"]|['\"]$/g, "").trim();
    var cssMatch = raw.match(/^url\((['\"]?)(.*?)\1\)$/i);
    if (cssMatch && cssMatch[2]) raw = cssMatch[2].trim();
    if (!raw || raw.indexOf("data:") === 0 || raw.indexOf("blob:") === 0) return raw;
    raw = raw.replace(/%25/g, "%");
    var hash = "";
    var hashIndex = raw.indexOf("#");
    if (hashIndex !== -1) {
      hash = raw.slice(hashIndex);
      raw = raw.slice(0, hashIndex);
    }
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

  function cleanRenderedIconUrl(url) {
    var decoded = decodePathForOriginalWidget(url);
    if (!decoded || decoded.indexOf("data:") === 0 || decoded.indexOf("blob:") === 0) return decoded;
    return decoded.replace(/ /g, "%20").replace(/\"/g, "%22");
  }

  function sanitizeConfigIconFields(target) {
    if (!target || typeof target !== "object") return target;
    var iconFields = ["iconUrl", "iconURL", "icon", "avatar", "chatIcon", "launcherIcon"];
    for (var i = 0; i < iconFields.length; i += 1) {
      var field = iconFields[i];
      if (typeof target[field] === "string" && target[field].trim()) target[field] = decodePathForOriginalWidget(target[field]);
    }
    return target;
  }

  function installConfigIconUrlSanitizer() {
    if (!window.fetch || window.__chatflowIconConfigSanitizer) return;
    window.__chatflowIconConfigSanitizer = true;
    var nativeFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      var requestUrl = typeof input === "string" ? input : (input && input.url) || "";
      return nativeFetch(input, init).then(function (response) {
        if (!requestUrl || requestUrl.indexOf("/api/1.1/wf/get-chatbot") === -1) return response;
        if (!response || !response.clone || typeof Response !== "function") return response;

        return response.clone().json().then(function (data) {
          sanitizeConfigIconFields(data);
          if (data && data.response) sanitizeConfigIconFields(data.response);

          var remoteTheme = mergeThemeOverrides(getThemeOverridesFromRemoteConfig(data), data && data.response ? getThemeOverridesFromRemoteConfig(data.response) : {});
          var contextTheme = getThemeOverridesFromCurrentContext(false);
          var finalTheme = mergeThemeOverrides(remoteTheme, contextTheme);

          applyThemeOverridesToConfig(data, finalTheme);
          if (data && data.response) applyThemeOverridesToConfig(data.response, finalTheme);

          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }).catch(function () {
          return response;
        });
      });
    };
  }

  function escapeAttr(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/\"/g, "%22").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function looksLikeImageUrl(value) {
    return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(?:[?#]\S*)?$/i.test(String(value || "").trim());
  }

  function setLauncherImage(launcher, url) {
    var clean = cleanRenderedIconUrl(url);
    if (!launcher || !clean) return;
    launcher.style.background = "transparent";
    launcher.style.fontSize = "0";
    launcher.innerHTML = '<img src="' + escapeAttr(clean) + '" alt="" aria-hidden="true" style="width:100%;height:100%;object-fit:contain;border-radius:999px;display:block;margin:auto;background:transparent;" />';
  }

  function patchImageSrc(img) {
    if (!img) return;
    var current = img.getAttribute("src") || img.src || "";
    var clean = cleanRenderedIconUrl(current);
    if (clean && clean !== current) img.setAttribute("src", clean);
    if (!img.getAttribute("alt")) img.setAttribute("alt", "");
    img.style.objectFit = "contain";
    img.style.background = "transparent";
  }

  function patchIconUrlRendering(root) {
    if (!root) return;

    var themeOverrides = getThemeOverridesFromCurrentContext(true);
    applyThemeOverridesToDom(root, themeOverrides);

    var images = root.querySelectorAll ? root.querySelectorAll(".launcher img,.avatar img") : [];
    for (var i = 0; i < images.length; i += 1) patchImageSrc(images[i]);

    var launchers = root.querySelectorAll ? root.querySelectorAll(".launcher") : [];
    for (var j = 0; j < launchers.length; j += 1) {
      var launcher = launchers[j];
      var launcherText = String(launcher.textContent || "").trim();
      if (looksLikeImageUrl(launcherText)) setLauncherImage(launcher, launcherText);
    }

    var avatars = root.querySelectorAll ? root.querySelectorAll(".avatar") : [];
    for (var k = 0; k < avatars.length; k += 1) {
      var avatar = avatars[k];
      var styleBackground = avatar.style && avatar.style.backgroundImage ? avatar.style.backgroundImage : "";
      var cleanBackground = cleanRenderedIconUrl(styleBackground);
      if (cleanBackground && cleanBackground !== styleBackground) {
        avatar.style.backgroundImage = 'url("' + cleanBackground.replace(/\"/g, "%22") + '")';
      }
      avatar.style.backgroundSize = "contain";
      avatar.style.backgroundRepeat = "no-repeat";
      avatar.style.backgroundPosition = "center";

      var avatarText = String(avatar.textContent || "").trim();
      if (looksLikeImageUrl(avatarText)) {
        avatar.textContent = "";
        avatar.style.backgroundImage = 'url("' + cleanRenderedIconUrl(avatarText).replace(/\"/g, "%22") + '")';
      }
    }
  }

  function patchMobileCloseButton(root) {
    if (!root || !root.querySelector) return;
    var closeBtn = root.querySelector(".chat-header .close-btn");
    if (!closeBtn) return;
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.setAttribute("title", "Close");
    if (String(closeBtn.textContent || "").trim() !== "×") closeBtn.textContent = "×";
  }

  function installExactChatflowLayout(root) {
    if (!root) return;
    var style = root.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      root.appendChild(style);
    }

    style.textContent = [
      ":host{z-index:" + MAX_Z_INDEX + "!important}",
      ".message.bot{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important}",
      ".message.bot .bubble-msg{display:block!important;max-width:82%!important}",
      ".message.bot .bot-cta{display:block!important;align-self:flex-start!important;flex:0 0 auto!important;margin:8px 0 0 0!important;max-width:82%!important;white-space:normal!important;text-align:center!important}",
      ".message.user{flex-direction:row!important;align-items:flex-end!important;justify-content:flex-end!important}",
      ".launcher img{object-fit:contain!important;background:transparent!important}",
      ".avatar{background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important}",
      ".widget-root,.widget-root *{font-family:var(--chatbot-font-family,Inter,Arial,sans-serif)!important;font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root .messages,.widget-root .bubble-msg,.widget-root .bubble-msg p,.widget-root .composer textarea,.widget-root .prompt,.widget-root .branding,.widget-root .branding a{font-size:var(--chatbot-font-size,14px)!important;font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root em,.widget-root i{font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root .chat-header .title{font-size:calc(var(--chatbot-font-size,14px) + 4px)!important;font-weight:800!important;font-style:normal!important;letter-spacing:-0.01em!important}",
      ".chat-header .avatar,.avatar{width:48px!important;height:48px!important;min-width:48px!important;flex:0 0 48px!important;border-radius:999px!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;background-color:transparent!important;box-shadow:none!important}",
      ".chat-panel,.panel{overflow:hidden!important}",
      ".prompts{border-top:1px solid #e5e7eb!important;background:#fff!important;padding:10px 14px!important;gap:8px!important}",
      ".prompt{background:#eff6ff!important;color:#1d4ed8!important;border:1px solid #dbeafe!important;border-radius:999px!important;padding:7px 10px!important;font:inherit!important;cursor:pointer!important}",
      ".composer{position:relative!important;display:block!important;flex:0 0 auto!important;margin:6px 12px 8px!important;padding:8px 50px 8px 14px!important;border:0!important;border-top:0!important;border-bottom:0!important;border-radius:24px!important;background:#fff!important;box-shadow:inset 0 0 0 1px #d1d5db!important;box-sizing:border-box!important;background-clip:padding-box!important;overflow:visible!important;font-family:inherit!important;font-size:inherit!important}",
      ".composer textarea{box-sizing:border-box!important;width:100%!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;outline:0!important;resize:none!important;line-height:1.35!important;display:block!important;box-shadow:none!important;font:inherit!important;font-family:inherit!important;font-size:inherit!important;color:#111827!important}",
      ".composer:not([data-multiline='true']) textarea{height:24px!important;min-height:24px!important;max-height:24px!important;overflow:hidden!important}",
      ".composer[data-multiline='true'] textarea{min-height:24px!important;max-height:118px!important;overflow-y:auto!important}",
      ".composer textarea:focus{outline:0!important;box-shadow:none!important;border:0!important}",
      ".send-btn{position:absolute!important;right:10px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;box-sizing:border-box!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important;padding:0!important;border:0!important;border-radius:999px!important;background:var(--chatbot-primary,#2563eb)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:0!important;line-height:1!important;box-shadow:none!important;text-indent:0!important;overflow:hidden!important;cursor:pointer!important;font-weight:800!important}",
      ".send-btn::before{content:'↑'!important;display:flex!important;align-items:center!important;justify-content:center!important;width:15px!important;height:15px!important;color:#fff!important;font-size:16px!important;font-weight:800!important;line-height:1!important;margin-top:-1px!important}",
      ".send-btn::after{content:none!important;display:none!important}",
      ".send-btn:disabled{opacity:.55!important;cursor:not-allowed!important}",
      ".composer[data-multiline='true'] .send-btn{top:auto!important;bottom:8px!important;transform:none!important}",
      ".branding{display:none!important;text-align:center!important;padding:8px 12px!important;font-size:12px!important;border-top:0!important;border-bottom:0!important;background:#fff!important;font-family:inherit!important;box-shadow:none!important}",
      ".branding[data-visible='true']{display:block!important}",
      ".branding a{color:#64748b!important;text-decoration:none!important;font-weight:400!important}",
      ".branding a .chatflow-brand-text{color:#0949c7!important;font-weight:800!important}",
      ".widget-root[data-theme='dark'] .composer{background:#111827!important;color:#f9fafb!important;box-shadow:inset 0 0 0 1px #374151!important}",
      ".widget-root[data-theme='dark'] .branding{background:#111827!important;color:#f9fafb!important}",
      ".widget-root[data-theme='dark'] .composer textarea{background:transparent!important;color:#f9fafb!important;border-color:transparent!important}",
      "@media (max-width:767px){:host{position:fixed!important;inset:0!important;width:100%!important;height:100%!important}.widget-root{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:100%!important;align-items:flex-end!important;gap:0!important}.widget-root[data-position=\"left\"]{left:0!important;right:0!important;align-items:flex-end!important}.widget-root[data-open=\"true\"]{top:0!important;height:100vh!important;height:100dvh!important;align-items:stretch!important}.widget-root[data-open=\"true\"] .chat-panel{position:fixed!important;inset:0!important;width:100vw!important;max-width:100vw!important;height:100vh!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.widget-root[data-open=\"true\"] .launcher{display:none!important}.widget-root[data-open=\"false\"] .launcher{position:fixed!important;right:16px!important;bottom:calc(16px + env(safe-area-inset-bottom))!important}.widget-root[data-open=\"false\"][data-position=\"left\"] .launcher{right:auto!important;left:16px!important}.chat-header{min-height:56px!important;padding:calc(12px + env(safe-area-inset-top)) 14px 12px!important}.chat-header .avatar,.avatar{width:44px!important;height:44px!important;min-width:44px!important;flex-basis:44px!important}.chat-header .title{padding-right:4px!important;font-size:17px!important}.chat-header .icon-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 36px!important;width:36px!important;height:36px!important}.chat-header .close-btn{margin-left:2px!important;border-radius:999px!important;font-size:24px!important;font-weight:700!important;line-height:1!important}.messages{padding:14px!important}.prompts{padding:10px 12px!important}.composer{margin:6px 10px 8px!important;padding:8px 48px 8px 13px!important;border-radius:23px!important}.composer:not([data-multiline='true']) textarea{height:22px!important;min-height:22px!important;max-height:22px!important}.composer[data-multiline='true'] textarea{min-height:22px!important;max-height:112px!important}.send-btn{right:9px!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important}.send-btn::before{font-size:15px!important}.composer[data-multiline='true'] .send-btn{bottom:8px!important}}"
    ].join("\n");
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
      if (!cleanText) {
        bubble.style.display = "none";
        continue;
      }
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

  function getDefaultTextareaHeight() {
    if (window.matchMedia && window.matchMedia("(max-width:767px)").matches) return 22;
    return 24;
  }

  function getMaxTextareaHeight() {
    if (window.matchMedia && window.matchMedia("(max-width:767px)").matches) return 112;
    return 118;
  }

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
    else {
      composer.removeAttribute("data-multiline");
      nextHeight = defaultHeight;
    }

    textarea.style.setProperty("height", nextHeight + "px", "important");
    textarea.style.setProperty("min-height", defaultHeight + "px", "important");
    textarea.style.setProperty("max-height", maxHeight + "px", "important");
    textarea.style.setProperty("overflow-y", isMultiline && measuredHeight >= maxHeight ? "auto" : "hidden", "important");
  }

  function alignSendButton(root) {
    if (!root || !root.querySelector) return;
    var composer = root.querySelector(".composer");
    var sendBtn = root.querySelector(".send-btn");
    if (!composer || !sendBtn) return;
    sendBtn.style.setProperty("background", "var(--chatbot-primary,#2563eb)", "important");
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

  function applyStableLayout(root) {
    styleBrandingText(root);
    hideLeadDataFromMessages(root);
    resizeComposerInput(root);
    alignSendButton(root);
  }

  function attachExactLayoutBehavior(root) {
    if (!root || root.__chatflowExactLayoutAttached) return;
    root.__chatflowExactLayoutAttached = true;

    var schedule = function () {
      if (root.__chatflowExactLayoutScheduled) return;
      root.__chatflowExactLayoutScheduled = true;
      var run = function () {
        root.__chatflowExactLayoutScheduled = false;
        applyStableLayout(root);
      };
      if (window.requestAnimationFrame) window.requestAnimationFrame(run);
      else window.setTimeout(run, 50);
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
    window.setTimeout(schedule, 250);
    window.setTimeout(schedule, 1000);
  }

  function scanAndPatchWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host]");
    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) {
        installExactChatflowLayout(hosts[i].shadowRoot);
        patchMobileCloseButton(hosts[i].shadowRoot);
        patchIconUrlRendering(hosts[i].shadowRoot);
        attachExactLayoutBehavior(hosts[i].shadowRoot);
        applyStableLayout(hosts[i].shadowRoot);
      }
    }
  }

  function keepPatching() {
    var attempts = 0;
    scanAndPatchWidgets();
    var timer = window.setInterval(function () {
      attempts += 1;
      scanAndPatchWidgets();
      if (attempts >= MAX_SCAN_ATTEMPTS) window.clearInterval(timer);
    }, SCAN_INTERVAL_MS);

    if (window.MutationObserver) {
      var observer = new MutationObserver(scanAndPatchWidgets);
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  }

  function loadOriginalWidget() {
    installConfigIconUrlSanitizer();
    installWebFontForFamily("Inter, Arial, sans-serif");
    var current = getCurrentScriptTag();
    var script = document.createElement("script");
    copyAttributes(current, script);
    script.src = ORIGINAL_WIDGET_SRC;
    script.async = false;
    script.defer = false;
    script.onload = keepPatching;
    script.onerror = function () {
      if (window.console && console.error) console.error("[chatbot-widget] Unable to load original widget script");
      keepPatching();
    };
    (document.head || document.documentElement || document.body).appendChild(script);
  }

  loadOriginalWidget();
})();
