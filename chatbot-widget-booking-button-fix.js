(function () {
  var STYLE_ID = "chatflow-booking-button-layout-fix";
  var MAX_ATTEMPTS = 80;
  var INTERVAL_MS = 250;

  function injectFix(root) {
    if (!root || !root.querySelector || root.getElementById(STYLE_ID)) return;

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

  function scanWidgets() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host], [id^='chatbot-widget-host-']");
    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) injectFix(hosts[i].shadowRoot);
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
