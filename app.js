"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const errorhandler = require("errorhandler");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const routes = require("./routes");
const activity = require("./routes/activity");

// EXPRESS CONFIGURATION
const app = express();

// Configure Express
app.set("port", process.env.PORT || 3001);
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Express in Development Mode
if ("development" === app.get("env")) {
  app.use(errorhandler());
}

app.get("/", routes.index);
app.post("/login", routes.login);
app.post("/logout", routes.logout);

// Custom Routes for MC
app.post("/journeybuilder/save/", activity.save);
app.post("/journeybuilder/validate/", activity.validate);
app.post("/journeybuilder/publish/", activity.publish);
app.post("/journeybuilder/execute/", (req, res) =>
  activity.execute(req, res, wss)
);

// New route to get journeys
app.get("/journeys", activity.getJourneys);

//Route to get assets
app.get("/assets", activity.getAssets);

app.get("/assetPreview", activity.renderContent);

// New route to get activity data by UUID
app.get("/activity/:uuid", activity.getActivityByUUID);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Set up WebSocket connection
wss.on("connection", function connection(ws) {
  console.log("New WebSocket connection established");

  // Send a welcome message when a client connects
  ws.send(JSON.stringify({ message: "Welcome to the WebSocket server!" }));

  // Keep the connection alive by sending a ping every 50 seconds
  const pingInterval = setInterval(() => {
    if (ws.readyState === 1) {
      // 1 corresponds to WebSocket.OPEN
      console.log("Sending ping to client to keep connection alive");
      ws.ping(); // Send a ping to keep the connection alive
    }
  }, 50000); // Ping every 50 seconds

  ws.on("pong", () => {
    console.log("Pong received from client");
  });

  // Clean up when the connection is closed
  ws.on("close", () => {
    console.log("WebSocket connection closed");
    clearInterval(pingInterval); // Stop pinging when the connection closes
  });

  // Handle any errors
  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    clearInterval(pingInterval); // Stop pinging if there's an error
  });
});

server.listen(app.get("port"), function () {
  console.log("Express server listening on port " + app.get("port"));
});
