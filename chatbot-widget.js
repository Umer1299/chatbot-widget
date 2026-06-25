(function () {
  var ORIGINAL_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@67f09c2c76c3d25d5f7665118e466a2b9ae70a1f/chatbot-widget.js";
  var STYLE_ID = "chatbot-widget-bot-cta-layout-fix";
  var FONT_LINK_ID = "chatflow-inter-font-link";
  var SCAN_INTERVAL_MS = 250;
  var MAX_SCAN_ATTEMPTS = 120;

  function getCurrentScriptTag() {
    if (document.currentScript && document.currentScript.tagName === "SCRIPT") return document.currentScript;
    var scripts = document.getElementsByTagName("script");
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

  function getThemeOverridesFromCurrentContext() {
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

    if (!overrides.fontFamily && isIframeLoaderContext()) overrides.fontFamily = "Inter, Arial, sans-serif";
    if (!overrides.fontStyle) overrides.fontStyle = "normal";
    installWebFontForFamily(overrides.fontFamily);
    return overrides;
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
          var themeOverrides = getThemeOverridesFromCurrentContext();
          sanitizeConfigIconFields(data);
          applyThemeOverridesToConfig(data, themeOverrides);
          if (data && data.response) {
            sanitizeConfigIconFields(data.response);
            applyThemeOverridesToConfig(data.response, themeOverrides);
          }

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

    var themeOverrides = getThemeOverridesFromCurrentContext();
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

  function installCtaLayoutFix(root) {
    if (!root || root.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".message.bot{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important}",
      ".message.bot .bubble-msg{display:block!important;max-width:82%!important}",
      ".message.bot .bot-cta{display:block!important;align-self:flex-start!important;flex:0 0 auto!important;margin:8px 0 0 0!important;max-width:82%!important;white-space:normal!important;text-align:center!important}",
      ".message.user{flex-direction:row!important;align-items:flex-end!important;justify-content:flex-end!important}",
      ".launcher img{object-fit:contain!important;background:transparent!important}",
      ".avatar{background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important}",
      ".widget-root,.widget-root *{font-family:var(--chatbot-font-family,Inter,Arial,sans-serif)!important;font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root .messages,.widget-root .bubble-msg,.widget-root .bubble-msg p,.widget-root .composer textarea,.widget-root .prompt,.widget-root .branding,.widget-root .branding a{font-size:var(--chatbot-font-size,14px)!important;font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root em,.widget-root i{font-style:var(--chatbot-font-style,normal)!important}",
      ".widget-root .chat-header .title{font-size:calc(var(--chatbot-font-size,14px) + 4px)!important;font-style:normal!important}"
    ].join("\n");
    root.appendChild(style);
  }

  function scanAndPatchWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host]");
    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) {
        installCtaLayoutFix(hosts[i].shadowRoot);
        patchIconUrlRendering(hosts[i].shadowRoot);
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
