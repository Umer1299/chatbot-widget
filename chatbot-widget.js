(function () {
  const script = document.currentScript;
  const botId = script.getAttribute("data-bot-id");
  const position = script.getAttribute("data-position") || "right";
  const theme = script.getAttribute("data-theme") || "light";
  const autoOpen = script.getAttribute("data-auto-open") === "true";

  if (!botId) {
    console.error("Chat Widget: data-bot-id is required.");
    return;
  }

  let history = [];

  const BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
  const CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;
  const MESSAGE_URL = BASE_URL + "create-chat";

  let config = {};
  let sessionId = null;
  let isLoading = false;

  init();

  async function init() {
    try {
      const res = await fetch(CONFIG_URL);
      const json = await res.json();
      config = json.response || json;

      config.primaryColor = config.primaryColor || "#10b981";
      config.welcomeMessage = config.welcomeMessage || "Hello!";
      config.name = config.name || "Chat Assistant";

      createSession();
      loadHistory();
      renderUI();
    } catch (err) {
      console.error("Init error:", err);
    }
  }

  function createSession() {
    const key = "chat_session_" + botId;
    sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = "s_" + Date.now();
      localStorage.setItem(key, sessionId);
    }
  }

  function loadHistory() {
    const saved = localStorage.getItem("chat_history_" + botId);
    if (saved) {
      history = JSON.parse(saved);
    }
  }

  function saveHistory() {
    localStorage.setItem(
      "chat_history_" + botId,
      JSON.stringify(history)
    );
  }

  function renderUI() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    const isDark = theme === "dark";
    const bgColor = isDark ? "#1f2937" : "#ffffff";
    const chatBg = isDark ? "#111827" : "#f9fafb";
    const textColor = isDark ? "#ffffff" : "#111827";

    shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: Inter, system-ui, sans-serif; }

      .bubble-button {
        position: fixed;
        bottom: 24px;
        ${position === "left" ? "left:24px;" : "right:24px;"}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${config.primaryColor};
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        color:white;
        font-size:24px;
        box-shadow:0 20px 50px rgba(0,0,0,.2);
        z-index:9999;
      }

      .window {
        position: fixed;
        bottom: 100px;
        ${position === "left" ? "left:24px;" : "right:24px;"}
        width: 360px;
        height: 550px;
        background:${bgColor};
        border-radius:18px;
        box-shadow:0 30px 80px rgba(0,0,0,.2);
        display:none;
        flex-direction:column;
        overflow:hidden;
        z-index:9999;
      }

      .header {
        padding:16px;
        background:${config.primaryColor};
        color:white;
        font-weight:600;
      }

      .messages {
        flex:1;
        padding:16px;
        overflow-y:auto;
        background:${chatBg};
      }

      .message { margin-bottom:12px; display:flex; }
      .user { justify-content:flex-end; }
      .bot { justify-content:flex-start; }

      .bubble-msg {
        max-width:75%;
        padding:12px 16px;
        border-radius:18px;
        font-size:14px;
        line-height:1.5;
        word-break:break-word;
      }

      .user .bubble-msg {
        background:${config.primaryColor};
        color:white;
        border-bottom-right-radius:6px;
      }

      .bot .bubble-msg {
        background:${bgColor};
        color:${textColor};
        border-bottom-left-radius:6px;
        box-shadow:0 5px 15px rgba(0,0,0,.05);
      }

      .input-area {
        padding:12px;
        border-top:1px solid #eee;
        display:flex;
        background:${bgColor};
      }

      input {
        flex:1;
        padding:10px 14px;
        border-radius:999px;
        border:1px solid #ddd;
        outline:none;
        font-size:14px;
      }

      button {
        margin-left:8px;
        padding:10px 16px;
        border-radius:999px;
        border:none;
        background:${config.primaryColor};
        color:white;
        cursor:pointer;
        font-size:14px;
      }

      .typing {
        display:inline-flex;
        gap:4px;
      }

      .typing span {
        width:6px;
        height:6px;
        background:#999;
        border-radius:50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }

      .typing span:nth-child(1) { animation-delay: -0.32s; }
      .typing span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    </style>

    <div class="bubble-button">💬</div>

    <div class="window">
      <div class="header">${escapeHtml(config.name)}</div>
      <div class="messages"></div>
      <div class="input-area">
        <input placeholder="Type a message..." />
        <button>Send</button>
      </div>
    </div>
    `;

    const bubble = shadow.querySelector(".bubble-button");
    const windowEl = shadow.querySelector(".window");
    const messages = shadow.querySelector(".messages");
    const input = shadow.querySelector("input");
    const button = shadow.querySelector("button");

    // Render history AFTER messages container exists
    if (history.length > 0) {
      history.forEach(msg => {
        renderMessage(messages, msg.content, msg.role, false);
      });
    } else {
      renderMessage(messages, config.welcomeMessage, "bot", true);
    }

    bubble.onclick = () => {
      windowEl.style.display =
        windowEl.style.display === "flex" ? "none" : "flex";
    };

    if (autoOpen) {
      setTimeout(() => {
        windowEl.style.display = "flex";
      }, 1500);
    }

    button.onclick = () => sendMessage();
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
      if (isLoading) return;

      const text = input.value.trim();
      if (!text) return;

      renderMessage(messages, text, "user", true);
      input.value = "";
      isLoading = true;

      const botMsg = renderMessage(messages, "", "bot", false);

      botMsg.innerHTML = `
        <div class="typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;

      try {
        const response = await fetch(MESSAGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId,
            message: text,
            sessionId
          })
        });

        const data = await response.json();
        const reply =
          data.text ||
          data.response?.text ||
          "No response.";

        botMsg.textContent = reply;

        history.push({ role: "bot", content: reply });
        saveHistory();

      } catch (err) {
        botMsg.textContent = "Server error.";
      }

      isLoading = false;
    }
  }

  function renderMessage(container, text, role, save) {
    const msg = document.createElement("div");
    msg.className = "message " + role;

    const bubble = document.createElement("div");
    bubble.className = "bubble-msg";
    bubble.textContent = text;

    msg.appendChild(bubble);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    if (save && text) {
      history.push({ role, content: text });
      saveHistory();
    }

    return bubble;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])
    );
  }
})();
