(function () {

  function initWidget() {

    const scriptTag =
      document.currentScript ||
      document.querySelector('script[data-bot-id]');

    if (!scriptTag) return;

    const botId = scriptTag.getAttribute("data-bot-id");
    const position = scriptTag.getAttribute("data-position") || "right";

    if (!botId) return;

    let config = {};
    let sessionId = null;

    const BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
    const CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;

    fetch(CONFIG_URL)
      .then(res => res.json())
      .then(json => {
        config = json.response || json || {};
        config.primaryColor ||= "#10b981";
        config.name ||= "Chat Assistant";
        config.iconUrl = config.iconUrl || config.icon_url || null;
        renderUI();
      });

    function renderUI() {

      const host = document.createElement("div");
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });

      shadow.innerHTML = `
        <style>
          *{box-sizing:border-box;font-family:Inter,system-ui,sans-serif;}

          .bubble{
            position:fixed;
            bottom:24px;
            ${position === "left" ? "left:24px;" : "right:24px;"}
            width:60px;height:60px;
            border-radius:50%;
            background:${config.primaryColor};
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;color:white;
            box-shadow:0 20px 50px rgba(0,0,0,.2);
            transition:transform .25s ease;
            z-index:9999;
          }

          .bubble:hover{ transform:scale(1.08); }

          .icon{
            display:flex;
            align-items:center;
            justify-content:center;
            transition:transform .3s ease;
          }

          .bubble img{
            width:26px;height:26px;
          }

          .window{
            position:fixed;
            bottom:100px;
            ${position === "left" ? "left:24px;" : "right:24px;"}
            width:360px;height:500px;
            background:#fff;
            border-radius:18px;
            box-shadow:0 30px 80px rgba(0,0,0,.2);
            opacity:0;visibility:hidden;
            transform:translateY(20px) scale(.95);
            transition:all .35s cubic-bezier(.22,1,.36,1);
            overflow:hidden;
            display:flex;
            flex-direction:column;
          }

          .window.open{
            opacity:1;
            visibility:visible;
            transform:translateY(0) scale(1);
          }

          .header{
            padding:16px;
            background:${config.primaryColor};
            color:white;
            font-weight:600;
          }
        </style>

        <div class="bubble">
          <div class="icon"></div>
        </div>

        <div class="window">
          <div class="header">${config.name}</div>
        </div>
      `;

      const bubble = shadow.querySelector(".bubble");
      const icon = shadow.querySelector(".icon");
      const windowEl = shadow.querySelector(".window");

      // SET ICON PROPERLY
      function setIcon() {
        icon.innerHTML = "";

        if (config.iconUrl) {
          const img = document.createElement("img");
          img.src = config.iconUrl;
          img.onerror = () => {
            icon.textContent = "💬";
          };
          icon.appendChild(img);
        } else {
          icon.textContent = "💬";
        }
      }

      setIcon();

      bubble.onclick = () => {
        const isOpen = windowEl.classList.toggle("open");

        if (isOpen) {
          icon.innerHTML = "↓";
        } else {
          setIcon();
        }
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }

})();
