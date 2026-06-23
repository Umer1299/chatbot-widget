(function () {
  var STYLE_ID = "chatflow-input-style-fix";
  var MAX_ATTEMPTS = 100;
  var INTERVAL_MS = 250;

  function setImportant(element, property, value) {
    if (element && element.style && element.style.setProperty) {
      element.style.setProperty(property, value, "important");
    }
  }

  function injectStyle(root) {
    if (!root || root.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".composer{position:relative!important;display:block!important;margin:8px 12px 10px!important;padding:12px 56px 12px 16px!important;border:1px solid #d1d5db!important;border-radius:28px!important;background:#fff!important;box-shadow:none!important;box-sizing:border-box!important}",
      ".composer textarea{box-sizing:border-box!important;width:100%!important;min-height:24px!important;max-height:118px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;outline:0!important;resize:none!important;line-height:1.45!important;display:block!important;overflow-y:auto!important;box-shadow:none!important}",
      ".composer textarea:focus{outline:0!important;box-shadow:none!important;border:0!important}",
      ".send-btn{position:absolute!important;right:12px!important;bottom:10px!important;top:auto!important;transform:none!important;width:32px!important;height:32px!important;min-width:32px!important;max-width:32px!important;padding:0!important;border:0!important;border-radius:999px!important;display:flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;box-shadow:none!important}",
      ".composer[data-multiline='true'] .send-btn{top:auto!important;bottom:10px!important;transform:none!important}",
      ".message.bot{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important}",
      ".message.bot .bot-cta{display:block!important;align-self:flex-start!important;margin:8px 0 0!important;max-width:82%!important;white-space:normal!important}",
      "@media(max-width:767px){.composer{margin:8px 10px 9px!important;padding:11px 52px 11px 14px!important;border-radius:26px!important}.send-btn{right:10px!important;bottom:9px!important;width:30px!important;height:30px!important;min-width:30px!important;max-width:30px!important}.composer[data-multiline='true'] .send-btn{bottom:9px!important}}",
      "@media(max-width:420px){.composer{margin:7px 8px 8px!important;padding:10px 48px 10px 13px!important;border-radius:24px!important}.send-btn{right:9px!important;bottom:8px!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important}.composer[data-multiline='true'] .send-btn{bottom:8px!important}}"
    ].join("\n");

    root.appendChild(style);
  }

  function forceInlineStyles(root) {
    if (!root || !root.querySelector) return;

    var composer = root.querySelector(".composer");
    var textarea = root.querySelector(".composer textarea");
    var sendBtn = root.querySelector(".send-btn");

    if (composer) {
      setImportant(composer, "position", "relative");
      setImportant(composer, "display", "block");
      setImportant(composer, "border", "1px solid #d1d5db");
      setImportant(composer, "border-radius", "28px");
      setImportant(composer, "background", "#fff");
      setImportant(composer, "box-sizing", "border-box");
      setImportant(composer, "box-shadow", "none");
    }

    if (textarea) {
      setImportant(textarea, "border", "0");
      setImportant(textarea, "border-radius", "0");
      setImportant(textarea, "background", "transparent");
      setImportant(textarea, "box-shadow", "none");
      setImportant(textarea, "outline", "0");
      setImportant(textarea, "padding", "0");
      setImportant(textarea, "line-height", "1.45");
    }

    if (sendBtn) {
      setImportant(sendBtn, "position", "absolute");
      setImportant(sendBtn, "right", "12px");
      setImportant(sendBtn, "bottom", "10px");
      setImportant(sendBtn, "top", "auto");
      setImportant(sendBtn, "transform", "none");
      setImportant(sendBtn, "width", "32px");
      setImportant(sendBtn, "height", "32px");
      setImportant(sendBtn, "min-width", "32px");
      setImportant(sendBtn, "max-width", "32px");
      setImportant(sendBtn, "border-radius", "999px");
      setImportant(sendBtn, "display", "flex");
      setImportant(sendBtn, "align-items", "center");
      setImportant(sendBtn, "justify-content", "center");
    }
  }

  function patchRoot(root) {
    injectStyle(root);
    forceInlineStyles(root);
  }

  function scanWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host], [id^='chatbot-widget-host-']");
    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) patchRoot(hosts[i].shadowRoot);
    }
  }

  function start() {
    var attempts = 0;
    scanWidgets();

    var timer = window.setInterval(function () {
      attempts += 1;
      scanWidgets();
      if (attempts >= MAX_ATTEMPTS) window.clearInterval(timer);
    }, INTERVAL_MS);

    if (window.MutationObserver) {
      var observer = new MutationObserver(scanWidgets);
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
