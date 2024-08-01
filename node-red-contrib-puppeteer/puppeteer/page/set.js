module.exports = function (RED) {
  function PuppeteerPageSetValue(config) {
    RED.nodes.createNode(this, config);
    var node = this; // Referencing the current node

    this.on("input", async function (msg, send, done) {
      try {
        // Parsing the selector from string input or from msg object
        let selector;

        if (config.selectortype == "flow" || config.selectortype == "global") {
          selector = this.context()[config.selectortype].get(config.selector);
        } else if (config.selectortype == "str") {
          selector = config.selector;
        } else {
          selector = eval(config.selectortype + "." + config.selector);
        }

        // Parsing the value from string input or from msg object
        let value;

        if (config.valuetype == "flow" || config.valuetype == "global") {
          value = this.context()[config.valuetype].get(config.value);
        } else if (config.valuetype == "str") {
          value = config.value;
        } else {
          value = eval(config.valuetype + "." + config.value);
        }

        // Waiting for selector
        node.status({
          fill: "blue",
          shape: "ring",
          text: `Wait for ${selector}`,
        });
        await msg.puppeteer.page.waitForSelector(selector);

        // Setting the value to the selector
        node.status({
          fill: "blue",
          shape: "dot",
          text: `Setting ${selector}:${value}`,
        });
        while (
          (await msg.puppeteer.page.$eval(selector, (el) => el.value)) != value
        ) {
          await msg.puppeteer.page.$eval(
            selector,
            (el, value) => (el.value = value),
            value
          );
        }
        node.status({
          fill: "green",
          shape: "dot",
          text: `${selector}:${value}`,
        });

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
      $("#node-input-name").val(this.name);
    }
  }
  RED.nodes.registerType("puppeteer-page-set-value", PuppeteerPageSetValue);
};
