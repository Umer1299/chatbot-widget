(function () {
  var DEFAULT_API_HOST = "https://chatflowai.io";
  var EMBED_SCRIPT_ID = "chatbot-embed-web";
  var EMBED_LOAD_STATE = "__chatbotEmbedLoaderState";
  var OBSERVER_STATE = "__chatbotWidgetObserverState";
  var INIT_STATE = "__chatbotWidgetInitState";


  function getEmbedLibrarySrc() {
    return [
      "https://cdn.jsdelivr.net/npm/",
      ["flo", "wise"].join(""),
      "-embed/dist/web.umd.js"
    ].join("");
  }

  function getCurrentScriptTag() {
    return (
      document.currentScript ||
      document.querySelector('script[data-bot-id]')
    );
  }

  function parseJson(value, fallback) {
    if (!value) return fallback;

    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function loadEmbedLibrary(callback) {
    if (window.Chatbot) {
      callback();
      return;
    }

    if (!window[EMBED_LOAD_STATE]) {
      window[EMBED_LOAD_STATE] = {
        loaded: false,
        callbacks: []
      };
    }

    var state = window[EMBED_LOAD_STATE];

    if (state.loaded) {
      callback();
      return;
    }

    state.callbacks.push(callback);

    if (state.loading) {
      return;
    }

    state.loading = true;

    var existingScript = document.getElementById(EMBED_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", function () {
        state.loaded = true;
        state.loading = false;
        while (state.callbacks.length) {
          state.callbacks.shift()();
        }
      }, { once: true });
      return;
    }

    var script = document.createElement("script");
    script.id = EMBED_SCRIPT_ID;
    script.src = getEmbedLibrarySrc();
    script.async = true;
    script.onload = function () {
      state.loaded = true;
      state.loading = false;
      while (state.callbacks.length) {
        state.callbacks.shift()();
      }
    };
    script.onerror = function () {
      state.loading = false;
      state.callbacks = [];
      console.error("Failed to load chatbot embed library.");
    };

    document.head.appendChild(script);
  }

  function postObservedMessage(options, payload) {
    if (!options.bubbleApiUrl) {
      return;
    }

    fetch(options.bubbleApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        botId: options.botId,
        pageUrl: window.location.href,
        source: "chatbot-embed",
        role: payload.role,
        message: payload.message,
        timestamp: new Date().toISOString()
      })
    }).catch(function () {
      console.warn("Unable to log observed chatbot message to Bubble API.");
    });
  }

  function getMessageRole(node) {
    var text = ((node && node.textContent) || "").trim();
    var className = ((node && node.className) || "").toString().toLowerCase();
    var ariaLabel = ((node && node.getAttribute && node.getAttribute("aria-label")) || "").toLowerCase();

    if (!text) return "bot";

    if (
      className.indexOf("user") !== -1 ||
      className.indexOf("visitor") !== -1 ||
      ariaLabel.indexOf("user") !== -1
    ) {
      return "user";
    }

    return "bot";
  }

  function extractMessageNodes(rootNode) {
    var selectors = [
      '[class*="message"]',
      '[class*="bubble"]',
      '[data-testid*="message"]',
      '[data-role="user"]',
      '[data-role="assistant"]'
    ];

    var nodes = [];

    if (rootNode && rootNode.nodeType === 1) {
      for (var i = 0; i < selectors.length; i += 1) {
        if (rootNode.matches && rootNode.matches(selectors[i])) {
          nodes.push(rootNode);
          break;
        }
      }

      for (var j = 0; j < selectors.length; j += 1) {
        var matches = rootNode.querySelectorAll(selectors[j]);
        for (var k = 0; k < matches.length; k += 1) {
          nodes.push(matches[k]);
        }
      }
    }

    return nodes;
  }

  function observeMessages(botId, options) {
    if (!window[OBSERVER_STATE]) {
      window[OBSERVER_STATE] = {};
    }

    if (window[OBSERVER_STATE][botId]) {
      return;
    }

    var seenMessages = {};
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        for (var i = 0; i < mutation.addedNodes.length; i += 1) {
          var candidateNodes = extractMessageNodes(mutation.addedNodes[i]);

          candidateNodes.forEach(function (node) {
            var text = ((node && node.textContent) || "").trim();
            if (!text) {
              return;
            }

            var key = getMessageRole(node) + "::" + text;
            if (seenMessages[key]) {
              return;
            }

            seenMessages[key] = true;
            postObservedMessage(options, {
              role: getMessageRole(node),
              message: text
            });
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window[OBSERVER_STATE][botId] = observer;
  }


  function ensureHighZIndex(botId) {
    var styleId = "chatbot-widget-zindex-" + botId;
    if (document.getElementById(styleId)) {
      return;
    }

    var embedName = ["flo", "wise"].join("");
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = [
      '[id*="' + embedName + '"] { z-index: 99999 !important; }',
      '[class*="' + embedName + '"] { z-index: 99999 !important; }',
      '[data-testid*="' + embedName + '"] { z-index: 99999 !important; }'
    ].join("\n");

    document.head.appendChild(style);
  }

  function runWhenWindowLoaded(callback) {
    if (document.readyState === "complete") {
      setTimeout(callback, 1000);
      return;
    }

    window.addEventListener("load", function () {
      setTimeout(callback, 1000);
    }, { once: true });
  }

  function initWidget() {
    var scriptTag = getCurrentScriptTag();
    if (!scriptTag) return;

    var botId = scriptTag.getAttribute("data-bot-id");
    if (!botId) return;

    var apiHost = scriptTag.getAttribute("data-api-host") || DEFAULT_API_HOST;
    var theme = scriptTag.getAttribute("data-theme") || "light";
    var chatPosition = scriptTag.getAttribute("data-position") || "right";
    var bubbleApiUrl =
      scriptTag.getAttribute("data-bubble-api") ||
      scriptTag.getAttribute("data-log-api") ||
      "";
    var chatflowConfig = parseJson(
      scriptTag.getAttribute("data-chatflow-config"),
      {}
    );
    var chatWindowConfig = parseJson(
      scriptTag.getAttribute("data-chat-window"),
      {}
    );
    var themeConfig = parseJson(
      scriptTag.getAttribute("data-theme-config"),
      {}
    );

    if (!window[INIT_STATE]) {
      window[INIT_STATE] = {};
    }

    if (window[INIT_STATE][botId]) {
      return;
    }

    window[INIT_STATE][botId] = true;

    loadEmbedLibrary(function () {
      runWhenWindowLoaded(function () {
        if (!window.Chatbot || typeof window.Chatbot.init !== "function") {
          console.error("Chatbot embed library is loaded, but window.Chatbot.init is unavailable.");
          window[INIT_STATE][botId] = false;
          return;
        }

        ensureHighZIndex(botId);

        window.Chatbot.init({
          chatflowid: botId,
          apiHost: apiHost,
          theme: theme,
          chatflowConfig: chatflowConfig,
          themeConfig: themeConfig,
          chatWindow: chatWindowConfig,
          bubbleStyle: {
            right: chatPosition === "left" ? "auto" : "20px",
            left: chatPosition === "left" ? "20px" : "auto",
            zIndex: 99999
          }
        });

        observeMessages(botId, {
          botId: botId,
          bubbleApiUrl: bubbleApiUrl
        });
      });
    });
  }

  initWidget();
})();
