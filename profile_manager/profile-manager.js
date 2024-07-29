const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { inspect } = require('util');

puppeteer.use(StealthPlugin());

module.exports = function(RED) {
    function ProfileManager(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const API_BASE_URL = 'http://127.0.0.1:19995/api/v3';

        // Merge default config with user-provided config
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
                return response.data.data; // Json response
            } catch (error) {
                node.error("Error starting profile: " + error.message);
                throw error;
            }
        }

        async function launchBrowser(profileConfig) {
            try {
                const port = profileConfig.debug_port;
                const browserURL = `http://127.0.0.1:${port}`;
                node.log("Attempting to connect to browser at: " + browserURL);

                const launchOptions = {
                    ...nodeConfig,
                    ...profileConfig,
                    args: [`--remote-debugging-port=${port}`]
                };

                let browser;
                try {
                    // First, try to connect to an existing browser
                    browser = await puppeteer.connect({
                        browserURL: browserURL,
                        defaultViewport: nodeConfig.defaultViewport
                    });
                    node.status({fill: "green", shape: "dot", text: "Attached to existing browser"});
                } catch (connectError) {
                    // If connecting fails, launch a new browser
                    node.log("No existing browser found. Launching new browser.");
                    browser = await puppeteer.launch(launchOptions);
                    node.status({fill: "green", shape: "dot", text: "Launched new browser"});
                }

                return browser;
            } catch (error) {
                node.error("Error launching browser: " + error.message);
                throw error;
            }
        }

        node.on('input', async function(msg) {
            try {
                node.status({fill:"blue", shape:"dot", text:"Launching..."});

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

                // Merge profile-specific config with node config
                const profileConfig = {
                    executablePath: startedProfile.browser_path || nodeConfig.executablePath,
                    debug_port: parseInt(port),
                    // Add any other profile-specific configurations here
                };
                node.log("Config profile: " + JSON.stringify(profileConfig));

                const browser = await launchBrowser(profileConfig);
                const page = (await browser.pages())[0];
                page.setDefaultTimeout(nodeConfig.timeout);

                // Handle cookies
                let cookies = nodeConfig.cookies !== '' ? nodeConfig.cookies : JSON.stringify(msg.payload);
                try {
                    cookies = JSON.parse(cookies);
                } catch (e) {
                    cookies = [];
                }

                // Set cookies
                for (const cookie of cookies) {
                    await page.setCookie(cookie);
                }

                msg.puppeteer = {
                    browser: browser,
                    page: page
                };

                node.send(msg);
            } catch (error) {
                node.error("Error in profile-manager: " + error.message);
                msg.payload = { error: error.message };
                node.status({fill:"red", shape:"dot", text:"Error: " + error.message});
                node.send(msg);
            }

            // Clear status of the node after a delay
            setTimeout(() => {
                node.status({});
            }, msg.error ? 10000 : 3000);
        });

        node.on('close', function() {
            // Clean up resources if necessary
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
}