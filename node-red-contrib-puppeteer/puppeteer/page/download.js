module.exports = function (RED) {
  function PuppeteerPageDownload(nodeConfig) {
    RED.nodes.createNode(this, nodeConfig);
    // Parse the click count to integer
    nodeConfig.clickCount = parseInt(nodeConfig.clickCount);
    var node = this; // Referencing the current node

    this.on("input", async function (msg, send, done) {
      try {
        // Parsing the selector from string input or from msg object        
        let selector;

        if (nodeConfig.selectortype == "flow" || nodeConfig.selectortype == "global") {
          selector = this.context()[nodeConfig.selectortype].get(nodeConfig.selector);
        } else if (nodeConfig.selectortype == "str") {
          selector = nodeConfig.selector;
        } else {
          selector = eval(nodeConfig.selectortype + "." + nodeConfig.selector);
        }


        // Parsing the downloadPath from string input or from msg object
        let downloadPath;
        if (nodeConfig.downloadPathtype == "flow" || nodeConfig.downloadPathtype == "global") {
          downloadPath = this.context()[nodeConfig.downloadPathtype].get(nodeConfig.downloadPath);
        } else if (nodeConfig.downloadPathtype == "msg") {
          downloadPath = eval(nodeConfig.downloadPathtype + "." + nodeConfig.downloadPath)
        } else {
          downloadPath = nodeConfig.downloadPath
        }


        // Parsing the fileName from string input or from msg object
        let fileName;
        if (nodeConfig.fileNametype == "flow" || nodeConfig.fileNametype == "global") {
          fileName = this.context()[nodeConfig.fileNametype].get(nodeConfig.fileName);
        } else if (nodeConfig.fileNametype == "msg") {
          fileName = eval(nodeConfig.fileNametype + "." + nodeConfig.fileName)
        } else {
          fileName = nodeConfig.fileName
        }

        // If download path is defined
        if (downloadPath && downloadPath != "") {
          // Enable requests interception
          await msg.puppeteer.page.setRequestInterception(true);

          // When request comes
          msg.puppeteer.page.on("request", (interceptedRequest) => {
            // And for everything that ends with zip (for now only supported file type)
            if (interceptedRequest.url().endsWith(".zip")) {
              interceptedRequest.continue({ url: "chrome://downloads/" }); // Continue to downloads url where download path is defined
            } else {
              interceptedRequest.continue(); // Continue the requets as usual
            }
          });

          if (fileName && fileName != "") {
            msg.puppeteer.page.on("response", async (response) => {
              // node.warn(response);
              const url = response.url();
              const headers = response.headers();
              const regex = /filename\*?=[^'']*''([^']*)/;

              if (headers["content-disposition"]) {
                const match = regex.exec(headers["content-disposition"]);
                node.warn(headers["content-disposition"]);
                if (match && match[1]) {
                  const fs = require("fs");
                  const downloadedFileName = match[1];
                  const extensionRegex = /\.[^.]*$/;
                  const extension = extensionRegex.exec(downloadedFileName);
                  if(extension) {
                    msg.old = `${downloadPath}/${downloadedFileName}`;
                    msg.new = `${downloadPath}/${fileName}${extension[0]}`;
                    node.send(msg);
                  }
                  // extension ? msg.old
                  //   : node.send({ payload: null });
                  // const fileExtension = extension ? fs.renameSync(`${downloadPath}/${downloadedFileName}`, `${downloadPath}/${fileName}.${extension[0]}`) : node.warn(`File has no extension! saved as ${downloadedFileName} in ${downloadPath}!`);
                  // fs.renameSync(`${downloadPath}/${downloadedFileName}`, `${downloadPath}/${fileName}.${extension}`);
                }
              }
            });
          }
        }

        // Waiting for the specified selector
        node.status({
          fill: "blue",
          shape: "ring",
          text: `Wait for ${selector}`,
        });
        await msg.puppeteer.page.waitForSelector(selector);

        // Clicking on the specified selector
        node.status({ fill: "blue", shape: "dot", text: `Click ${selector}` });
        await msg.puppeteer.page.click(selector, nodeConfig);

        // If download path was specified
        if (downloadPath && downloadPath != "") {
          // Set the download path and download the file to it
          await msg.puppeteer.page._client.send("Page.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: downloadPath,
          });
        }

        // Selector clicked sucessfully
        node.status({
          fill: "green",
          shape: "dot",
          text: `Clicked ${selector}`,
        });
        if (!fileName || fileName == "")
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
      setTimeout(
        () => {
          done();
          node.status({});
        },
        msg.error ? 10000 : 3000
      );
    });
    this.on("close", function () {
      node.status({});
    });
    oneditprepare: function oneditprepare() {
      $("#node-input-clickCount").val(nodeConfig.clickCount);
      $("#node-input-delay").val(nodeConfig.delay);
      $("#node-input-button").val(nodeConfig.button);
      $("#node-input-name").val(nodeConfig.name);
      $("#node-input-downloadPath").val(nodeConfig.downloadPath);
    }
  }
  RED.nodes.registerType("puppeteer-page-download", PuppeteerPageDownload);
};
