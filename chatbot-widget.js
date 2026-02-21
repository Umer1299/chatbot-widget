(function () {

  function initWidget() {

    var scriptTag =
      document.currentScript ||
      document.querySelector('script[data-bot-id]');

    if (!scriptTag) return;

    var botId = scriptTag.getAttribute("data-bot-id");
    var position = scriptTag.getAttribute("data-position") || "right";

    if (!botId) return;

    var config = {};
    var BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
    var CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;

    fetch(CONFIG_URL)
      .then(function(res){ return res.json(); })
      .then(function(json){

        config = json.response || json || {};
        config.primaryColor = config.primaryColor || "#10b981";
        config.name = config.name || "Chat Assistant";
        config.iconUrl = config.iconUrl || config.icon_url || null;

        renderUI();
      });

    function renderUI() {

      var host = document.createElement("div");
      document.body.appendChild(host);
      var shadow = host.attachShadow({ mode: "open" });

      shadow.innerHTML = `
        <style>
          *{box-sizing:border-box;font-family:Arial,sans-serif;}

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
            z-index:999999;
          }

          .bubble:hover{ transform:scale(1.08); }

          .icon img{
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
            display:none;
            flex-direction:column;
            overflow:hidden;
            z-index:999999;
            transition:transform .3s ease, opacity .3s ease;
            transform:translateY(20px);
            opacity:0;
          }

          .window.active{
            display:flex;
            transform:translateY(0);
            opacity:1;
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

      var bubble = shadow.querySelector(".bubble");
      var icon = shadow.querySelector(".icon");
      var windowEl = shadow.querySelector(".window");

      function setIcon(){
        icon.innerHTML = "";

        if(config.iconUrl){
          var img = document.createElement("img");
          img.src = config.iconUrl;
          img.onerror = function(){
            icon.innerHTML = "&#128172;";
          };
          icon.appendChild(img);
        } else {
          icon.innerHTML = "&#128172;";
        }
      }

      setIcon();

      bubble.onclick = function(){

        var isOpen = windowEl.classList.contains("active");

        if(isOpen){
          windowEl.classList.remove("active");
          setIcon();
        } else {
          windowEl.classList.add("active");
          icon.innerHTML = "&#8595;";
        }

      };

    }

  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }

})();
