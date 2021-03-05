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

const MILLISECONDS_IN_AN_HOUR = 1000 * 60;
var retJson;

const callDevtoAndRS = () => {
  request(options, function(err, res, body) {
    console.log("pre-dev.to");
    retJson = JSON.parse(body);

    console.log("post-dev.to: " + retJson.length + " rows");
    if(retJson != null) {
      retJson.forEach(function(row) {
        let pageViewsCount = row["page_views_count"];
        let positiveReactionsCount = row["positive_reactions_count"];
        let publicReactionsCount = row["public_reactions_count"];
        let commentsCount = row["comments_count"];

        // If the post was published in the last hour, send the post info to the devtoPosts table
        let publishedAt = new Date(row["published_at"]);
        if((Date.now() - publishedAt) <= MILLISECONDS_IN_AN_HOUR) {
          console.log("pre-RS post send");

          delete row["page_views_count"];
          delete row["positive_reactions_count"];
          delete row["public_reactions_count"];
          delete row["comments_count"];

          client.track({
            userId: 'devtoFunction',
            event: 'devtoPosts',
            properties: row
          });

          console.log("post-RS post send");
        }

        // Send the post metrics to the devtoPostMetrics table
        client.track({
          userId: 'devtoFunction',
          event: 'devtoPostMetrics',
          properties: {
            id: row["id"],
            url: row["url"],
            page_views_count: pageViewsCount,
            positive_reactions_count: positiveReactionsCount,
            public_reactions_count: publicReactionsCount,
            comments_count: commentsCount
          }
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
exports.devtoPull = (event, context) => {
  callDevtoAndRS();
};
