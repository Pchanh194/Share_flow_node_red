module.exports = function (RED) {
  function PuppeteerPageGoto(nodeConfig) {
    RED.nodes.createNode(this, nodeConfig);
    var node = this; // Referencing the current node

    this.on("input", async function (msg, send, done) {
      try {
        // If the type of url is set to flow or global, it needs to be parsed differently
        let url;
        if (nodeConfig.urltype === "flow" || nodeConfig.urltype === "global") {
          url = this.context()[nodeConfig.urltype].get(nodeConfig.url);
        } else if (nodeConfig.urltype === "msg") {
          url = RED.util.getMessageProperty(msg, nodeConfig.url);
        } else {
          url = nodeConfig.url; // Assuming it's a direct string
        }
        

        // Visiting URL
        node.status({ fill: "blue", shape: "dot", text: `Go to ${url}` });
        await msg.puppeteer.page.goto(url, nodeConfig);

        // URL visited
        node.status({ fill: "green", shape: "dot", text: url });
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
      $("#node-input-waitUntil").val(this.waitUntil);
    }
  }
  RED.nodes.registerType("puppeteer-page-goto", PuppeteerPageGoto);
};
