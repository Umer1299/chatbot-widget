(function () {
  var STYLE_ID = "chatflow-input-style-fix-stable";
  var MAX_ATTEMPTS = 40;
  var INTERVAL_MS = 250;

  function injectStyle(root) {
    if (!root || root.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".composer{position:relative!important;display:block!important;margin:6px 12px 8px!important;padding:8px 50px 8px 14px!important;border:1px solid #d1d5db!important;border-radius:24px!important;background:#fff!important;box-shadow:none!important;box-sizing:border-box!important}",
      ".composer textarea{box-sizing:border-box!important;width:100%!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;outline:0!important;resize:none!important;line-height:1.35!important;display:block!important;box-shadow:none!important}",
      ".composer:not([data-multiline='true']) textarea{height:24px!important;min-height:24px!important;max-height:24px!important;overflow:hidden!important}",
      ".composer textarea:focus{outline:0!important;box-shadow:none!important;border:0!important}",
      ".send-btn{position:absolute!important;right:10px!important;bottom:6px!important;top:auto!important;transform:none!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important;padding:0!important;border:0!important;border-radius:999px!important;display:flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;box-shadow:none!important}",
      ".composer[data-multiline='true'] .send-btn{top:auto!important;bottom:8px!important;transform:none!important}",
      ".message.bot{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important}",
      ".message.bot .bot-cta{display:block!important;align-self:flex-start!important;margin:8px 0 0!important;max-width:82%!important;white-space:normal!important}",
      "@media(max-width:767px){.composer{margin:6px 10px 8px!important;padding:8px 48px 8px 13px!important;border-radius:23px!important}.composer:not([data-multiline='true']) textarea{height:22px!important;min-height:22px!important;max-height:22px!important}.send-btn{right:9px!important;bottom:6px!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important}.composer[data-multiline='true'] .send-btn{bottom:8px!important}}",
      "@media(max-width:420px){.composer{margin:6px 8px 7px!important;padding:7px 44px 7px 12px!important;border-radius:22px!important}.composer:not([data-multiline='true']) textarea{height:22px!important;min-height:22px!important;max-height:22px!important}.send-btn{right:8px!important;bottom:5px!important;width:26px!important;height:26px!important;min-width:26px!important;max-width:26px!important}.composer[data-multiline='true'] .send-btn{bottom:7px!important}}"
    ].join("\n");

    root.appendChild(style);
  }

  function scanWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host], [id^='chatbot-widget-host-']");
    var patched = false;

    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) {
        injectStyle(hosts[i].shadowRoot);
        patched = true;
      }
    }

    return patched;
  }

  function start() {
    var attempts = 0;
    if (scanWidgets()) return;

    var timer = window.setInterval(function () {
      attempts += 1;
      if (scanWidgets() || attempts >= MAX_ATTEMPTS) {
        window.clearInterval(timer);
      }
    }, INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
