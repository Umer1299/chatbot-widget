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

  const BASE_URL = "https://chatflowai.io/api/1.1/wf/";
  const CONFIG_URL =
    BASE_URL + "get-chatbot-config?chatID=" + botId;
  const MESSAGE_URL = BASE_URL + "create-chat";

  let config = null;
  let sessionId = null;
  let history = [];
  let isLoading = false;
  let isOpen = false;

  init();

  async function init() {
    try {
      const res = await fetch(CONFIG_URL);
      if (!res.ok) throw new Error("Invalid bot.");
      config = await res.json();

      createSession();
      renderUI();
    } catch (e) {
      console.error("Widget init failed:", e);
    }
  }

  function createSession() {
    const key = "chat_session_" + botId;
    sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId =
        "s_" + Date.now() + "_" + Math.random().toString(36).substring(2);
      localStorage.setItem(key, sessionId);
    }
  }

  function renderUI() {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    const bgColor = theme === "dark" ? "#111827" : "#ffffff";
    const textColor = theme === "dark" ? "#ffffff" : "#111827";
    const chatBg = theme === "dark" ? "#1f2937" : "#f9fafb";

    shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: Inter, system-ui, sans-serif; }

      .bubble {
        position: fixed;
        bottom: 24px;
        ${position === "left" ? "left:24px;" : "right:24px;"}
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: ${config.primaryColor};
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        box-shadow:0 20px 50px rgba(0,0,0,.2);
        color:white;
        font-size:22px;
        transition:.2s;
        z-index:9999;
      }

      .bubble:hover { transform:scale(1.08); }

      .window {
        position: fixed;
        bottom: 96px;
        ${position === "left" ? "left:24px;" : "right:24px;"}
        width: 380px;
        height: 600px;
        background:${bgColor};
        border-radius:20px;
        box-shadow:0 40px 100px rgba(0,0,0,.18);
        display:none;
        flex-direction:column;
        overflow:hidden;
        z-index:9999;
      }

      .header {
        padding:18px;
        background:${config.primaryColor};
        color:white;
        font-weight:600;
      }

      .messages {
        flex:1;
        padding:18px;
        overflow-y:auto;
        background:${chatBg};
      }

      .message {
        margin-bottom:14px;
        display:flex;
      }

      .user { justify-content:flex-end; }
      .bot { justify-content:flex-start; }

      .bubble-msg {
        max-width:78%;
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
        box-shadow:0 5px 15px rgba(0,0,0,.05);
        border-bottom-left-radius:6px;
      }

      .input-area {
        padding:16px;
        border-top:1px solid #eee;
        display:flex;
        background:${bgColor};
      }

      input {
        flex:1;
        padding:12px 16px;
        border-radius:999px;
        border:1px solid #ddd;
        outline:none;
        font-size:14px;
      }

      button {
        margin-left:8px;
        padding:12px 18px;
        border-radius:999px;
        border:none;
        background:${config.primaryColor};
        color:white;
        cursor:pointer;
        font-size:14px;
      }

      .branding {
        text-align:center;
        font-size:11px;
        padding:8px;
        opacity:.6;
      }
    </style>

    <div class="bubble">💬</div>

    <div class="window">
      <div class="header">${escapeHtml(config.name)}</div>
      <div class="messages"></div>
      <div class="input-area">
        <input placeholder="Type a message..." />
        <button>Send</button>
      </div>
      ${config.showBranding ? '<div class="branding">Powered by AI</div>' : ""}
    </div>
    `;

    attachEvents(shadow);
  }

  function attachEvents(shadow) {
    const bubble = shadow.querySelector(".bubble");
    const windowEl = shadow.querySelector(".window");
    const messages = shadow.querySelector(".messages");
    const input = shadow.querySelector("input");
    const button = shadow.querySelector("button");

    bubble.onclick = () => {
      isOpen = !isOpen;
      windowEl.style.display = isOpen ? "flex" : "none";
      if (isOpen) input.focus();
    };

    if (autoOpen) {
      setTimeout(() => {
        windowEl.style.display = "flex";
        isOpen = true;
      }, 2000);
    }

    button.onclick = () => sendMessage(input, messages);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage(input, messages);
    });

    appendMessage(messages, config.welcomeMessage, "bot");
  }

  async function sendMessage(input, messages) {
    if (isLoading) return;

    const text = input.value.trim();
    if (!text) return;

    appendMessage(messages, text, "user");
    history.push({ role: "userMessage", content: text });

    input.value = "";
    isLoading = true;

    const botBubble = createBotMessage(messages);

    try {
      const response = await fetch(MESSAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId,
          sessionId,
          message: text,
          history
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        botBubble.innerHTML = escapeHtml(fullText);
        messages.scrollTop = messages.scrollHeight;
      }

      history.push({ role: "apiMessage", content: fullText });

    } catch {
      botBubble.innerHTML = "Server error.";
    }

    isLoading = false;
  }

  function appendMessage(container, text, type) {
    const msg = document.createElement("div");
    msg.className = "message " + type;
    msg.innerHTML =
      '<div class="bubble-msg">' + escapeHtml(text) + "</div>";
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  function createBotMessage(container) {
    const msg = document.createElement("div");
    msg.className = "message bot";
    const bubble = document.createElement("div");
    bubble.className = "bubble-msg";
    msg.appendChild(bubble);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[m]);
  }
})();
