const axios = require('axios');
const puppeteer = require("puppeteer-extra");
const stealth = require('puppeteer-extra-plugin-stealth');
const { inspect } = require('util');

puppeteer.use(stealth());

module.exports = function (RED) {
    function ProfileManager(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const API_BASE_URL = 'http://127.0.0.1:19995/api/v3';

        const nodeConfig = {
            timeout: config.timeout || 30000,
            slowMo: config.slowMo || 0,
            headless: config.headless === 'true',
            debugport: config.debugport || 0,
            devtools: config.devtools === 'true',
            cookies: config.cookies || '',
            executablePath: config.executablePath || '',
            defaultViewport: null,
            ignoreHTTPSErrors: true
        };

        async function getProfiles() {
            try {
                const response = await axios.get(`${API_BASE_URL}/profiles`);
                node.log("Profiles fetched: " + JSON.stringify(response.data));
                if (response.data.success && Array.isArray(response.data.data)) {
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
                node.log("Started profile: " + inspect(response.data.data, { depth: null })); 
                return response.data.data;
            } catch (error) {
                node.error("Error starting profile: " + error.message);
                throw error;
            }
        }

        this.on("input", async function (msg, send, done) {
            try {
                node.status({ fill: "blue", shape: "dot", text: "Launching..." });

                const profiles = await getProfiles();
                node.log("Profiles received: " + JSON.stringify(profiles));
                
                if (profiles.length === 0) {
                    throw new Error('No profiles available');
                }
                const selectedProfile = profiles[0]; // You might want to implement a selection logic here
                node.log("Selected profile: " + JSON.stringify(selectedProfile));
        
                const startedProfile = await startProfile(selectedProfile.id);
                node.log("Profile ON: " + JSON.stringify(startedProfile));

                const port = startedProfile.remote_debugging_address.split(':')[1];
                node.log("Extracted Port: " + port);

                if (!startedProfile || !startedProfile.remote_debugging_address) {
                    throw new Error('Failed to start profile or no port provided');
                }

                nodeConfig.debugport = parseInt(port);
                nodeConfig.executablePath = startedProfile.browser_path || nodeConfig.executablePath;

                if (nodeConfig.debugport !== 0) {
                    try {
                        msg.puppeteer = {
                            browser: await puppeteer.connect({
                                browserURL: `http://127.0.0.1:${nodeConfig.debugport}`,
                                defaultViewport: nodeConfig.defaultViewport
                            }),
                        };
                        node.status({
                            fill: "green",
                            shape: "dot",
                            text: "Attached to existing browser",
                        });
                    } catch (e) {
                        node.status({
                            fill: "gray",
                            shape: "dot",
                            text: "No existing browser detected, launching new one...",
                        });
                        msg.puppeteer = {
                            browser: await puppeteer.launch({
                                ...nodeConfig,
                                args: [`--remote-debugging-port=${nodeConfig.debugport}`],
                            }),
                        };
                        node.status({ fill: "green", shape: "dot", text: "Launched" });
                    }
                }

                if (msg.puppeteer === undefined) {
                    msg.puppeteer = {
                        browser: await puppeteer.launch({
                            ...nodeConfig,
                            args: [`--remote-debugging-port=${nodeConfig.debugport}`],
                        }),
                    };
                    node.status({ fill: "green", shape: "dot", text: "Launched" });
                }

                msg.puppeteer.page = (await msg.puppeteer.browser.pages())[0];
                msg.puppeteer.page.setDefaultTimeout(nodeConfig.timeout);

                let cookies = nodeConfig.cookies !== '' ? nodeConfig.cookies : JSON.stringify(msg.payload);
                try {
                    cookies = JSON.parse(cookies);
                } catch (e) {
                    cookies = [];
                }

                try {
                    for (const cookie of cookies) {
                        await msg.puppeteer.page.setCookie(cookie);
                    }
                } catch (e) {
                    node.status({ fill: "yellow", shape: "dot", text: e });
                }

                send(msg);
            } catch (e) {
                node.error(e);
                node.status({ fill: "red", shape: "dot", text: e });
                msg.error = e;
                send(msg);
            }

            setTimeout(() => {
                done();
                node.status({});
            }, (msg.error) ? 10000 : 3000);
        });

        this.on("close", function () {
            node.status({});
        });
    }

    RED.nodes.registerType("profile-manager", ProfileManager, {
        defaults: {
            timeout: { value: 30000 },
            slowMo: { value: 0 },
            headless: { value: "false" },
            debugport: { value: 0 },
            devtools: { value: "false" },
            cookies: { value: "" },
            name: { value: "" },
            executablePath: { value: "" }
        }
    });
};