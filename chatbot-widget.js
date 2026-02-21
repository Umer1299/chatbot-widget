(function () {

  function initWidget() {

    var scriptTag =
      document.currentScript ||
      document.querySelector('script[data-bot-id]');

    if (!scriptTag) return;

    var botId = scriptTag.getAttribute("data-bot-id");
    var position = scriptTag.getAttribute("data-position") || "right";
    var theme = scriptTag.getAttribute("data-theme") || "light";
    var autoOpen = scriptTag.getAttribute("data-auto-open") === "true";

    if (!botId) return;

    var BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
    var CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;
    var MESSAGE_URL = BASE_URL + "create-chat";

    var config = {};
    var sessionId = null;
    var history = [];
    var isLoading = false;

    fetch(CONFIG_URL)
      .then(function (r) { return r.json(); })
      .then(function (json) {

        config = json.response || json || {};
        config.primaryColor = config.primaryColor || "#10b981";
        config.name = config.name || "Chat Assistant";
        config.welcomeMessage = config.welcomeMessage || "Hello!";
        config.iconUrl = config.iconUrl || null;
        config.starterPrompts = config.starterPrompts || [];

        createSession();
        loadHistory();
        renderUI();
      });

    function createSession() {
      var key = "chat_session_" + botId;
      sessionId = localStorage.getItem(key);
      if (!sessionId) {
        sessionId = "s_" + Date.now();
        localStorage.setItem(key, sessionId);
      }
    }

    function loadHistory() {
      var saved = localStorage.getItem("chat_history_" + botId);
      if (saved) history = JSON.parse(saved);
    }

    function saveHistory() {
      localStorage.setItem(
        "chat_history_" + botId,
        JSON.stringify(history)
      );
    }

    function renderUI() {

      var host = document.createElement("div");
      document.body.appendChild(host);
      var shadow = host.attachShadow({ mode: "open" });

      var isDark = theme === "dark";

      shadow.innerHTML = `
<style>
*{box-sizing:border-box;font-family:Inter,Arial,sans-serif;}

.bubble{
position: fixed;
  bottom: 24px;
  ${position === "left" ? "left:24px;" : "right:24px;"}
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${config.primaryColor};
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  box-shadow:0 20px 50px rgba(0,0,0,.2);
  z-index:9999;
  transition: transform .25s ease;
  overflow:hidden;
  padding:0;
}
.bubble:hover{transform:scale(1.08);}
.bubble img.bubble-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;     /* IMPORTANT */
  border-radius: 50%;
  display:block;
}

.default-icon {
  font-size:26px;
  color:white;
}

.window{
position:fixed;
bottom:100px;
${position === "left" ? "left:24px;" : "right:24px;"}
width:380px;height:600px;
background:${isDark ? "#1f2937" : "#ffffff"};
border-radius:18px;
box-shadow:0 40px 100px rgba(0,0,0,.25);
display:flex;flex-direction:column;
overflow:hidden;
z-index:999999;
opacity:0;visibility:hidden;
transform:translateY(20px) scale(.96);
transition:all .35s cubic-bezier(.22,1,.36,1);
}
.window.open{
opacity:1;visibility:visible;
transform:translateY(0) scale(1);
}

.header{
padding:18px;
background:${config.primaryColor};
color:white;font-weight:600;
}

.messages{
flex:1;padding:16px;
overflow-y:auto;
background:${isDark ? "#111827" : "#f9fafb"};
scroll-behavior:smooth;
}

.message{margin-bottom:12px;display:flex;}
.user{justify-content:flex-end;}
.bot{justify-content:flex-start;}

.bubble-msg{
max-width:78%;
padding:12px 16px;
border-radius:18px;
font-size:14px;
line-height:1.5;
word-break:break-word;
}

.user .bubble-msg{
background:${config.primaryColor};
color:white;
border-bottom-right-radius:6px;
}

.bot .bubble-msg{
background:${isDark ? "#374151" : "#ffffff"};
color:${isDark ? "#ffffff" : "#111827"};
border-bottom-left-radius:6px;
box-shadow:0 5px 15px rgba(0,0,0,.05);
}

.input-area{
padding:14px;
border-top:1px solid #eee;
display:flex;
background:${isDark ? "#1f2937" : "#ffffff"};
}

input{
flex:1;
padding:12px 14px;
border-radius:999px;
border:1px solid #ddd;
outline:none;
font-size:14px;
}

.send-btn{
margin-left:8px;
width:44px;height:44px;
border-radius:50%;
border:none;
background:${config.primaryColor};
display:flex;align-items:center;justify-content:center;
cursor:pointer;
opacity:.5;
}
.send-btn.active{opacity:1;cursor:pointer;}

.typing{
display:inline-flex;
gap:4px;
}
.typing span{
width:6px;height:6px;
background:#999;border-radius:50%;
animation:bounce 1.4s infinite ease-in-out both;
}
.typing span:nth-child(1){animation-delay:-0.32s;}
.typing span:nth-child(2){animation-delay:-0.16s;}

@keyframes bounce{
0%,80%,100%{transform:scale(0);}
40%{transform:scale(1);}
}

.prompt{
background:#eee;
padding:8px 12px;
border-radius:16px;
cursor:pointer;
font-size:13px;
margin:4px 4px 0 0;
display:inline-block;
}
</style>

<div class="bubble">${
    config.iconUrl
      ? <img src="https:${config.iconUrl.replace(/^https?:/, '')}" class="bubble-icon" />
      : <span class="default-icon">💬</span>
  }</div>

<div class="window">
<div class="header">${config.name}</div>
<div class="messages"></div>
<div class="input-area">
<input placeholder="Type a message..." />
<button class="send-btn">
<svg width="18" height="18" fill="white" viewBox="0 0 24 24">
<path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
</svg>
</button>
</div>
</div>
`;

      var bubble = shadow.querySelector(".bubble");
      var windowEl = shadow.querySelector(".window");
      var messages = shadow.querySelector(".messages");
      var input = shadow.querySelector("input");
      var sendBtn = shadow.querySelector(".send-btn");
      var icon = shadow.querySelector(".icon");

      function setIcon() {
        icon.innerHTML = "";
        if (config.iconUrl) {
          var img = document.createElement("img");
          img.src = config.iconUrl;
          img.style.width = "26px";
          img.style.height = "26px";
          img.onerror = function () {
            icon.innerHTML = "&#128172;";
          };
          icon.appendChild(img);
        } else {
          icon.innerHTML = "&#128172;";
        }
      }

      setIcon();

      bubble.onclick = function () {
        var isOpen = windowEl.classList.toggle("open");
        if (isOpen) icon.innerHTML = "&#8595;";
        else setIcon();
      };

      if (autoOpen) setTimeout(function(){ windowEl.classList.add("open"); }, 1200);

      input.addEventListener("input", function () {
        if (input.value.trim()) sendBtn.classList.add("active");
        else sendBtn.classList.remove("active");
      });

      sendBtn.onclick = function () {
        if (!input.value.trim()) return;
        sendMessage();
      };

      input.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && input.value.trim()) sendMessage();
      });

      if (history.length === 0) {
        appendMessage(config.welcomeMessage, "bot", true);
        renderPrompts();
      } else {
        history.forEach(function (m) {
          appendMessage(m.content, m.role, false);
        });
      }

      function renderPrompts() {
        config.starterPrompts.forEach(function (p) {
          var btn = document.createElement("div");
          btn.className = "prompt";
          btn.textContent = p;
          btn.onclick = function () {
            input.value = p;
            sendBtn.classList.add("active");
            sendMessage();
          };
          messages.appendChild(btn);
        });
      }

      function scrollBottom() {
        messages.scrollTop = messages.scrollHeight;
      }

      function appendMessage(text, role, save) {
        var msg = document.createElement("div");
        msg.className = "message " + role;
        var bubble = document.createElement("div");
        bubble.className = "bubble-msg";
        bubble.textContent = text;
        msg.appendChild(bubble);
        messages.appendChild(msg);
        scrollBottom();
        if (save) {
          history.push({ role: role, content: text });
          saveHistory();
        }
        return bubble;
      }

      function typeWriter(el, text) {
        el.textContent = "";
        var i = 0;
        var interval = setInterval(function () {
          el.textContent += text[i];
          i++;
          scrollBottom();
          if (i >= text.length) clearInterval(interval);
        }, 15);
      }

      function sendMessage() {

        if (isLoading) return;

        var text = input.value.trim();
        if (!text) return;

        appendMessage(text, "user", true);
        input.value = "";
        sendBtn.classList.remove("active");
        isLoading = true;

        var botBubble = appendMessage("", "bot", false);

        botBubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
        scrollBottom();

        fetch(MESSAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: botId,
            message: text,
            sessionId: sessionId
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {

            var reply = data.text || data.response?.text || "No response.";
            typeWriter(botBubble, reply);

            history.push({ role: "bot", content: reply });
            saveHistory();
          })
          .catch(function () {
            botBubble.textContent = "Server error.";
          })
          .finally(function () {
            isLoading = false;
          });
      }

    }

  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }

})();

