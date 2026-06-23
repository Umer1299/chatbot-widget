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

  function installCtaLayoutFix(root) {
    if (!root || root.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".message.bot{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important}",
      ".message.bot .bubble-msg{display:block!important;max-width:82%!important}",
      ".message.bot .bot-cta{display:block!important;align-self:flex-start!important;flex:0 0 auto!important;margin:8px 0 0 0!important;max-width:82%!important;white-space:normal!important;text-align:center!important}",
      ".message.user{flex-direction:row!important;align-items:flex-end!important;justify-content:flex-end!important}"
    ].join("\n");
    root.appendChild(style);
  }

  function scanAndPatchWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host]");
    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) installCtaLayoutFix(hosts[i].shadowRoot);
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
