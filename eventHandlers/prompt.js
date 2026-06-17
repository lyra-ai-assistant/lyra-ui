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
  messageContainer.classList.add(`${messageType}-message`);
  messageContainer.append(message);
  return messageContainer;
};

/**
 * Sends the query to the daemon via IPC (main process owns the Unix socket).
 * Returns the plain-text response, or an inline error message on failure.
 */
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
