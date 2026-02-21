(function () {

  const scriptTag = document.querySelector('script[data-bot-id]');
  if (!scriptTag) return;

  const botId = scriptTag.getAttribute("data-bot-id");
  const position = scriptTag.getAttribute("data-position") || "right";
  const theme = scriptTag.getAttribute("data-theme") || "light";

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

    createSession();
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

  function renderUI() {

    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

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
          transition:transform .25s ease;
          z-index:9999;
        }

        .bubble:hover{ transform:scale(1.08); }

        .bubble img{
          width:26px;height:26px;object-fit:contain;
        }

        .window{
          position:fixed;
          bottom:100px;
          ${position === "left" ? "left:24px;" : "right:24px;"}
          width:360px;height:500px;
          background:#fff;
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
        }

        button{
          margin-left:8px;
          width:42px;height:42px;
          border-radius:50%;
          border:none;
          background:${config.primaryColor};
          color:white;
          cursor:pointer;
        }
      </style>

      <div class="bubble">
        <span class="icon-content"></span>
      </div>

      <div class="window">
        <div class="header">${config.name}</div>
        <div class="messages"></div>
        <div class="input-area">
          <input placeholder="Type message..." />
          <button>➤</button>
        </div>
      </div>
    `;

    const bubble = shadow.querySelector(".bubble");
    const iconContent = shadow.querySelector(".icon-content");
    const windowEl = shadow.querySelector(".window");
    const messages = shadow.querySelector(".messages");
    const input = shadow.querySelector("input");
    const sendBtn = shadow.querySelector("button");

    // SET ICON PROPERLY
    if (config.iconUrl) {
      const img = document.createElement("img");
      img.src = config.iconUrl;
      img.onerror = () => img.remove();
      iconContent.appendChild(img);
    } else {
      iconContent.textContent = "💬";
    }

    // TOGGLE
    bubble.onclick = () => {
      const isOpen = windowEl.classList.toggle("open");

      if (isOpen) {
        iconContent.textContent = "↓";
      } else {
        iconContent.innerHTML = "";
        if (config.iconUrl) {
          const img = document.createElement("img");
          img.src = config.iconUrl;
          img.onerror = () => img.remove();
          iconContent.appendChild(img);
        } else {
          iconContent.textContent = "💬";
        }
      }
    };

    sendBtn.onclick = sendMessage;
    input.addEventListener("keypress",e=>{
      if(e.key==="Enter") sendMessage();
    });

    function scrollBottom(){
      messages.scrollTop = messages.scrollHeight;
    }

    function appendMessage(text,role){
      const div=document.createElement("div");
      div.style.marginBottom="10px";
      div.style.textAlign=role==="user"?"right":"left";
      div.innerHTML=\`<div style="
        display:inline-block;
        padding:8px 12px;
        border-radius:16px;
        background:\${role==="user"?config.primaryColor:"#f1f1f1"};
        color:\${role==="user"?"white":"black"};
      ">\${text}</div>\`;
      messages.appendChild(div);
      scrollBottom();
    }

    async function sendMessage(){
      const text=input.value.trim();
      if(!text||isLoading) return;

      appendMessage(text,"user");
      input.value="";
      isLoading=true;

      try{
        const res=await fetch(MESSAGE_URL,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({botId,message:text,sessionId})
        });

        const data=await res.json();
        const reply=data.text||data.response?.text||"No response.";
        appendMessage(reply,"bot");
      }catch{
        appendMessage("Server error.","bot");
      }

      isLoading=false;
    }

  }

})();
