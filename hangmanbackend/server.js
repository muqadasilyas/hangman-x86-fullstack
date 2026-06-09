const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const BRIDGE_PATH = path.join(__dirname, "bridge.exe");

function runBridge(args, res) {
  execFile(BRIDGE_PATH, args, (err, stdout, stderr) => {
    if (err) {
      console.error("Bridge error:", err.message);
      return res.status(500).json({ error: "Engine execution failed" });
    }

    if (stderr) console.error("stderr:", stderr);

    const output = stdout.toString().trim();

    try {
      const data = JSON.parse(output);
      return res.json(data);
    } catch {
      console.error("Bad JSON:", output);
      return res.status(500).json({
        error: "Invalid engine response",
        raw: output,
      });
    }
  });
}

// START GAME
// Query params: ?theme=1&level=1
// theme: 1=technology, 2=business, 3=programming, 4=networking, 5=electronics, 6=software
// level: 1-5
app.get("/api/start", (req, res) => {
  const theme = req.query.theme ? String(parseInt(req.query.theme)) : "1";
  const level = req.query.level ? String(parseInt(req.query.level)) : "1";
  runBridge(["start", theme, level], res);
});

// GUESS
app.post("/api/guess", (req, res) => {
  let { letter } = req.body;

  if (!letter || typeof letter !== "string") {
    return res.status(400).json({ error: "Invalid letter" });
  }

  letter = letter.toLowerCase().trim().slice(0, 1);

  runBridge(["guess", letter], res);
});

// HINT
app.get("/api/hint", (req, res) => {
  runBridge(["hint"], res);
});

// STATE
app.get("/api/state", (req, res) => {
  runBridge(["state"], res);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});