const puppeteer = require("puppeteer-extra"); // TO-DO: Make this optional.
const stealth = require('puppeteer-extra-plugin-stealth');

const axios = require('axios');

module.exports = function (RED) {
  function PuppeteerBrowserLaunch(nodeConfig) {
    RED.nodes.createNode(this, nodeConfig);
    nodeConfig.defaultViewport = null; // Setting the node's default viewport
    nodeConfig.ignoreHTTPSErrors = true; // Setting the node's ignoreHttpsErrors property
    var node = this; // Referencing the current node
    puppeteer.use(stealth()); // TO-DO: Make optional. Use stealth.

    const API_BASE_URL = 'http://127.0.0.1:19995/api/v3';

    async function getProfiles(nameOrId) {
      try {
          const response = await axios.get(`${API_BASE_URL}/profiles`);
          node.log("Profiles fetched: " + JSON.stringify(response.data));
          if (response.data.success && Array.isArray(response.data.data)) {
              if (nameOrId) {
                  const matchedProfile = response.data.data.find(profile => 
                      profile.name.toLowerCase() === nameOrId.toLowerCase() || profile.id === nameOrId
                  );
                  return matchedProfile ? [matchedProfile] : [];
              }
              return response.data.data;
          } else {
              throw new Error('Invalid API response structure');
          }
      } catch (error) {
          node.error("Error fetching profiles: " + error.message);
          throw error;
      }
    }

    async function startProfile(profileId) {
        try {
            const response = await axios.post(`${API_BASE_URL}/profiles/start/${profileId}`);
            node.log("Started profile: " + response.data.data); 
            return response.data.data;
        } catch (error) {
            node.error("Error starting profile: " + error.message);
            throw error;
        }
    }

    this.on("input", async function (msg, send, done) {
      try {
        node.status({ fill: "blue", shape: "dot", text: "Launching..." });
        // If debugport is specified
        const nameOrId = nodeConfig.nameOrId ? nodeConfig.nameOrId.trim() : null;
        const profiles = await getProfiles(nameOrId);
        node.log("Profiles received: " + JSON.stringify(profiles));

        if (profiles.length === 0) {
            throw new Error('No matching profile found');
        }

        const selectedProfile = profiles[0]; 
        node.log("Selected profile: " + JSON.stringify(selectedProfile));

        const startedProfile = await startProfile(selectedProfile.id);
        node.log("Profile ON: " + JSON.stringify(startedProfile));

        const port = startedProfile.remote_debugging_address.split(':')[1];
        node.log("Extracted Port: " + port);

        if (!startedProfile || !startedProfile.remote_debugging_address) {
            throw new Error('Failed to start profile or no port provided');
        }

        // Lấy giá trị debug port từ config hoặc port phía trên
        let debugPort = msg.debugPort || nodeConfig.debugport || parseInt(port);

        if (debugPort) {
          try {
            // Trying to connect to already existing
            // browser with node's config
            msg.puppeteer = {
              browser: await puppeteer.connect({
                ...nodeConfig,
                browserURL: `http://127.0.0.1:${debugPort}`,
              }),
            };

            node.status({
              fill: "green",
              shape: "dot",
              text: "Attached to existing browser",
            });
          } catch (e) { // If there is no existing browser
            node.status({
              fill: "gray",
              shape: "dot",
              text: "No existing browser detected, launching new one...",
            });

            // Launch a new browser with node's config
            msg.puppeteer = {
              browser: await puppeteer.launch({
                ...nodeConfig,
                args: [`--remote-debugging-port=${debugPort}`],
              }),
            };
            // Browser launched sucessfully
            node.status({ fill: "green", shape: "dot", text: "Launched" });
          }
        }
        // If there is no existing browser
        // or rather the puppeteer message property is undefined
        if (msg.puppeteer == undefined) {
          // Launch a new browser with node's config
          msg.puppeteer = {
            browser: await puppeteer.launch({
              ...nodeConfig,
              args: [`--remote-debugging-port=${debugPort}`],
            }),
          };
          // Browser launched sucessfully
          node.status({ fill: "green", shape: "dot", text: "Launched" });
        }
        // Get the page and set it to the puppeteer property of msg
        msg.puppeteer.page = (await msg.puppeteer.browser.pages())[0];
        msg.puppeteer.page.setDefaultTimeout(nodeConfig.timeout);

        // Get the cookies from input
        let cookies =
          nodeConfig.cookies !== ""
            ? nodeConfig.cookies
            : JSON.stringify(msg.payload);
        // Parse the cookies
        try {
          cookies = JSON.parse(cookies);
        } catch (e) {
          cookies = [];
        }

        // If cookies are passed through on lauch, set them for the page object
        try {
          // Setting the cookies
          for (const cookie of cookies) {
            await msg.puppeteer.page.setCookie(cookie);
          }
        } catch (e) {
          node.status({ fill: "yellow", shape: "dot", text: e });
        }
        // Sending the msg
        send(msg);

      } catch (e) {
        // If an error occured
        node.error(e);
        // Update the status
        node.status({ fill: "red", shape: "dot", text: e });
        // And update the message error property
        msg.error = e;
        send(msg);
      }

      // Clear status of the node
      setTimeout(() => {
        done();
        node.status({});
      }, (msg.error) ? 10000 : 3000);
    });
    this.on("close", function () {
      node.status({});
    });
    oneditprepare: function oneditprepare() {
      $("#node-input-nameOrId").val(nodeConfig.nameOrId);
      $("#node-input-timeout").val(nodeConfig.timeout);
      $("#node-input-slowMo").val(nodeConfig.slowMo);
      $("#node-input-headless").val(nodeConfig.headless);
      $("#node-input-debugport").val(nodeConfig.debugport);
      $("#node-input-devtools").val(nodeConfig.devtools);
      $("#node-input-name").val(nodeConfig.name);
      $("#node-input-executablePath").val(nodeConfig.executablePath);
    }
  }
  RED.nodes.registerType("puppeteer-browser-launch", PuppeteerBrowserLaunch);
};