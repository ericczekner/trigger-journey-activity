"use strict";
const axios = require("axios");
const util = require("util");
const { Client } = require("pg");

// Global Variables
const tokenURL = `${process.env.authenticationUrl}/v2/token`;

/*
 * POST Handlers for various routes
 */
exports.edit = function (req, res) {
  res.status(200).send("Edit");
};

exports.save = async function (req, res) {
  try {
    const payload = req.body;
    await saveToDatabase(payload);
    res.status(200).send("Save");
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).send("Error saving data");
  }
};

exports.execute = async function (req, res) {
  try {
    const inArguments = req.body.inArguments[0];
    const contactKey = inArguments.contactKey;
    const assetId = inArguments.selectedAssetId;
    const data = inArguments.payload;
    const uuid = inArguments.uuid;

    console.log("These are the inArguements: " + JSON.stringify(inArguments));
    const token = await retrieveToken();
    const response = await renderAsset(assetId, contactKey, data);
    res.status(200).send("Execute");
    console.log("Asset rendered successfully:", response);
  } catch (err) {
    console.error("Error rendering asset: ", err);
    res.status(500).send("Error rendering asset");
  }
};

exports.publish = function (req, res) {
  res.status(200).send("Publish");
};

exports.validate = function (req, res) {
  res.status(200).send("Validate");
};

exports.stop = function (req, res) {
  res.status(200).send("Stop");
};

/*
 * Function to retrieve an access token
 */
async function retrieveToken() {
  try {
    const response = await axios.post(tokenURL, {
      grant_type: "client_credentials",
      client_id: process.env.clientId,
      client_secret: process.env.clientSecret,
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Error retrieving token:", error);
    throw error;
  }
}

/*Function to render an asset via a cloudpage code resource*/
async function renderAsset(assetId, contactKey, data) {
  console.log(assetId, contactKey, data);
  const token = await retrieveToken();

  const payload = {
    ContactKey: contactKey,
    assetId: assetId,
    Data: data,
  };
  console.log("Rendering asset with payload:", payload);
  const resp = await axios.post(
    "https://mcbf8s0h5zzztdqn8-zf3kc5pvb4.pub.sfmc-content.com/ns3jakmlwws",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("Response from asset render:", resp.data);

  return resp.data;
}

/*
 * GET Handler for /journeys route
 */
exports.getJourneys = async function (req, res) {
  console.log("Getting journeys");
  try {
    const token = await retrieveToken();
    const journeys = await fetchJourneys(token);
    res.status(200).json(journeys);
  } catch (error) {
    console.error("Error retrieving journeys:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/*
 * Function to retrieve journeys
 */
async function fetchJourneys(token) {
  console.log("Fetching journeys");
  const journeysUrl = `${process.env.restBaseURL}/interaction/v1/interactions/`;

  try {
    const response = await axios.get(journeysUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(response.data.items.map((journey) => journey.defaults));
    return response.data;
  } catch (error) {
    console.error("Error fetching journeys:", error);
    throw error;
  }
}

/*Handler for the /assets route*/
exports.getAssets = async function (req, res) {
  console.log("Getting assets");
  try {
    const token = await retrieveToken();
    const assets = await fetchAssets(token);

    res.status(200).json(assets);
  } catch (error) {
    console.error("Error retrieving assets:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

async function fetchAssets(token) {
  console.log("Fetching assets");
  const assetsUrl = `${process.env.restBaseURL}/asset/v1/content/assets/query`;

  try {
    const response = await axios.post(
      assetsUrl,
      {
        query: {
          property: "assetType.name",
          simpleOperator: "equals",
          value: "freeformblock",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching assets:", error);
    throw error;
  }
}

/*
 * Handler to get activity data by UUID
 */
exports.getActivityByUUID = async function (req, res) {
  const uuid = req.params.uuid;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  const query = "SELECT * FROM activity_data WHERE uuid = $1";
  const values = [uuid];

  try {
    const result = await client.query(query, values);
    if (result.rows.length > 0) {
      res.json(result.rows); // Return all matching rows
    } else {
      res.status(404).send("Activity not found");
    }
  } catch (err) {
    console.error("Error retrieving activity data from database:", err.stack);
    res.status(500).send("Internal Server Error");
  } finally {
    await client.end();
  }
};

/*
 * Function to save data to the database
 */
async function saveToDatabase(data) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  // Ensure the table exists
  await client.query(`
        CREATE TABLE IF NOT EXISTS activity_data (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) NOT NULL,
            contact_key VARCHAR(255) NOT NULL,
            trigger_date TIMESTAMP NOT NULL,
            status VARCHAR(50) NOT NULL,
            error_log TEXT
        )
    `);

  const query =
    "INSERT INTO activity_data(uuid, contact_key, trigger_date, status, error_log) VALUES($1, $2, $3, $4, $5)";
  const values = [
    data.uuid,
    data.contactKey,
    data.triggerDate,
    data.status,
    data.errorLog,
  ];

  try {
    await client.query(query, values);
  } catch (err) {
    console.error("Error saving data to database:", err.stack);
  } finally {
    await client.end();
  }
}
