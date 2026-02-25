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
    var embedMode = scriptTag.getAttribute("data-embed-mode") || "popup";
    var userId = scriptTag.getAttribute("data-user-id") || null;

    if (!botId) return;

    var BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
    var CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;
    var MESSAGE_URL = BASE_URL + "create-chat";
    var FEEDBACK_URL = "https://chatflowai.io/api/1.1/wf/create-feedback";

    var config = {};
    var sessionId = null;
    var isLoading = false;
    var chatHistory = [];

    fetch(CONFIG_URL)
      .then(function (r) { return r.json(); })
      .then(function (json) {
        config = json.response || {};
        config.primaryColor = config.primaryColor || "#2563eb";
        config.name = config.name || "Chat Assistant";
        config.welcomeMessage = config.welcomeMessage || "Hello!";
        config.iconUrl = config.iconUrl || null;
        config.starterPrompts = config.starterPrompts || config.starterprompts || [];
        config.brandingText = config.brandingText || config.poweredByText || "Powered by Chatflow";
        config.brandingUrl = config.brandingUrl || config.poweredByUrl || "https://chatflowai.io";

        var showBrandingValue =
          config.showBranding !== undefined
            ? config.showBranding
            : config.showbranding;
        config.showBranding = showBrandingValue !== false && showBrandingValue !== "false";

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

    function getHistoryKey() {
      return "chat_history_" + botId + "_" + sessionId;
    }

    function loadHistory() {
      try {
        var saved = localStorage.getItem(getHistoryKey());
        chatHistory = saved ? JSON.parse(saved) : [];
      } catch (e) {
        chatHistory = [];
      }
    }

    function persistHistory() {
      localStorage.setItem(getHistoryKey(), JSON.stringify(chatHistory));
    }

    function addHistoryMessage(role, text) {
      chatHistory.push({ role: role, text: text });
      persistHistory();
    }

    function renderUI() {

      var host = document.createElement("div");
      document.body.appendChild(host);
      var shadow = host.attachShadow({ mode: "open" });

      var isDark = theme === "dark";
      var isIframeMode = embedMode === "iframe";

      var iconUrl = config.iconUrl
        ? (config.iconUrl.indexOf("http") === 0
          ? config.iconUrl
          : "https:" + config.iconUrl)
        : "";

      var iconHTML = iconUrl
        ? '<img src="' + iconUrl + '" class="bubble-icon">'
        : '<span class="default-icon">💬</span>';

      var headerIconHTML = iconUrl
        ? '<img src="' + iconUrl + '" class="header-icon" alt="">'
        : "";

      shadow.innerHTML = `
<style>
*{box-sizing:border-box;font-family:Inter,Arial,sans-serif;}

.bubble{
position:fixed;
bottom:24px;
${position === "left" ? "left:24px;" : "right:24px;"}
width:60px;height:60px;
border-radius:50%;
background:${config.primaryColor};
display:${isIframeMode ? "none" : "flex"};align-items:center;justify-content:center;
cursor:pointer;
box-shadow:0 15px 40px rgba(0,0,0,.25);
z-index:999999;
transition:.25s;
overflow:hidden;
}
.bubble:hover{transform:scale(1.08);}
.bubble-icon{width:100%;height:100%;object-fit:cover;}
.default-icon{font-size:26px;color:white;}
.toggle-icon{width:24px;height:24px;fill:white;display:none;}
.bubble.open .bubble-icon,
.bubble.open .default-icon{display:none;}
.bubble.open .toggle-icon{display:block;}

.window{
position:fixed;
${isIframeMode ? "top:0;left:0;" : `bottom:100px;${position === "left" ? "left:24px;" : "right:24px;"}`}
width:${isIframeMode ? "100vw" : "380px"};height:${isIframeMode ? "100vh" : "600px"};
background:${isDark ? "#111827" : "#ffffff"};
border-radius:${isIframeMode ? "0" : "20px"};
box-shadow:${isIframeMode ? "none" : "0 40px 100px rgba(0,0,0,.25)"};
display:flex;flex-direction:column;
overflow:hidden;
z-index:999999;
opacity:${isIframeMode ? "1" : "0"};visibility:${isIframeMode ? "visible" : "hidden"};
transform:${isIframeMode ? "none" : "translateY(20px) scale(.96)"};
transition:${isIframeMode ? "none" : ".3s ease"};
}
.window.open{opacity:1;visibility:visible;transform:translateY(0) scale(1);}

.header{padding:16px;background:${config.primaryColor};color:white;font-weight:600;}
.header-main{display:flex;align-items:center;gap:10px;}
.header-icon{width:30px;height:30px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.2);}

.messages{
flex:1;
padding:14px;
overflow-y:auto;
background:${isDark ? "#1f2937" : "#f3f4f6"};
}

.message{margin-bottom:12px;display:flex;flex-direction:column;max-width:100%;}
.user{align-items:flex-end;}
.bot{align-items:flex-start;}

.bubble-msg{
max-width:82%;
padding:12px 14px;
border-radius:16px;
font-size:16px;
line-height:1.45;
word-break:break-word;
}

.user .bubble-msg{
background:${config.primaryColor};
color:white;
border-bottom-right-radius:6px;
}

.bot .bubble-msg{
background:${isDark ? "#374151" : "#e5e7eb"};
color:${isDark ? "#f9fafb" : "#111"};
border-bottom-left-radius:6px;
}

.feedback-actions{display:flex;align-items:center;gap:10px;margin-top:6px;padding-left:4px;color:${isDark ? "#9ca3af" : "#6b7280"};font-size:12px;}
.feedback-divider{opacity:.7;}
.feedback-btn{background:none;border:none;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${isDark ? "#9ca3af" : "#6b7280"};}
.feedback-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9;}
.feedback-btn.active{color:${config.primaryColor};}
.feedback-btn:hover{color:${isDark ? "#f9fafb" : "#111827"};}

.typing{display:inline-flex;gap:4px;}
.typing span{width:6px;height:6px;background:#999;border-radius:50%;animation:bounce 1.4s infinite ease-in-out both;}
.typing span:nth-child(1){animation-delay:-0.32s;}
.typing span:nth-child(2){animation-delay:-0.16s;}
@keyframes bounce{0%,80%,100%{transform:scale(0);}40%{transform:scale(1);}}

.starter-row{
padding:10px 14px 8px;
display:flex;gap:8px;overflow-x:auto;
background:${isDark ? "#111827" : "#fff"};
border-top:1px solid ${isDark ? "#374151" : "#eee"};
}
.starter-prompt{
white-space:nowrap;
padding:7px 10px;
border-radius:999px;
border:1px solid ${isDark ? "#4b5563" : "#d1d5db"};
background:${isDark ? "#1f2937" : "#fff"};
color:${isDark ? "#e5e7eb" : "#111"};
font-size:12px;
cursor:pointer;
}

.branding{padding:8px 14px;text-align:center;font-size:12px;border-top:1px solid ${isDark ? "#374151" : "#eee"};background:${isDark ? "#111827" : "white"};}
.branding a{color:${isDark ? "#e5e7eb" : "#6b7280"};text-decoration:none;}
.branding a:hover{text-decoration:underline;}

.input-area{padding:10px 12px;display:flex;align-items:center;background:${isDark ? "#111827" : "white"};border-top:1px solid ${isDark ? "#374151" : "#eee"};}
input{flex:1;padding:12px 14px;border-radius:999px;border:1px solid ${isDark ? "#4b5563" : "#ddd"};background:${isDark ? "#1f2937" : "white"};color:${isDark ? "#f9fafb" : "#111"};outline:none;font-size:16px;}
input::placeholder{color:#9ca3af;}
.send-btn{margin-left:8px;width:40px;height:40px;border-radius:50%;border:none;background:${config.primaryColor};display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.6;transition:.2s;}
.send-btn.active{opacity:1;}
</style>

${isIframeMode ? "" : `<div class="bubble">${iconHTML}<svg class="toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg></div>`}

<div class="window">
<div class="header"><div class="header-main">${headerIconHTML}<span>${config.name}</span></div></div>
<div class="messages"></div>
<div class="starter-row"></div>
${config.showBranding ? `<div class="branding"><a href="${config.brandingUrl}" target="_blank" rel="noopener noreferrer">${config.brandingText}</a></div>` : ""}
<div class="input-area">
<input placeholder="Message..." />
<button class="send-btn">
<svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
</button>
</div>
</div>
`;

      var bubble = shadow.querySelector(".bubble");
      var windowEl = shadow.querySelector(".window");
      var messages = shadow.querySelector(".messages");
      var starterRow = shadow.querySelector(".starter-row");
      var input = shadow.querySelector("input");
      var sendBtn = shadow.querySelector(".send-btn");

      function scrollBottom() {
        messages.scrollTop = messages.scrollHeight;
      }

      if (bubble) {
        bubble.onclick = function () {
          windowEl.classList.toggle("open");
          bubble.classList.toggle("open", windowEl.classList.contains("open"));
          setTimeout(scrollBottom, 120);
        };
      }

      if (!isIframeMode && autoOpen) {
        windowEl.classList.add("open");
        if (bubble) bubble.classList.add("open");
      }

      input.addEventListener("input", function () {
        sendBtn.classList.toggle("active", !!input.value.trim());
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      sendBtn.onclick = sendMessage;

      function appendMessage(text, role) {
        var msg = document.createElement("div");
        msg.className = "message " + role;
        var bubbleNode = document.createElement("div");
        bubbleNode.className = "bubble-msg";
        bubbleNode.textContent = text;
        msg.appendChild(bubbleNode);
        messages.appendChild(msg);
        scrollBottom();
        return { msg: msg, bubble: bubbleNode };
      }

      function postFeedback(feedback) {
        return fetch(FEEDBACK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: botId,
            sessionId: sessionId,
            feedback: feedback
          })
        });
      }

      function renderFeedbackActions(targetMessage) {
        var wrap = document.createElement("div");
        wrap.className = "feedback-actions";
        wrap.innerHTML = '<span>Just now</span><span class="feedback-divider">|</span>';

        var likeBtn = document.createElement("button");
        likeBtn.type = "button";
        likeBtn.className = "feedback-btn";
        likeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-1 6v13h9a2 2 0 0 0 2-2l1-7a2 2 0 0 0-2-2h-6zM7 8H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';

        var dislikeBtn = document.createElement("button");
        dislikeBtn.type = "button";
        dislikeBtn.className = "feedback-btn";
        dislikeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 0 0 3 3l1-6V3H5a2 2 0 0 0-2 2l-1 7a2 2 0 0 0 2 2h6zm7 1h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/></svg>';

        function setActive(btn) {
          likeBtn.classList.toggle("active", btn === likeBtn);
          dislikeBtn.classList.toggle("active", btn === dislikeBtn);
        }

        function submitFeedback(value, btn) {
          setActive(btn);
          postFeedback(value).catch(function () { setActive(null); });
        }

        likeBtn.addEventListener("click", function () { submitFeedback("like", likeBtn); });
        dislikeBtn.addEventListener("click", function () { submitFeedback("dislike", dislikeBtn); });

        wrap.appendChild(likeBtn);
        wrap.appendChild(dislikeBtn);
        targetMessage.appendChild(wrap);
        scrollBottom();
      }

      function typeText(target, text, delay, done) {
        var index = 0;
        target.textContent = "";

        function step() {
          if (index >= text.length) {
            scrollBottom();
            if (done) done();
            return;
          }
          target.textContent += text.charAt(index);
          index += 1;
          scrollBottom();
          setTimeout(step, delay);
        }

        step();
      }

      function getPromptText(prompt) {
        if (typeof prompt === "string") return prompt;
        if (prompt && typeof prompt === "object") {
          return prompt.text || prompt.label || prompt.prompt || "";
        }
        return "";
      }

      function renderStarterPrompts() {
        var promptList = Array.isArray(config.starterPrompts)
          ? config.starterPrompts
          : [];

        starterRow.innerHTML = "";
        if (!promptList.length) {
          starterRow.style.display = "none";
          return;
        }

        promptList.forEach(function (item) {
          var text = getPromptText(item).trim();
          if (!text) return;

          var button = document.createElement("button");
          button.type = "button";
          button.className = "starter-prompt";
          button.textContent = text;
          button.addEventListener("click", function () {
            if (isLoading) return;
            input.value = text;
            sendBtn.classList.add("active");
            sendMessage();
          });
          starterRow.appendChild(button);
        });
      }

      function renderHistory() {
        if (!chatHistory.length) {
          appendMessage(config.welcomeMessage, "bot");
          addHistoryMessage("bot", config.welcomeMessage);
          return;
        }

        chatHistory.forEach(function (entry) {
          if (!entry || !entry.role || typeof entry.text !== "string") return;
          appendMessage(entry.text, entry.role);
        });
      }

      renderHistory();
      renderStarterPrompts();

      if (isIframeMode) {
        windowEl.classList.add("open");
      }

      function sendMessage() {
        if (isLoading || !input.value.trim()) return;

        var text = input.value.trim();
        appendMessage(text, "user");
        addHistoryMessage("user", text);
        input.value = "";
        sendBtn.classList.remove("active");

        var botMessage = appendMessage("", "bot");
        var botBubble = botMessage.bubble;
        botBubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';

        isLoading = true;

        fetch(MESSAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: botId,
            message: text,
            sessionId: sessionId,
            userId: userId
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var reply =
              data.text ||
              (data.response && data.response.text) ||
              "No response.";

            typeText(botBubble, reply, 16, function () {
              addHistoryMessage("bot", reply);
              renderFeedbackActions(botMessage.msg);
            });
          })
          .catch(function () {
            botBubble.textContent = "Server error.";
            addHistoryMessage("bot", "Server error.");
            scrollBottom();
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
