module.exports = function(RED) {
    function VariablesNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        node.variables = config.variables || [];
        
        // Khởi tạo và cập nhật biến khi node được deploy hoặc khởi động
        function initializeVariables() {
            node.variables.forEach(function(variable) {
                if (variable.name && variable.value !== undefined) {
                    if (variable.scope === 'flow') {
                        node.context().flow.set(variable.name, variable.value);
                    } else if (variable.scope === 'global') {
                        node.context().global.set(variable.name, variable.value);
                    }
                }
            });
        }
        
        initializeVariables();
        
        node.on('input', function(msg) {
            // Cập nhật biến khi nhận input (nếu cần)
            initializeVariables();
            
            // Thêm tất cả biến vào msg để các node khác có thể sử dụng
            node.variables.forEach(function(variable) {
                if (variable.name) {
                    var value;
                    if (variable.scope === 'flow') {
                        value = node.context().flow.get(variable.name);
                    } else if (variable.scope === 'global') {
                        value = node.context().global.get(variable.name);
                    }
                    if (value !== undefined) {
                        RED.util.setMessageProperty(msg, variable.name, value);
                    }
                }
            });
            
            node.send(msg);
        });
    }
    
    RED.nodes.registerType("variables", VariablesNode, {
        defaults: {
            name: {value: ""},
            variables: {value: [], validate: function(v) { return true; }}
        }
    });
}