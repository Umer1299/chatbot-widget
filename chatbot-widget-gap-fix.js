(function () {
  var STYLE_ATTRIBUTE = "data-chatflow-gap-fix";
  var MAX_ATTEMPTS = 20;
  var attempt = 0;
  var LIGHT_SEND_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAItJREFUOI3N0DEOQUEUQNFHJChpbcIelHprsAbdtwaLYSsWoBeN7mjmy4SJzP8icauZl9z7khfxazD6Rm5wwrSv3NIt8iJ3i2BfkFuOmNRubnBN7x3uWWRckhe5nGZtYIl1FtmUAoO0dZvNnoH0X+GAec0t3wIlhlWlD/x/4BwRt4i49KpjilkvuZYHFKbfp+NCkccAAAAASUVORK5CYII=";
  var DARK_SEND_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAIVJREFUOI3Vz7EJAkEQheFPEfRCTW3CHgzNrcEaLjtrsBhtxQLMxcRMkxWGc5G9FQQfPBgG/n8YfpDJN3CHE5pa+JE6WBLhwZJ9Bn71iFnp5Q7XNLe4B8k0By97sCBYYRMk25xglMBd2EUBrHHA4tMbMX3BW8alpv8VnHHDpfZAg3ktXJQnOVkpXs/7om4AAAAASUVORK5CYII=";
  var CLOSE_DOWN_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAIZJREFUOI3VkLsNwjAURa9FBslC7JCeJSKkpICePlTZKjN4gOhQxIgnC3+g8y397jm2n9R8HHCW1Et6OOf2Ggg4SbpI2gR4jjzDoAiHLoAXMPJJVhLBAON7cDWHK9Al4MX0bnEhKSnCOckX+F5a0hTtxP55zsKJl9TdXJD8BhvJAAx/we3kBboLAifsiy/tAAAAAElFTkSuQmCC";

  function resizeTextarea(textarea) {
    if (!textarea) return;
    var minHeight = 42;
    var maxHeight = 112;
    textarea.style.height = minHeight + "px";
    var nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = nextHeight + "px";
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    var composer = textarea.closest ? textarea.closest(".composer") : null;
    if (composer) composer.setAttribute("data-multiline", nextHeight > minHeight + 4 ? "true" : "false");
  }

  function attachAutoGrow(root) {
    var textarea = root && root.querySelector ? root.querySelector(".composer textarea") : null;
    if (!textarea || textarea.__chatflowAutoGrowAttached) return;
    textarea.__chatflowAutoGrowAttached = true;
    textarea.setAttribute("rows", "1");
    resizeTextarea(textarea);
    textarea.addEventListener("input", function () { resizeTextarea(textarea); });
    textarea.addEventListener("change", function () { resizeTextarea(textarea); });
    textarea.addEventListener("keydown", function () {
      window.setTimeout(function () { resizeTextarea(textarea); }, 0);
    });
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
        ".composer{position:relative!important;flex:0 0 auto!important;margin-top:0!important;display:block!important;padding:7px 12px!important;background:#fff!important}",
        ".composer textarea{box-sizing:border-box!important;width:100%!important;min-height:42px!important;height:42px;max-height:112px!important;padding:11px 58px 11px 14px!important;border-radius:22px!important;line-height:18px!important;overflow-y:hidden;resize:none!important;scrollbar-width:thin!important}",
        ".branding{flex:0 0 auto!important;padding:5px 12px!important}",
        ".send-btn{position:absolute!important;right:19px!important;top:28px!important;bottom:auto!important;transform:translateY(-50%)!important;box-sizing:border-box!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important;padding:0!important;border-radius:999px!important;background:var(--chatbot-primary,#2563eb)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:0!important;line-height:1!important;box-shadow:none!important}",
        ".composer[data-multiline='true'] .send-btn{top:auto!important;bottom:14px!important;transform:none!important}",
        ".send-btn::before{content:''!important;width:15px!important;height:15px!important;display:block!important;background-image:url('" + LIGHT_SEND_ICON + "')!important;background-repeat:no-repeat!important;background-position:center!important;background-size:15px 15px!important;transform:translateY(0)!important}",
        ".widget-root[data-theme='dark'] .send-btn::before{background-image:url('" + DARK_SEND_ICON + "')!important}",
        ".send-btn:disabled{opacity:.45!important;cursor:not-allowed!important;box-shadow:none!important}",
        ".widget-root[data-open='true'] .launcher{width:58px!important;height:58px!important;border-radius:999px!important;background:var(--chatbot-primary,#2563eb)!important;color:#fff!important;font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 14px 34px rgba(0,0,0,.28)!important;overflow:visible!important}",
        ".widget-root[data-open='true'] .launcher img{display:none!important}",
        ".widget-root[data-open='true'] .launcher::before{content:''!important;width:18px!important;height:18px!important;display:block!important;background-image:url('" + CLOSE_DOWN_ICON + "')!important;background-repeat:no-repeat!important;background-position:center!important;background-size:18px 18px!important}",
        ".chat-header{gap:6px!important}",
        ".chat-header .icon-btn,.header .icon-btn,.icon-btn.clear-btn,.icon-btn.close-btn{background:transparent!important;background-color:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important;padding:0!important;margin:0!important;width:18px!important;height:18px!important;min-width:18px!important;max-width:18px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:18px!important;line-height:18px!important;color:#fff!important;opacity:1!important}",
        ".chat-header .icon-btn svg,.header .icon-btn svg,.icon-btn.clear-btn svg,.icon-btn.close-btn svg{width:18px!important;height:18px!important;stroke-width:2.4!important}",
        ".icon-btn.clear-btn{font-size:18px!important}",
        ".icon-btn.close-btn{font-size:19px!important}"
      ].join("\n");
      root.appendChild(style);
    }

    attachAutoGrow(root);
    return true;
  }

  function closeIfAutoOpenDisabled() {
    var hostState = window.__chatbotWidgetHostState;
    if (!hostState) return;

    Object.keys(hostState).forEach(function (key) {
      var state = hostState[key];
      if (!state || !state.elements || !state.elements.widgetRoot) return;
      if (state.configLoaded && state.autoOpen !== true) {
        state.elements.widgetRoot.setAttribute("data-open", "false");
        if (state.uiState) state.uiState.open = false;
      }
      if (state.elements && state.elements.input) resizeTextarea(state.elements.input);
    });
  }

  function scanOnce() {
    var hosts = document.querySelectorAll("[data-chatbot-widget-host], [id^='chatbot-widget-host-']");
    var installed = false;

    for (var i = 0; i < hosts.length; i += 1) {
      if (hosts[i] && hosts[i].shadowRoot) installed = installFix(hosts[i].shadowRoot) || installed;
    }

    closeIfAutoOpenDisabled();

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