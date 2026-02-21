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

        config = json.response || {};
        config.primaryColor = config.primaryColor || "#10b981";
        config.name = config.name || "Chat Assistant";
        config.welcomeMessage = config.welcomeMessage || "Hello!";
        config.iconUrl = config.iconUrl || null;

        var prompts = config.starterPrompts;

        if (!prompts) {
          config.starterPrompts = [];
        } else if (typeof prompts === "string") {
          try {
            var parsed = JSON.parse(prompts);
            config.starterPrompts = Array.isArray(parsed)
              ? parsed
              : prompts.split(",");
          } catch (e) {
            config.starterPrompts = prompts.split(",");
          }
        }

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

      var iconHTML = config.iconUrl
        ? '<img src="' +
          (config.iconUrl.indexOf("http") === 0
            ? config.iconUrl
            : "https:" + config.iconUrl) +
          '" class="bubble-icon">'
        : '<span class="default-icon">💬</span>';

      shadow.innerHTML = `
<style>
*{box-sizing:border-box;font-family:Inter,Arial,sans-serif;}

.bubble{
position:fixed;
bottom:24px;
${position === "left" ? "left:24px;" : "right:24px;"}
width:64px;height:64px;
border-radius:50%;
background:${config.primaryColor};
display:flex;align-items:center;justify-content:center;
cursor:pointer;
box-shadow:0 20px 50px rgba(0,0,0,.2);
z-index:999999;
transition:all .25s ease;
overflow:hidden;
}
.bubble:hover{transform:scale(1.08);}
.bubble-icon{
width:100%;height:100%;
object-fit:cover;border-radius:50%;
}
.default-icon{font-size:26px;color:white;}

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

.prompt{
background:#eee;
padding:8px 12px;
border-radius:16px;
cursor:pointer;
font-size:13px;
margin:6px 6px 0 0;
display:inline-block;
}
</style>

<div class="bubble">${iconHTML}</div>

<div class="window">
<div class="header">${config.name}</div>
<div class="messages"></div>
<div class="input-area">
<input placeholder="Type a message..." />
<button class="send-btn">Send</button>
</div>
</div>
`;

      var bubble = shadow.querySelector(".bubble");
      var windowEl = shadow.querySelector(".window");
      var messages = shadow.querySelector(".messages");
      var input = shadow.querySelector("input");
      var sendBtn = shadow.querySelector(".send-btn");

      // ✅ FIX 1: ICON CHANGES WHEN OPEN
      bubble.onclick = function () {
        var open = windowEl.classList.toggle("open");
        bubble.innerHTML = open ? "&#8595;" : iconHTML;
      };

      // Welcome
      if (!history || history.length === 0) {
        appendMessage(config.welcomeMessage, "bot", true);
      }

      function appendMessage(text, role, save) {
        var msg = document.createElement("div");
        msg.className = "message " + role;
        var bubbleMsg = document.createElement("div");
        bubbleMsg.className = "bubble-msg";
        bubbleMsg.textContent = text;
        msg.appendChild(bubbleMsg);
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
        if (save) {
          history.push({ role: role, content: text });
          saveHistory();
        }
        return bubbleMsg;
      }

      sendBtn.onclick = sendMessage;

      input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") sendMessage();
      });

      // ✅ FIX 2: TYPEWRITER ANIMATION
      function typeWriter(element, text) {
        element.textContent = "";
        var i = 0;
        var interval = setInterval(function () {
          element.textContent += text.charAt(i);
          messages.scrollTop = messages.scrollHeight;
          i++;
          if (i >= text.length) clearInterval(interval);
        }, 15);
      }

      function sendMessage() {

        if (isLoading) return;

        var text = input.value.trim();
        if (!text) return;

        appendMessage(text, "user", true);
        input.value = "";
        isLoading = true;

        var botBubble = appendMessage("...", "bot", false);

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

            var reply =
              data.text ||
              (data.response && data.response.text) ||
              "No response.";

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
