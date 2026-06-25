/**
 * The actual server lives in the lyra-server package, installed system-wide
 * and exposed via `lyra` CLI. This module only:
 *   - checks whether the daemon is running (socket file present + connectable)
 *   - spawns `lyra serve --daemon` if it's not
 *   - sends queries to the daemon over its Unix socket
 *
 * Protocol (mirrors lyra/cli/client.py):
 *   request:  JSON {"query": "<text>"} written once, then half-close (FIN)
 *   response: plain text, read until EOF
 *
 * NOTE: the daemon socket handler (_handle_socket_client in lyra/cli/daemon.py)
 * does not accept session_id yet, only {query}. Until that's added on the
 * server side, every query is stateless from the daemon's perspective.
 */

const net = require("net");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const RUNTIME_DIR = path.join(os.homedir(), ".local", "share", "lyra");
const SOCKET_PATH = path.join(RUNTIME_DIR, "lyra.sock");

const CONNECT_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 300;
const QUERY_TIMEOUT_MS = 60_000;

let _sessionId = null;

/**
 * Tries a single connection to the daemon socket.
 * Resolves true if connect succeeds, false otherwise (refused/missing/etc).
 */
function _probeSocket() {
  return new Promise((resolve) => {
    if (!fs.existsSync(SOCKET_PATH)) {
      resolve(false);
      return;
    }
    const sock = net.createConnection(SOCKET_PATH);
    sock.once("connect", () => {
      sock.end();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
  });
}

/**
 * Returns true if the daemon is currently reachable.
 */
async function isDaemonRunning() {
  return _probeSocket();
}

/**
 * Spawns `lyra serve --daemon` as a detached background process.
 * Assumes the `lyra` CLI is on PATH (installed via the system package).
 */
function startDaemon() {
  const proc = spawn("lyra", ["serve", "--daemon"], {
    stdio: "ignore",
    detached: true,
  });
  proc.unref();
}

/**
 * Polls the socket until it's connectable or the timeout elapses.
 * Returns true if the daemon became reachable in time, false on timeout.
 */
function waitForDaemon(timeoutMs = CONNECT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const tick = async () => {
      if (await _probeSocket()) {
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
  });
}

/**
 * Ensures the daemon is running, starting it if needed.
 * Throws if it doesn't come up within the timeout, so callers can
 * surface a retryable error to the UI.
 */
async function ensureDaemonRunning() {
  const running = await isDaemonRunning();

  if (running) return;

  startDaemon();
  const ok = await waitForDaemon();
  if (!ok) {
    throw new Error("DAEMON_START_TIMEOUT");
  }
}

/**
 * Sends a query to the daemon and resolves with its plain-text response.
 * Does NOT start the daemon itself — call ensureDaemonRunning() first.
 */
function sendQuery(text) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(SOCKET_PATH);
    const chunks = [];
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      reject(err);
    };

    const timer = setTimeout(() => fail(new Error("QUERY_TIMEOUT")), QUERY_TIMEOUT_MS);

    sock.once("connect", () => {
      const payload = JSON.stringify({ query: text, session_id: _sessionId });
      sock.end(payload);
    });

    sock.on("data", (chunk) => chunks.push(chunk));
    sock.once("error", (err) => { clearTimeout(timer); fail(err); });

    sock.once("close", () => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) { reject(new Error("DAEMON_CRASHED")); return; }

      try {
        const parsed = JSON.parse(raw);
        if (parsed.session_id) _sessionId = parsed.session_id;
        resolve(parsed.response);
      } catch {
        resolve(raw);
      }
    });
  });
}


// When an user add a new chat resets
function resetSession() {
  _sessionId = null;
}


/**
 * High-level entry point used by the IPC handler: makes sure the daemon
 * is up, then sends the query.
 */
async function query(text) {
  await ensureDaemonRunning();
  try {
    return await sendQuery(text);
  } catch (err) {
    if (err.message === "DAEMON_CRASHED") {
      // Daemon died while doing query. wait and retry
      await waitForDaemon();
      return sendQuery(text);
    }
    throw err;
  }
}

module.exports = {
  SOCKET_PATH,
  isDaemonRunning,
  ensureDaemonRunning,
  waitForDaemon,
  resetSession,
  startDaemon,
  sendQuery,
  query,
};
