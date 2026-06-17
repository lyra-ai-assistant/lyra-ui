/**
 * Small corner toast reflecting the daemon connection lifecycle.
 * States pushed from main.js via window.electron.onDaemonStatus:
 *   "connecting" -> shown, spinner
 *   "ready"      -> briefly shown as success, then auto-hides
 *   "error"      -> shown, stays, with a Retry button
 */

let toastEl;
let retryButtonEl;
let hideTimer;

function buildToast() {
  const toast = document.createElement("div");
  toast.id = "daemonToast";
  toast.className = "daemon-toast none";

  const message = document.createElement("p");
  message.className = "daemon-toast-message";
  message.id = "daemonToastMessage";

  const retryButton = document.createElement("button");
  retryButton.className = "daemon-toast-retry none";
  retryButton.id = "daemonToastRetry";
  retryButton.type = "button";
  retryButton.innerText = "Retry";

  toast.append(message, retryButton);
  document.body.append(toast);

  return { toast, message, retryButton };
}

function show(stateClass, text, { withRetry = false } = {}) {
  clearTimeout(hideTimer);
  toastEl.classList.remove("none", "daemon-toast-connecting", "daemon-toast-ready", "daemon-toast-error");
  toastEl.classList.add(stateClass);
  toastEl.querySelector("#daemonToastMessage").innerText = text;
  retryButtonEl.classList.toggle("none", !withRetry);
}

function hide() {
  toastEl.classList.add("none");
}

export const initDaemonStatusToast = () => {
  const built = buildToast();
  toastEl = built.toast;
  retryButtonEl = built.retryButton;

  retryButtonEl.addEventListener("click", async () => {
    retryButtonEl.disabled = true;
    await window.electron.retryDaemon();
    retryButtonEl.disabled = false;
  });

  window.electron.onDaemonStatus(({ status }) => {
    if (status === "connecting") {
      show("daemon-toast-connecting", "Connecting to Lyra...");
    } else if (status === "ready") {
      show("daemon-toast-ready", "Lyra is ready");
      hideTimer = setTimeout(hide, 2000);
    } else if (status === "error") {
      show("daemon-toast-error", "Couldn't start Lyra", { withRetry: true });
    }
  });
};
