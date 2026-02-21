(function () {

  const scriptTag = document.querySelector('script[data-bot-id]');
  if (!scriptTag) {
    console.error("Chat Widget: script tag not found.");
    return;
  }

  const botId = scriptTag.getAttribute("data-bot-id");
  const position = scriptTag.getAttribute("data-position") || "right";
  const theme = scriptTag.getAttribute("data-theme") || "light";
  const autoOpen = scriptTag.getAttribute("data-auto-open") === "true";

  if (!botId) {
    console.error("Chat Widget: data-bot-id missing.");
    return;
  }

  let history = [];
  let sessionId = null;
  let isLoading = false;
  let config = {};

  const BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
  const CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;
  const MESSAGE_URL = BASE_URL + "create-chat";

  init();

  async function init() {
    try {
      const res = await fetch(CONFIG_URL);
      const json = await res.json();
      config = json.response || json || {};

      config.primaryColor ||= "#10b981";
      config.name ||= "Chat Assistant";
      config.welcomeMessage ||= "Hello!";
      config.iconUrl = config.iconUrl || config.icon_url || null;
      config.starterPrompts ||= [];

      createSession();
      loadHistory();
      renderUI();
    } catch (err) {
      console.error("Init failed:", err);
      renderFallback();
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
    if (saved) history = JSON.parse(saved);
  }

  function saveHistory() {
    localStorage.setItem(
      "chat_history_" + botId,
      JSON.stringify(history)
    );
  }

  function renderUI() {
    const container = document.createElement("div");
    document.body.appendChild(container);

    container.innerHTML = `
      <div id="chat-bubble" style="
        position:fixed;
        bottom:20px;
        ${position === "left" ? "left:20px;" : "right:20px;"}
        width:60px;height:60px;
        border-radius:50%;
        background:${config.primaryColor};
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:white;
        box-shadow:0 20px 50px rgba(0,0,0,.2);
        z-index:99999;
      ">
        ${config.iconUrl
          ? `<img src="${config.iconUrl}" style="width:26px;height:26px;" onerror="this.remove()" />`
          : "💬"}
      </div>

      <div id="chat-window" style="
        display:none;
        position:fixed;
        bottom:90px;
        ${position === "left" ? "left:20px;" : "right:20px;"}
        width:360px;height:520px;
        background:white;
        border-radius:16px;
        box-shadow:0 30px 80px rgba(0,0,0,.2);
        flex-direction:column;
        overflow:hidden;
        z-index:99999;
      ">
        <div style="
          background:${config.primaryColor};
          color:white;
          padding:14px;
          font-weight:600;
        ">${config.name}</div>

        <div id="chat-messages" style="
          flex:1;
          padding:14px;
          overflow-y:auto;
        "></div>

        <div style="display:flex;padding:10px;border-top:1px solid #eee;">
          <input id="chat-input" placeholder="Type message..." style="
            flex:1;
            padding:8px 12px;
            border-radius:999px;
            border:1px solid #ddd;
          "/>
          <button id="chat-send" disabled style="
            margin-left:8px;
            width:40px;height:40px;
            border-radius:50%;
            border:none;
            background:${config.primaryColor};
            color:white;
            cursor:pointer;
          ">➤</button>
        </div>
      </div>
    `;

    const bubble = document.getElementById("chat-bubble");
    const windowEl = document.getElementById("chat-window");
    const messages = document.getElementById("chat-messages");
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");

    bubble.onclick = () => {
      windowEl.style.display =
        windowEl.style.display === "flex" ? "none" : "flex";
    };

    input.addEventListener("input", () => {
      sendBtn.disabled = !input.value.trim();
    });

    sendBtn.onclick = sendMessage;
    input.addEventListener("keypress", e => {
      if (e.key === "Enter" && !sendBtn.disabled)
        sendMessage();
    });

    if (history.length === 0) {
      appendMessage(messages, config.welcomeMessage, "bot");
    } else {
      history.forEach(m =>
        appendMessage(messages, m.content, m.role)
      );
    }

    function appendMessage(container, text, role) {
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.style.textAlign = role === "user" ? "right" : "left";

      const bubble = document.createElement("div");
      bubble.style.display = "inline-block";
      bubble.style.padding = "8px 12px";
      bubble.style.borderRadius = "16px";
      bubble.style.background =
        role === "user"
          ? config.primaryColor
          : "#f1f1f1";
      bubble.style.color =
        role === "user" ? "white" : "black";
      bubble.textContent = text;

      div.appendChild(bubble);
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;

      history.push({ role, content: text });
      saveHistory();
    }

    function sendMessage() {
      if (isLoading) return;

      const text = input.value.trim();
      if (!text) return;

      appendMessage(messages, text, "user");
      input.value = "";
      sendBtn.disabled = true;
      isLoading = true;

      fetch(MESSAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, message: text, sessionId })
      })
        .then(res => res.json())
        .then(data => {
          const reply =
            data.text ||
            data.response?.text ||
            "No response.";
          appendMessage(messages, reply, "bot");
        })
        .catch(() => {
          appendMessage(messages, "Server error.", "bot");
        })
        .finally(() => {
          isLoading = false;
        });
    }
  }

  function renderFallback() {
    const bubble = document.createElement("div");
    bubble.innerHTML = "💬";
    bubble.style.position = "fixed";
    bubble.style.bottom = "20px";
    bubble.style.right = "20px";
    bubble.style.width = "60px";
    bubble.style.height = "60px";
    bubble.style.background = "#10b981";
    bubble.style.borderRadius = "50%";
    bubble.style.display = "flex";
    bubble.style.alignItems = "center";
    bubble.style.justifyContent = "center";
    bubble.style.color = "white";
    document.body.appendChild(bubble);
  }

})();
