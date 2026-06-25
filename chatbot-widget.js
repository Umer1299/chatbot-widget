(function () {
  var ORIGINAL_WIDGET_SRC = "https://cdn.jsdelivr.net/gh/Umer1299/chatbot-widget@67f09c2c76c3d25d5f7665118e466a2b9ae70a1f/chatbot-widget.js";
  var STYLE_ID = "chatbot-widget-bot-cta-layout-fix";
  var SCAN_INTERVAL_MS = 250;
  var MAX_SCAN_ATTEMPTS = 80;

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

  function cleanIconUrl(url) {
    var raw = String(url || "").trim();
    if (!raw) return "";

    raw = raw.replace(/&amp;/g, "&");
    var cssMatch = raw.match(/^url\((['\"]?)(.*?)\1\)$/i);
    if (cssMatch && cssMatch[2]) raw = cssMatch[2].trim();
    raw = raw.replace(/^['\"]|['\"]$/g, "").trim();

    if (!raw || raw.indexOf("data:") === 0 || raw.indexOf("blob:") === 0) return raw;

    var hash = "";
    var hashIndex = raw.indexOf("#");
    if (hashIndex !== -1) {
      hash = raw.slice(hashIndex);
      raw = raw.slice(0, hashIndex);
    }

    var queryIndex = raw.indexOf("?");
    if (queryIndex === -1) return raw + hash;

    var base = raw.slice(0, queryIndex);
    var query = raw.slice(queryIndex + 1);

    // Bubble CDN copied URLs often include _gl/_ga tracking params that break external widget rendering.
    // For Bubble-hosted uploaded icons, the direct file URL is the stable image URL.
    if (/\.cdn\.bubble\.io\//i.test(base)) return base + hash;

    if (typeof URL === "function") {
      try {
        var parsed = new URL(raw, window.location && window.location.href ? window.location.href : undefined);
        var trackingParams = ["_gl", "_ga", "_gid", "_gcl_au", "gclid", "fbclid"];
        for (var i = 0; i < trackingParams.length; i += 1) parsed.searchParams.delete(trackingParams[i]);
        return parsed.toString();
      } catch (error) {}
    }

    if (/(^|&)_(gl|ga|gid|gcl_au)=/i.test(query) || /(^|&)(gclid|fbclid)=/i.test(query)) return base + hash;
    return raw + hash;
  }

  function escapeAttr(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/\"/g, "%22").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function looksLikeImageUrl(value) {
    return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(?:[?#]\S*)?$/i.test(String(value || "").trim());
  }

  function setLauncherImage(launcher, url) {
    var clean = cleanIconUrl(url);
    if (!launcher || !clean) return;
    launcher.style.background = "transparent";
    launcher.style.fontSize = "0";
    launcher.innerHTML = '<img src="' + escapeAttr(clean) + '" alt="" aria-hidden="true" style="width:100%;height:100%;object-fit:contain;border-radius:999px;display:block;margin:auto;background:transparent;" />';
  }

  function patchImageSrc(img) {
    if (!img) return;
    var current = img.getAttribute("src") || img.src || "";
    var clean = cleanIconUrl(current);
    if (clean && clean !== current) img.setAttribute("src", clean);
    if (!img.getAttribute("alt")) img.setAttribute("alt", "");
    img.style.objectFit = img.closest && img.closest(".launcher") ? "contain" : (img.style.objectFit || "contain");
    img.style.background = "transparent";
  }

  function patchIconUrlRendering(root) {
    if (!root) return;

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
      var cleanBackground = cleanIconUrl(styleBackground);
      if (cleanBackground && cleanBackground !== styleBackground) {
        avatar.style.backgroundImage = 'url("' + cleanBackground.replace(/\"/g, "%22") + '")';
      }
      avatar.style.backgroundSize = "contain";
      avatar.style.backgroundRepeat = "no-repeat";
      avatar.style.backgroundPosition = "center";

      var avatarText = String(avatar.textContent || "").trim();
      if (looksLikeImageUrl(avatarText)) {
        avatar.textContent = "";
        avatar.style.backgroundImage = 'url("' + cleanIconUrl(avatarText).replace(/\"/g, "%22") + '")';
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
      ".avatar{background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important}"
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
