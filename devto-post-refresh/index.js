const request = require('request');

// dev.to API call info
const options = {
    url: 'https://dev.to/api/articles/me/published?per_page=1000',
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'api_key': process.env.DEVTO_API_KEY
    }
};

// RudderStack includes and info
const Analytics = require("@rudderstack/rudder-sdk-node");
const client = new Analytics(process.env.RS_WRITE_KEY, process.env.RS_DATA_PLANE_URL + "/v1/batch");

var retJson;

const callDevtoAndRS = () => {
  request(options, function(err, res, body) {
    console.log("pre-dev.to");
    retJson = JSON.parse(body);

    console.log("post-dev.to: " + retJson.length + " rows");
    if(retJson != null) {
      retJson.forEach(function(row) {
        // Send the post info to the devtoPosts table
        delete row["page_views_count"];
        delete row["positive_reactions_count"];
        delete row["public_reactions_count"];
        delete row["comments_count"];

        client.track({
          userId: 'devtoFunction',
          event: 'devtoPosts',
          properties: row
        });
      });
    }
    console.log("post-RS send");
  });
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.devtoPostRefresh = (event, context) => {
  callDevtoAndRS();
};
