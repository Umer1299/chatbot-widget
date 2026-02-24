<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Chatflow Embed</title>
<style>
*{box-sizing:border-box;font-family:Inter,Arial,sans-serif;margin:0;padding:0}

body{
height:100vh;
display:flex;
flex-direction:column;
background:#f3f4f6;
}

.chat-container{
flex:1;
display:flex;
flex-direction:column;
height:100%;
width:100%;
}

.header{
padding:16px;
font-weight:600;
color:white;
}

.messages{
flex:1;
overflow-y:auto;
padding:16px;
background:#f3f4f6;
}

.message{
margin-bottom:12px;
display:flex;
flex-direction:column;
max-width:100%;
}

.user{align-items:flex-end;}
.bot{align-items:flex-start;}

.bubble-msg{
max-width:75%;
padding:12px 14px;
border-radius:16px;
font-size:14px;
line-height:1.45;
word-break:break-word;
}

.input-area{
padding:12px;
display:flex;
background:white;
border-top:1px solid #eee;
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
width:40px;
height:40px;
border-radius:50%;
border:none;
display:flex;
align-items:center;
justify-content:center;
cursor:pointer;
opacity:.7;
}

.typing{
display:inline-flex;
gap:4px;
}

.typing span{
width:6px;
height:6px;
background:#999;
border-radius:50%;
animation:bounce 1.4s infinite ease-in-out both;
}

.typing span:nth-child(1){animation-delay:-0.32s;}
.typing span:nth-child(2){animation-delay:-0.16s;}

@keyframes bounce{
0%,80%,100%{transform:scale(0);}
40%{transform:scale(1);}
}
</style>
</head>

<body>

<div class="chat-container">
  <div class="header" id="header"></div>
  <div class="messages" id="messages"></div>
  <div class="input-area">
    <input id="input" placeholder="Message..." />
    <button class="send-btn" id="sendBtn">➤</button>
  </div>
</div>

<script>
(function(){

var params = new URLSearchParams(window.location.search);
var botId = params.get("botId");
var theme = params.get("theme") || "light";

if(!botId){
document.body.innerHTML = "Bot ID missing";
return;
}

var BASE_URL = "https://chatflowai.io/version-test/api/1.1/wf/";
var CONFIG_URL = BASE_URL + "get-chatbot?chatID=" + botId;
var MESSAGE_URL = BASE_URL + "create-chat";

var header = document.getElementById("header");
var messages = document.getElementById("messages");
var input = document.getElementById("input");
var sendBtn = document.getElementById("sendBtn");

var sessionId = "s_" + Date.now();

var primaryColor = "#2563eb";

fetch(CONFIG_URL)
.then(r=>r.json())
.then(function(json){

var config = json.response || {};
primaryColor = config.primaryColor || primaryColor;

header.textContent = config.name || "Chat Assistant";
header.style.background = primaryColor;

if(config.welcomeMessage){
appendMessage(config.welcomeMessage,"bot");
}

});

function appendMessage(text,role){
var msg=document.createElement("div");
msg.className="message "+role;

var bubble=document.createElement("div");
bubble.className="bubble-msg";
bubble.textContent=text;

if(role==="user"){
bubble.style.background=primaryColor;
bubble.style.color="white";
bubble.style.borderBottomRightRadius="6px";
}else{
bubble.style.background="white";
bubble.style.color="#111";
bubble.style.borderBottomLeftRadius="6px";
}

msg.appendChild(bubble);
messages.appendChild(msg);
messages.scrollTop=messages.scrollHeight;

return bubble;
}

function sendMessage(){

var text=input.value.trim();
if(!text)return;

appendMessage(text,"user");
input.value="";

var botBubble=appendMessage("","bot");
botBubble.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';

fetch(MESSAGE_URL,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
botId:botId,
message:text,
sessionId:sessionId
})
})
.then(r=>r.json())
.then(function(data){

var reply=data.text || (data.response && data.response.text) || "No response.";
botBubble.textContent=reply;
messages.scrollTop=messages.scrollHeight;

})
.catch(function(){
botBubble.textContent="Server error.";
});

}

sendBtn.onclick=sendMessage;
input.addEventListener("keydown",function(e){
if(e.key==="Enter" && !e.shiftKey){
e.preventDefault();
sendMessage();
}
});

})();
</script>

</body>
</html>
