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

      config.primaryColor ||= "#10b981";
      config.welcomeMessage ||= "Hello!";
      config.name ||= "Chat Assistant";
      config.starterPrompts ||= [];

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
    if (saved) history = JSON.parse(saved);
  }

  function saveHistory() {
    localStorage.setItem("chat_history_" + botId, JSON.stringify(history));
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
      * { box-sizing:border-box; font-family:Inter,system-ui,sans-serif; }

      .bubble-button {
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
        overflow:hidden;
      }

      .bubble-button img {
        width:26px;height:26px;
      }

      .bubble-button:hover { transform:scale(1.08); }
      .bubble-button:active { transform:scale(.92); }

      .window {
        position:fixed;
        bottom:100px;
        ${position === "left" ? "left:24px;" : "right:24px;"}
        width:360px;height:550px;
        background:${bgColor};
        border-radius:18px;
        box-shadow:0 30px 80px rgba(0,0,0,.2);
        display:flex;flex-direction:column;
        overflow:hidden;
        opacity:0;visibility:hidden;pointer-events:none;
        transform:translateY(18px) scale(.96);
        transition:all .35s cubic-bezier(.22,1,.36,1);
      }

      .window.open {
        opacity:1;visibility:visible;pointer-events:auto;
        transform:translateY(0) scale(1);
      }

      .header {
        padding:16px;
        background:${config.primaryColor};
        color:white;font-weight:600;
      }

      .messages {
        flex:1;padding:16px;
        overflow-y:auto;background:${chatBg};
      }

      .message { margin-bottom:12px;display:flex; }
      .user{justify-content:flex-end;}
      .bot{justify-content:flex-start;}

      .bubble-msg{
        max-width:75%;
        padding:12px 16px;
        border-radius:18px;
        font-size:14px;
      }

      .user .bubble-msg{
        background:${config.primaryColor};
        color:white;
        border-bottom-right-radius:6px;
      }

      .bot .bubble-msg{
        background:${bgColor};
        color:${textColor};
        border-bottom-left-radius:6px;
        box-shadow:0 5px 15px rgba(0,0,0,.05);
      }

      .starter-prompts{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-bottom:12px;
      }

      .starter-prompts button{
        background:${bgColor};
        border:1px solid #ddd;
        border-radius:999px;
        padding:6px 12px;
        font-size:12px;
        cursor:pointer;
      }

      .input-area{
        padding:12px;
        border-top:1px solid #eee;
        display:flex;
        background:${bgColor};
      }

      input{
        flex:1;
        padding:10px 14px;
        border-radius:999px;
        border:1px solid #ddd;
        outline:none;
      }

      .send-btn{
        margin-left:8px;
        width:42px;height:42px;
        border-radius:50%;
        border:none;
        background:${config.primaryColor};
        color:white;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        transition:opacity .2s ease;
      }

      .send-btn:disabled{
        opacity:.4;
        cursor:not-allowed;
      }

      .send-btn svg{
        width:18px;height:18px;
        fill:white;
      }
    </style>

    <div class="bubble-button">
      ${config.iconUrl 
        ? `<img src="${config.iconUrl}" />`
        : "💬"}
    </div>

    <div class="window">
      <div class="header">${config.name}</div>
      <div class="messages">
        <div class="starter-prompts"></div>
      </div>
      <div class="input-area">
        <input placeholder="Type a message..." />
        <button class="send-btn" disabled>
          <svg viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
    `;

    const bubble = shadow.querySelector(".bubble-button");
    const windowEl = shadow.querySelector(".window");
    const messages = shadow.querySelector(".messages");
    const starterContainer = shadow.querySelector(".starter-prompts");
    const input = shadow.querySelector("input");
    const sendBtn = shadow.querySelector(".send-btn");

    function scrollBottom(){
      messages.scrollTop = messages.scrollHeight;
    }

    // Toggle
    bubble.onclick = ()=>{
      windowEl.classList.toggle("open");
      scrollBottom();
    };

    // Enable / disable send button
    input.addEventListener("input", ()=>{
      sendBtn.disabled = !input.value.trim();
    });

    sendBtn.onclick = sendMessage;
    input.addEventListener("keypress",e=>{
      if(e.key==="Enter" && !sendBtn.disabled) sendMessage();
    });

    // Starter prompts
    if(config.starterPrompts.length && history.length===0){
      config.starterPrompts.forEach(text=>{
        const btn=document.createElement("button");
        btn.textContent=text;
        btn.onclick=()=>{
          input.value=text;
          sendBtn.disabled=false;
          sendMessage();
        };
        starterContainer.appendChild(btn);
      });
    }

    // Render history
    if(history.length){
      starterContainer.remove();
      history.forEach(msg=>renderMessage(messages,msg.content,msg.role,false));
    } else {
      renderMessage(messages,config.welcomeMessage,"bot",true);
    }

    async function sendMessage(){
      if(isLoading) return;

      const text=input.value.trim();
      if(!text) return;

      starterContainer.remove();

      renderMessage(messages,text,"user",true);
      input.value="";
      sendBtn.disabled=true;
      scrollBottom();
      isLoading=true;

      const botBubble=renderMessage(messages,"","bot",false);
      botBubble.textContent="Typing...";

      try{
        const res=await fetch(MESSAGE_URL,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({botId,message:text,sessionId})
        });

        const data=await res.json();
        const reply=data.text||data.response?.text||"No response.";
        botBubble.textContent=reply;

        history.push({role:"bot",content:reply});
        saveHistory();
      }catch{
        botBubble.textContent="Server error.";
      }

      isLoading=false;
      scrollBottom();
    }
  }

  function renderMessage(container,text,role,save){
    const msg=document.createElement("div");
    msg.className="message "+role;
    const bubble=document.createElement("div");
    bubble.className="bubble-msg";
    bubble.textContent=text;
    msg.appendChild(bubble);
    container.appendChild(msg);

    if(save){
      history.push({role,content:text});
      localStorage.setItem("chat_history_"+botId,JSON.stringify(history));
    }

    return bubble;
  }
})();
