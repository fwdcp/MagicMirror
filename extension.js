var underscore = require('underscore');

module.exports = function(nodecg) {
    nodecg.declareSyncedVar({
        name: 'clients',
        initialValue: []
    });

    nodecg.variables.clients = [];

    function findClient(steam) {
        return underscore.findIndex(nodecg.variables.clients, function(client) {
            return client.steam == steam;
        });
    }

    nodecg.listenFor('clientUpdate', function(data) {
        if (data.steam) {
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
        if (data.client) {
            var index = findClient(data.client);

            if (index != -1) {
                var clients = nodecg.variables.clients;

                clients[index].lastUpdate = data.time > clients[index].lastUpdate ? data.time : clients[index].lastUpdate;

                nodecg.variables.clients = clients;
            }
        }
    });

    nodecg.listenFor('followUpdate', function(data) {
        if (data.client) {
            var index = findClient(data.client);

            if (index != -1) {
                var clients = nodecg.variables.clients;

                clients[index].following = data.following;

                nodecg.variables.clients = clients;
            }
        }
    });
}
