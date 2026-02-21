(function () {

  const scriptTag = document.querySelector('script[data-bot-id]');
  if (!scriptTag) return;

  const botId = scriptTag.getAttribute("data-bot-id");
  const position = scriptTag.getAttribute("data-position") || "right";
  const theme = scriptTag.getAttribute("data-theme") || "light";
  const autoOpen = scriptTag.getAttribute("data-auto-open") === "true";

  if (!botId) return;

  let history = [];
  let sessionId = null;
  let config = {};
  let isLoading = false;

  const BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
  const CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;
  const MESSAGE_URL = BASE_URL + "create-chat";

  init();

  async function init() {
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

    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    const isDark = theme === "dark";
    const bgColor = isDark ? "#1f2937" : "#ffffff";
    const chatBg = isDark ? "#111827" : "#f9fafb";
    const textColor = isDark ? "#ffffff" : "#111827";

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
          transition:transform .25s ease, box-shadow .25s ease;
          z-index:9999;
        }

        .bubble:hover{
          transform:scale(1.08);
          box-shadow:0 25px 60px rgba(0,0,0,.25);
        }

        .bubble img{
          width:26px;height:26px;object-fit:contain;
        }

        .window{
          position:fixed;
          bottom:100px;
          ${position === "left" ? "left:24px;" : "right:24px;"}
          width:360px;height:550px;
          background:${bgColor};
          border-radius:18px;
          box-shadow:0 30px 80px rgba(0,0,0,.2);
          display:flex;flex-direction:column;
          overflow:hidden;
          opacity:0;visibility:hidden;
          transform:translateY(18px) scale(.96);
          transition:all .35s cubic-bezier(.22,1,.36,1);
        }

        .window.open{
          opacity:1;visibility:visible;
          transform:translateY(0) scale(1);
        }

        .header{
          padding:16px;
          background:${config.primaryColor};
          color:white;font-weight:600;
        }

        .messages{
          flex:1;padding:16px;
          overflow-y:auto;
          background:${chatBg};
        }

        .message{margin-bottom:12px;display:flex;}
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

        .input-area{
          padding:12px;
          border-top:1px solid #eee;
          display:flex;
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
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;
          opacity:.4;
          transition:opacity .2s;
        }

        .send-btn.active{opacity:1;}
      </style>

      <div class="bubble">
        ${config.iconUrl
          ? `<img src="${config.iconUrl}" onerror="this.remove()" />`
          : "💬"}
      </div>

      <div class="window">
        <div class="header">${config.name}</div>
        <div class="messages"></div>
        <div class="input-area">
          <input placeholder="Type message..." />
          <button class="send-btn">➤</button>
        </div>
      </div>
    `;

    const bubble = shadow.querySelector(".bubble");
    const windowEl = shadow.querySelector(".window");
    const messages = shadow.querySelector(".messages");
    const input = shadow.querySelector("input");
    const sendBtn = shadow.querySelector(".send-btn");

    bubble.onclick = () => {
      windowEl.classList.toggle("open");
      bubble.textContent = windowEl.classList.contains("open") ? "↓" : "💬";
    };

    input.addEventListener("input",()=>{
      if(input.value.trim()){
        sendBtn.classList.add("active");
      } else {
        sendBtn.classList.remove("active");
      }
    });

    sendBtn.onclick = sendMessage;
    input.addEventListener("keypress",e=>{
      if(e.key==="Enter" && input.value.trim()) sendMessage();
    });

    if(history.length){
      history.forEach(m=>renderMessage(m.content,m.role,false));
    } else {
      renderMessage(config.welcomeMessage,"bot",true);
    }

    function scrollBottom(){
      messages.scrollTop = messages.scrollHeight;
    }

    function renderMessage(text,role,save){
      const msg=document.createElement("div");
      msg.className="message "+role;
      const bubble=document.createElement("div");
      bubble.className="bubble-msg";
      bubble.textContent=text;
      msg.appendChild(bubble);
      messages.appendChild(msg);
      scrollBottom();

      if(save){
        history.push({role,content:text});
        saveHistory();
      }
    }

    async function sendMessage(){
      if(isLoading) return;
      const text=input.value.trim();
      if(!text) return;

      renderMessage(text,"user",true);
      input.value="";
      sendBtn.classList.remove("active");
      isLoading=true;

      const typingBubble=document.createElement("div");
      typingBubble.className="message bot";
      typingBubble.innerHTML='<div class="bubble-msg">Typing...</div>';
      messages.appendChild(typingBubble);
      scrollBottom();

      try{
        const res=await fetch(MESSAGE_URL,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({botId,message:text,sessionId})
        });

        const data=await res.json();
        const reply=data.text||data.response?.text||"No response.";

        typingBubble.querySelector(".bubble-msg").textContent=reply;

        history.push({role:"bot",content:reply});
        saveHistory();
      }catch{
        typingBubble.querySelector(".bubble-msg").textContent="Server error.";
      }

      isLoading=false;
      scrollBottom();
    }
  }

})();
