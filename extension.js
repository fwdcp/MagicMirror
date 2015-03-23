var underscore = require('underscore');

module.exports = function(nodecg) {
    nodecg.declareSyncedVar({
        name: 'clients',
        initialValue: []
    });

    nodecg.variables.clients = [];

    function checkClientAuthorization(steam) {
        if (!nodecg.bundleConfig.authorizedClients) {
            return true;
        }

        return underscore.contains(nodecg.bundleConfig.authorizedClients, steam);
    }

    function findClient(steam) {
        return underscore.findIndex(nodecg.variables.clients, function(client) {
            return client.steam == steam;
        });
    }

    nodecg.listenFor('pong', function(data) {
        data.end = Date.now();

        if (data.client && checkClientAuthorization(data.client)) {
            var index = findClient(data.client);

            if (index != -1) {
                var clients = nodecg.variables.clients;

                underscore.extend(clients[index], {
                    latency: Math.ceil((data.end - data.start) / 2)
                });

                nodecg.variables.clients = clients;
            }
        }
    });

    nodecg.listenFor('clientUpdate', function(data) {
        if (data.steam && checkClientAuthorization(data.steam)) {
            var index = findClient(data.steam);

            var clients = nodecg.variables.clients;

            if (index != -1) {
                underscore.extend(clients[index], data, {
                    lastUpdate: data.lastUpdate > clients[index].lastUpdate ? data.lastUpdate : clients[index].lastUpdate
                });
            }
            else {
                clients.push(underscore.extend({
                    following: "0"
                }, data));
            }

            nodecg.variables.clients = clients;
        }
    });

    nodecg.listenFor('stateUpdate', function(data) {
        if (data.client && checkClientAuthorization(data.client)) {
            var index = findClient(data.client);

            if (index != -1) {
                var clients = nodecg.variables.clients;

                underscore.extend(clients[index], {
                    lastUpdate: data.time > clients[index].lastUpdate ? data.time : clients[index].lastUpdate
                });

                nodecg.variables.clients = clients;
            }
        }
    });

    nodecg.listenFor('followUpdate', function(data) {
        if (data.client && checkClientAuthorization(data.client)) {
            var index = findClient(data.client);

            if (index != -1) {
                var clients = nodecg.variables.clients;

                underscore.extend(clients[index], {
                    following: data.following
                });

                nodecg.variables.clients = clients;
            }
        }
    });

    setTimeout(function() {
        nodecg.sendMessage('requestClientUpdate');
        nodecg.sendMessage('ping', {
            start: Date.now()
        });

        var clients = nodecg.variables.clients;

        clients = underscore.reject(clients, function(client) {
            return !checkClientAuthorization(client.steam) || Date.now() - client.lastUpdate > 10000;
        });

        nodecg.variables.clients = clients;
    }, 1000);
};
