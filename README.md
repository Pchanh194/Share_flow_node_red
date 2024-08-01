# node-red-contrib-puppeteer

## Variables node

This Node-RED node allows you to easily define and manage variables within your flows.

## Features

* **Declare variables:** You can define multiple variables with names, values, and scopes (flow or global). 
* **Variable persistence:** Variables are stored in the node's configuration and are saved along with your flow.
* **Variable access:** Access variables in other nodes:
    * **Mustache syntax:** Use the built-in Mustache syntax in Node-RED nodes that support it (e.g., `switch`, `change`). Choose the scope (flow or global) and type the variable name in the appropriate field.
    * **JavaScript:** In nodes that execute JavaScript code (e.g., `function`), use `flow.get("variable_name")` or `global.get("variable_name")` to access variables.
    * `msg.variable_name`: The `variables` node adds all variables to the output message's properties.


## Installation

1. **Install Node-RED:** If you haven't already, install Node-RED from [https://nodered.org/docs/getting-started/installation](https://nodered.org/docs/getting-started/installation).
2. **Install this node:**
   ```bash
   cd ~/.node-red
   npm install <path-to-node-red-contrib-puppeteer>
   ```
   Replace `<path-to-node-red-contrib-puppeteer>` with the actual path to the folder where you have this node.
3. **Restart Node-RED:** After installation, restart Node-RED to use the new node.

## Usage

1. **Add the `variables` node to your flow:**
   * Search for "variables" in the Node-RED palette.
   * Drag and drop the `variables` node into your flow.

2. **Configure the node:**
   * **Name:** Give the node a descriptive name.
   * **Variables:** Define your variables:
     * **Name:** The variable's name.
     * **Value:** The variable's value.
     * **Scope:** Choose either "flow" or "global" to define the scope of the variable.

3. **Connect other nodes:**
   * Connect other nodes to the `variables` node to access variables in the `msg` object.

## Example

The `flows.js` file contains an example of how to use the `variables` node.

* **URL node:** The `URL` node uses Mustache syntax to access `flow.link` and go to the link defined in variables, take a screenshot and quit.
* **Function node:** The `Function` node uses `local.get("link")` to access the global variable `link` and constructs a message payload with it.

## Notes

* Variables defined using the `variables` node are persisted in the flow's configuration. This means that they will be available whenever you load the flow.
* You can use `variables` node to define variables based on dynamic values (e.g., from input messages).
* Be sure to install the required Node-RED packages to use the `variables` node.

## Contributing

Contributions to this node are welcome! Please open an issue or submit a pull request.

```markdown
```

**Remember to:**

* Replace `<path-to-node-red-contrib-puppeteer>` with the actual path to your node's folder.
* Add more detailed explanations and examples to your `README.md` file.
* Consider adding more advanced features like variable updating and deletion.

This is a basic `README.md` to get you started. Tailor it to your specific needs and functionalities of your node.


