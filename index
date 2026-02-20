// clean-flowise-widget.js
(function () {
  /* ===========================
     1. READ CONFIG
  ============================ */
  const script = document.currentScript;

  const chatId = script.getAttribute("data-chat-id");
  const apiUrl =
    script.getAttribute("data-api-url") ||
    `https://your-flowise.com/api/v1/prediction/${chatId}`;

  const primaryColor =
    script.getAttribute("data-primary-color") || "#2563eb";

  const botName =
    script.getAttribute("data-bot-name") || "Assistant";

  const welcomeMessage =
    script.getAttribute("data-welcome-message") ||
    `Hi 👋 I'm ${botName}. How can I help you today?`;

  if (!chatId) {
    console.error("Flowise Widget: data-chat-id is required.");
    return;
  }

  /* ===========================
     2. SESSION MANAGEMENT
  ============================ */
  const storageKey = `flowise_session_${chatId}`;
  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId =
      "s_" + Date.now() + "_" + Math.random().toString(36).substring(2);
    localStorage.setItem(storageKey, sessionId);
  }

  /* ===========================
     3. CREATE SHADOW ROOT
  ============================ */
  const host = document.createElement("div");
  host.id = "flowise-widget-host";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
  <style>
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .bubble {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${primaryColor};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      transition: transform 0.2s ease;
      z-index: 9999;
    }

    .bubble:hover {
      transform: scale(1.08);
    }

    .window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 360px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
    }

    .header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
    }

    .message {
      margin-bottom: 12px;
      display: flex;
    }

    .user {
      justify-content: flex-end;
    }

    .bot {
      justify-content: flex-start;
    }

    .bubble-msg {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
    }

    .user .bubble-msg {
      background: ${primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .bot .bubble-msg {
      background: #e2e8f0;
      color: #111827;
      border-bottom-left-radius: 4px;
    }

    .input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      background: white;
    }

    input {
      flex: 1;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid #d1d5db;
      outline: none;
      font-size: 14px;
    }

    button {
      margin-left: 8px;
      padding: 10px 16px;
      border-radius: 999px;
      border: none;
      background: ${primaryColor};
      color: white;
      cursor: pointer;
      font-size: 14px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  </style>

  <div class="bubble">💬</div>

  <div class="window">
    <div class="header">
      <span>${botName}</span>
      <span class="close" style="cursor:pointer;">✕</span>
    </div>

    <div class="messages"></div>

    <div class="input-area">
      <input type="text" placeholder="Type a message..." />
      <button>Send</button>
    </div>
  </div>
  `;

  /* ===========================
     4. DOM REFERENCES
  ============================ */
  const bubble = shadow.querySelector(".bubble");
  const windowEl = shadow.querySelector(".window");
  const closeBtn = shadow.querySelector(".close");
  const messages = shadow.querySelector(".messages");
  const input = shadow.querySelector("input");
  const sendBtn = shadow.querySelector("button");

  let isOpen = false;
  let isLoading = false;

  /* ===========================
     5. UI TOGGLE
  ============================ */
  bubble.addEventListener("click", () => {
    isOpen = !isOpen;
    windowEl.style.display = isOpen ? "flex" : "none";
    if (isOpen) input.focus();
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    windowEl.style.display = "none";
  });

  /* ===========================
     6. MESSAGE HANDLING
  ============================ */
  function appendMessage(text, type) {
    const msg = document.createElement("div");
    msg.className = `message ${type}`;
    msg.innerHTML = `<div class="bubble-msg">${escapeHtml(text)}</div>`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[m]);
  }

  async function sendMessage() {
    if (isLoading) return;

    const text = input.value.trim();
    if (!text) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.value = "";

    appendMessage(text, "user");

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          sessionId: sessionId,
        }),
      });

      const data = await res.json();
      appendMessage(data.text || "No response.", "bot");
    } catch (err) {
      appendMessage("Error connecting to server.", "bot");
      console.error(err);
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  /* ===========================
     7. INITIAL MESSAGE
  ============================ */
  appendMessage(welcomeMessage, "bot");

})();
