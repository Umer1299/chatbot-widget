(function () {
  var STYLE_ATTRIBUTE = "data-chatflow-gap-fix";
  var MAX_ATTEMPTS = 60;
  var attempt = 0;
  var LIGHT_SEND_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAItJREFUOI3N0DEOQUEUQNFHJChpbcIelHprsAbdtwaLYSsWoBeN7mjmy4SJzP8icauZl9z7khfxazD6Rm5wwrSv3NIt8iJ3i2BfkFuOmNRubnBN7x3uWWRckhe5nGZtYIl1FtmUAoO0dZvNnoH0X+GAec0t3wIlhlWlD/x/4BwRt4i49KpjilkvuZYHFKbfp+NCkccAAAAASUVORK5CYII=";
  var DARK_SEND_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAIVJREFUOI3Vz7EJAkEQheFPEfRCTW3CHgzNrcEaLjtrsBhtxQLMxcRMkxWGc5G9FQQfPBgG/n8YfpDJN3CHE5pa+JE6WBLhwZJ9Bn71iFnp5Q7XNLe4B8k0By97sCBYYRMk25xglMBd2EUBrHHA4tMbMX3BW8alpv8VnHHDpfZAg3ktXJQnOVkpXs/7om4AAAAASUVORK5CYII=";
  var CLOSE_DOWN_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAIZJREFUOI3VkLsNwjAURa9FBslC7JCeJSKkpICePlTZKjN4gOhQxIgnC3+g8y397jm2n9R8HHCW1Et6OOf2Ggg4SbpI2gR4jjzDoAiHLoAXMPJJVhLBAON7cDWHK9Al4MX0bnEhKSnCOckX+F5a0hTtxP55zsKJl9TdXJD8BhvJAAx/we3kBboLAifsiy/tAAAAAElFTkSuQmCC";

  function getMinHeight() {
    if (window.matchMedia && window.matchMedia("(max-width: 420px)").matches) return 38;
    if (window.matchMedia && window.matchMedia("(max-width: 767px)").matches) return 40;
    return 42;
  }

  function getMaxHeight() {
    return window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? 104 : 110;
  }

  function resizeTextarea(textarea) {
    if (!textarea) return;
    var minHeight = getMinHeight();
    var maxHeight = getMaxHeight();
    textarea.setAttribute("rows", "1");
    textarea.style.height = minHeight + "px";
    var nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = nextHeight + "px";
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    var composer = textarea.closest ? textarea.closest(".composer") : null;
    if (composer) composer.setAttribute("data-multiline", nextHeight > minHeight + 4 ? "true" : "false");
  }

  function attachAutoGrow(root) {
    var textarea = root && root.querySelector ? root.querySelector(".composer textarea") : null;
    if (!textarea) return;
    if (!textarea.__chatflowAutoGrowAttached) {
      textarea.__chatflowAutoGrowAttached = true;
      textarea.addEventListener("input", function () { resizeTextarea(textarea); });
      textarea.addEventListener("change", function () { resizeTextarea(textarea); });
      textarea.addEventListener("keydown", function () { window.setTimeout(function () { resizeTextarea(textarea); }, 0); });
      window.addEventListener("resize", function () { resizeTextarea(textarea); });
    }
    resizeTextarea(textarea);
  }

  function forceInlineStyles(root) {
    var sendBtn = root.querySelector(".send-btn");
    var textarea = root.querySelector(".composer textarea");
    var composer = root.querySelector(".composer");
    var icons = root.querySelectorAll(".chat-header .icon-btn, .icon-btn.clear-btn, .icon-btn.close-btn");

    if (composer) {
      composer.style.position = "relative";
      composer.style.display = "block";
      composer.style.padding = window.matchMedia && window.matchMedia("(max-width: 420px)").matches ? "7px 8px 9px" : window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "8px 10px 10px" : "8px 12px 12px";
      composer.style.borderTop = "0";
    }

    if (textarea) {
      textarea.style.boxSizing = "border-box";
      textarea.style.width = "100%";
      textarea.style.borderRadius = "999px";
      textarea.style.resize = "none";
      textarea.style.display = "block";
      textarea.style.padding = window.matchMedia && window.matchMedia("(max-width: 420px)").matches ? "8px 46px 8px 12px" : window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "9px 50px 9px 12px" : "10px 58px 10px 14px";
      resizeTextarea(textarea);
    }

    if (sendBtn) {
      sendBtn.textContent = "";
      sendBtn.style.position = "absolute";
      sendBtn.style.right = window.matchMedia && window.matchMedia("(max-width: 420px)").matches ? "13px" : window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "15px" : "19px";
      sendBtn.style.top = window.matchMedia && window.matchMedia("(max-width: 420px)").matches ? "26px" : window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "28px" : "29px";
      sendBtn.style.width = window.matchMedia && window.matchMedia("(max-width: 420px)").matches ? "24px" : window.matchMedia && window.matchMedia("(max-width: 767px)").matches ? "26px" : "28px";
      sendBtn.style.height = sendBtn.style.width;
      sendBtn.style.minWidth = sendBtn.style.width;
      sendBtn.style.maxWidth = sendBtn.style.width;
      sendBtn.style.padding = "0";
      sendBtn.style.borderRadius = "999px";
      sendBtn.style.fontSize = "0";
      sendBtn.style.lineHeight = "1";
      sendBtn.style.display = "flex";
      sendBtn.style.alignItems = "center";
      sendBtn.style.justifyContent = "center";
      sendBtn.style.border = "0";
      sendBtn.style.boxShadow = "none";
      sendBtn.style.transform = "translateY(-50%)";
    }

    for (var i = 0; i < icons.length; i += 1) {
      icons[i].style.background = "transparent";
      icons[i].style.backgroundColor = "transparent";
      icons[i].style.boxShadow = "none";
      icons[i].style.border = "0";
      icons[i].style.borderRadius = "0";
      icons[i].style.width = "auto";
      icons[i].style.height = "auto";
      icons[i].style.padding = "0";
      icons[i].style.margin = "0";
    }
  }

  function installFix(root) {
    if (!root || !root.querySelector) return false;

    if (!root.querySelector("style[" + STYLE_ATTRIBUTE + "]")) {
      var style = document.createElement("style");
      style.setAttribute(STYLE_ATTRIBUTE, "true");
      style.textContent = [
        ".chat-panel{display:flex!important;flex-direction:column!important;min-height:0!important}",
        ".widget-root[data-open='false'] .chat-panel{display:none!important}",
        ".messages{flex:1 1 auto!important;min-height:0!important;overflow:auto!important}",
        ".prompts:empty{display:none!important;padding:0!important;border-top:0!important}",
        ".prompts[data-hidden='true']{display:none!important;padding:0!important;border-top:0!important}",
        ".composer{position:relative!important;flex:0 0 auto!important;margin-top:0!important;display:block!important;padding:8px 12px 12px!important;background:#fff!important;border-top:0!important;box-sizing:border-box!important}",
        ".composer textarea{box-sizing:border-box!important;width:100%!important;min-height:42px!important;height:42px;max-height:110px!important;padding:10px 58px 10px 14px!important;border:1px solid #d1d5db!important;border-radius:999px!important;line-height:1.35!important;overflow-y:hidden!important;resize:none!important;scrollbar-width:thin!important;display:block!important;background:#fff!important}",
        ".branding{flex:0 0 auto!important;padding:5px 12px!important}",
        ".send-btn{position:absolute!important;right:19px!important;top:29px!important;bottom:auto!important;transform:translateY(-50%)!important;box-sizing:border-box!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important;padding:0!important;border:0!important;border-radius:999px!important;background:var(--chatbot-primary,#2563eb)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:0!important;line-height:1!important;box-shadow:none!important;text-indent:-9999px!important;overflow:hidden!important}",
        ".composer[data-multiline='true'] .send-btn{top:auto!important;bottom:19px!important;transform:none!important}",
        ".send-btn::before{content:''!important;width:15px!important;height:15px!important;display:block!important;background-image:url('" + LIGHT_SEND_ICON + "')!important;background-repeat:no-repeat!important;background-position:center!important;background-size:15px 15px!important;transform:translateY(0)!important;text-indent:0!important}",
        ".widget-root[data-theme='dark'] .send-btn::before{background-image:url('" + DARK_SEND_ICON + "')!important}",
        ".send-btn::after{content:none!important;display:none!important}",
        ".send-btn:disabled{opacity:.45!important;cursor:not-allowed!important;box-shadow:none!important}",
        ".widget-root[data-open='true'] .launcher{width:58px!important;height:58px!important;border-radius:999px!important;background:var(--chatbot-primary,#2563eb)!important;color:#fff!important;font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 14px 34px rgba(0,0,0,.28)!important;overflow:visible!important}",
        ".widget-root[data-open='true'] .launcher img{display:none!important}",
        ".widget-root[data-open='true'] .launcher::before{content:''!important;width:18px!important;height:18px!important;display:block!important;background-image:url('" + CLOSE_DOWN_ICON + "')!important;background-repeat:no-repeat!important;background-position:center!important;background-size:18px 18px!important}",
        ".chat-header{gap:10px!important}",
        ".chat-header .title{margin-right:4px!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}",
        ".chat-header .icon-btn,.header .icon-btn,.icon-btn.clear-btn,.icon-btn.close-btn{background:transparent!important;background-color:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important;padding:0!important;margin:0!important;width:auto!important;height:auto!important;min-width:0!important;max-width:none!important;display:inline!important;font-size:24px!important;line-height:1!important;color:#fff!important;opacity:1!important;cursor:pointer!important}",
        ".icon-btn.clear-btn{font-size:23px!important;transform:translateY(-1px)!important}",
        ".icon-btn.close-btn{font-size:30px!important;font-weight:400!important;transform:translateY(-2px)!important}",
        "@media(max-width:767px){.composer{padding:8px 10px 10px!important}.composer textarea{min-height:40px!important;height:40px!important;max-height:104px!important;padding:9px 50px 9px 12px!important}.send-btn{right:15px!important;top:28px!important;width:26px!important;height:26px!important;min-width:26px!important;max-width:26px!important}.send-btn::before{width:14px!important;height:14px!important;background-size:14px 14px!important}.composer[data-multiline='true'] .send-btn{bottom:17px!important}}",
        "@media(max-width:420px){.composer{padding:7px 8px 9px!important}.composer textarea{min-height:38px!important;height:38px!important;padding:8px 46px 8px 12px!important}.send-btn{right:13px!important;top:26px!important;width:24px!important;height:24px!important;min-width:24px!important;max-width:24px!important}.send-btn::before{width:13px!important;height:13px!important;background-size:13px 13px!important}.composer[data-multiline='true'] .send-btn{bottom:16px!important}}"
      ].join("\n");
      root.appendChild(style);
    }

    attachAutoGrow(root);
    forceInlineStyles(root);
    return true;
  }

  function resizeExistingInputs() {
    var hostState = window.__chatbotWidgetHostState;
    if (!hostState) return;

    Object.keys(hostState).forEach(function (key) {
      var state = hostState[key];
      if (state && state.elements && state.elements.input) resizeTextarea(state.elements.input);
    });
  }

  function scanOnce() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host], [id^='chatbot-widget-host-']");

    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) installFix(hosts[i].shadowRoot);
    }

    resizeExistingInputs();

    attempt += 1;
    if (attempt < MAX_ATTEMPTS) {
      window.setTimeout(scanOnce, 250);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanOnce, { once: true });
  } else {
    scanOnce();
  }
})();
