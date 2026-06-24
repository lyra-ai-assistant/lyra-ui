import {
  saveItemToStorage,
  saveArrayToStorage,
  getItemFromStorage,
} from "../utils/storageHandler.js";

const promptChat = document.querySelector("#promptChat");
const messageBox = document.querySelector("#messageBox");
const activeChat = document.querySelector("#activeChat");
const app = document.querySelector("#app");

const trimBr = (htmlContent) => {
  const tmpDiv = document.createElement("div");
  tmpDiv.innerHTML = htmlContent;
  while (tmpDiv.firstChild && tmpDiv.firstChild.nodeName === "BR") {
    tmpDiv.removeChild(tmpDiv.firstChild);
  }
  while (tmpDiv.lastChild && tmpDiv.lastChild.nodeName === "BR") {
    tmpDiv.removeChild(tmpDiv.lastChild);
  }
  return tmpDiv.innerHTML;
};

const createMessage = (content, messageType) => {
  const messageContainer = document.createElement("article");
  const message = document.createElement("p");
  message.classList.add(`${messageType}-message-content`);
  message.innerHTML = content;

  if (messageType === "lyra") {
    message.querySelectorAll("pre").forEach((pre) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;";

      const btn = document.createElement("button");
      btn.textContent = "Copiar";
      btn.classList.add("copy-btn");

      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.innerText ?? pre.innerText;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "✓ Copiado";
          setTimeout(() => (btn.textContent = "Copiar"), 2000);
        });
      });

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.classList.add("pre-wrapper");
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });
  }

  messageContainer.classList.add(`${messageType}-message`);
  messageContainer.append(message);
  return messageContainer;
};

const askLyra = async (entry) => {
  try {
    const response = await window.electron.sendQuery(entry);
    return response;
  } catch (error) {
    console.error("Error sending query to Lyra daemon: ", error);
    return "Sorry, I couldn't reach the Lyra daemon. Please try again.";
  }
};

export const handlePrompt = async () => {
  app.classList.add("moveUpFadeOut");
  app.classList.add("none");
  activeChat.classList = "active-chat";
  messageBox.classList.remove("none");

  const currentChat = getItemFromStorage("currentChat");
  const chats = getItemFromStorage("chats");
  const rawContent = trimBr(promptChat.innerHTML);

  saveArrayToStorage("chats", currentChat, { type: "user", data: rawContent });
  messageBox.append(createMessage(rawContent, "user"));
  messageBox.scrollTop = messageBox.scrollHeight;
  promptChat.replaceChildren();

  const lyrasAnswer = await askLyra(rawContent);
  saveArrayToStorage("chats", currentChat, { type: "lyra", data: lyrasAnswer });
  messageBox.append(createMessage(lyrasAnswer, "lyra"));
  messageBox.scrollTop = messageBox.scrollHeight;
  promptChat.replaceChildren();
};

export { trimBr, createMessage };
