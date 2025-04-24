const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const { commandHandler, interactivityHandler, messageHandler } = require("./handlers");
const { oauthCallbackHandler } = require("./calendar");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

if (!process.env.PORT) {
  console.error("⚠️  Missing .env file or PORT variable!");
  process.exit(1);
}

// Route handlers
app.post("/slack/commands", commandHandler);
app.post("/slack/interactivity", interactivityHandler);

// Google OAuth callback
app.get("/oauth2callback", oauthCallbackHandler);

// Verify Slack event subscription
app.post("/slack/events", (req, res) => {
  if (req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }
  
  // Handle message events
  if (req.body.event && req.body.event.type === 'message') {
    return messageHandler(req, res);
  }
  
  return res.status(200).send();
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("An error occurred:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
  console.log(`✅ AI Assistant enabled - users can now use natural language`);
});
