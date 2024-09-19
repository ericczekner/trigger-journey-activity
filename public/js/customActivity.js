define(["postmonger"], function (Postmonger) {
  "use strict";

  var connection = new Postmonger.Session();
  var payload = {};
  var schema = {};
  var journeys = [];
  var currentApiEventKey = null;
  var entrySourceData = [];
  var apiEventKeyMap = {}; // Map to store apiEventKey for each journey
  var uniqueId = null; // Declare the uniqueId variable

  $(window).ready(onRender);
  connection.on("initActivity", initialize);
  connection.on("clickedNext", save);

  function onRender() {
    connection.trigger("ready");
    connection.trigger("requestTokens");
    connection.trigger("requestEndpoints");
    //remove this before pushing to prod
    //initialize();
  }

  connection.trigger("requestTriggerEventDefinition");
  connection.on(
    "requestedTriggerEventDefinition",
    function (eventDefinitionModel) {
      if (eventDefinitionModel) {
        currentApiEventKey = eventDefinitionModel.eventDefinitionKey;
      }
    }
  );

  function initialize(data) {
    console.log("Initializing Journey Builder activity with data:", data);
    if (data) {
      payload = data;
    }

    // Check if the uuid already exists in the payload
    if (
      payload.arguments &&
      payload.arguments.execute &&
      payload.arguments.execute.inArguments
    ) {
      var inArguments = payload.arguments.execute.inArguments[0];
      if (inArguments.uuid) {
        uniqueId = inArguments.uuid;
      } else {
        uniqueId = UUIDjs.create().toString(); // Generate a new unique identifier
      }
    } else {
      uniqueId = UUIDjs.create().toString(); // Generate a new unique identifier
    }

    connection.trigger("requestSchema");
    connection.on("requestedSchema", function (data) {
      console.log(data);
      schema = data["schema"];
      entrySourceData = addEntrySourceAttributesToInArguments(schema);
    });

    var hasInArguments = Boolean(
      payload.arguments &&
        payload.arguments.execute &&
        payload.arguments.execute.inArguments &&
        payload.arguments.execute.inArguments.length > 0
    );

    var inArguments = hasInArguments
      ? payload.arguments.execute.inArguments
      : [];

    var selectedAssetiD = null;
    if (inArguments.length > 0) {
      selectedAssetiD = inArguments[0].selectedAssetId;
    }

    fetchAssets(selectedAssetiD);
  }

  function save() {
    // event.preventDefault();

    var selectedAssetId = $('input[name="asset"]:checked').val();
    var selectedAssetName = $('input[name="asset"]:checked')
      .closest("label")
      .text()
      .trim();

    payload.arguments.execute.inArguments = [
      {
        contactKey: "{{Contact.Key}}",
        selectedAssetId: selectedAssetId || null,
        selectedAssetName: selectedAssetName || "No asset selected",
        payload: entrySourceData,
        uuid: uniqueId, // Use the existing or new unique identifier
      },
    ];

    payload.metaData.isConfigured = true;
    connection.trigger("updateActivity", payload);
  }

  function addEntrySourceAttributesToInArguments(schema) {
    var data = {};
    for (var i = 0; i < schema.length; i++) {
      let attr = schema[i].key;
      let keyIndex = attr.lastIndexOf(".") + 1;
      data[attr.substring(keyIndex)] = `{{${attr}}}`;
    }
    return data;
  }

  /* Function to retrieve assets of the freeform content block type */
  function fetchAssets(selectedAssetId = null) {
    return $.ajax({
      url: "/assets",
      type: "GET",
      beforeSend: function () {
        $("#asset-loading-message").show();
        $("#asset-radios").hide();
      },
      success: function (response) {
        const assets = response.items;

        if (assets.length === 0) {
          $("#asset-loading-message").text(
            "No Free Form Content blocks were found. Create a free form content block to select it."
          );
        } else {
          populateAssets(assets, selectedAssetId);
          $("#asset-loading-message").hide();
          $("#asset-radios").show();
        }
        console.log(assets);
        return assets;
      },
      error: function (xhr, status, error) {
        console.error("Error fetching assets:", error);
        $("#asset-loading-message").text(
          "Error loading assets. Please try again."
        );
      },
    });
  }

  //Show the user the assets to choose from
  function populateAssets(assets, selectedAssetId = null) {
    var $radioGroup = $("#asset-radios");
    $radioGroup.empty();
    console.log("Selected Asset: " + selectedAssetId);
    assets.forEach(function (asset) {
      console.log(asset.customerKey);
      var $radio = $("<input>", {
        type: "radio",
        name: "asset",
        value: asset.customerKey,
        key: asset.customerKey,
      });

      console.log(
        "Comparing asset.id: " +
          asset.id +
          " with selectedAssetId: " +
          selectedAssetId
      );
      if (String(asset.id) === String(selectedAssetId)) {
        console.log(
          "Match found, setting radio as checked for asset.id: " + asset.id
        );
        $radio.prop("checked", true);
      }

      $radioGroup.append(
        $("<label>", {
          text: asset.name,
        }).prepend($radio)
      );
    });
  }
  window.save = save;
});
