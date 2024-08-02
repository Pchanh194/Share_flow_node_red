module.exports = function(RED) {
    function LLMNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {
            var apiKey = config.apiKey;
            var model = config.model;
            var outputFormat = config.outputFormat;

            // Get input value based on selector type
            let inputValue;
            if (config.inputType == "flow" || config.inputType == "global") {
                inputValue = this.context()[config.inputType].get(config.inputVariable);
            } else if (config.inputType == "str") {
                inputValue = config.inputVariable;
            } else {
                inputValue = RED.util.getMessageProperty(msg, config.inputVariable);
            }

            // Get prompt value based on selector type
            let prompt;
            if (config.promptType == "flow" || config.promptType == "global") {
                prompt = this.context()[config.promptType].get(config.prompt);
            } else if (config.promptType == "str") {
                prompt = config.prompt;
            } else {
                prompt = RED.util.getMessageProperty(msg, config.prompt);
            }

            // Replace variables in prompt if any
            var processedPrompt = prompt.replace(/\{\{(.*?)\}\}/g, function(match, p1) {
                return inputValue[p1] || match;
            });

            makeOpenAIAPICall(apiKey, model, processedPrompt)
                .then(response => {
                    switch(outputFormat) {
                        case 'text':
                            msg.payload = response;
                            break;
                        case 'markdown':
                            msg.payload = '```\n' + response + '\n```';
                            break;
                        case 'json':
                            msg.payload = JSON.stringify({ response: response });
                            break;
                    }
                    node.send(msg);
                })
                .catch(error => {
                    node.error("Error calling OpenAI API: " + error);
                    msg.payload = undefined;
                    msg.error = error;
                    node.send(msg);
                });
        });
    }

    function makeOpenAIAPICall(apiKey, model, prompt) {
        const axios = require('axios');
        return new Promise((resolve, reject) => {
            axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: [{ role: "user", content: prompt }]
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                resolve(response.data.choices[0].message.content);
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    RED.nodes.registerType("llm", LLMNode);
}