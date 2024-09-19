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

  // Handle messages received from clients (React Native app)
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
    // Handle incoming messages (you can expand this as needed)
  });

  // Send a welcome message when a client connects
  ws.send("Welcome to the WebSocket server!");
});

server.listen(app.get("port"), function () {
  console.log("Express server listening on port " + app.get("port"));
});
