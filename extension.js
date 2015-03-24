var underscore = require('underscore');

module.exports = function(nodecg) {
    nodecg.declareSyncedVar({
        name: 'clients',
        initialValue: []
    });

    var clients = [];

    function updateClients() {
        for (var i = 0; i < clients.length; i++) {
            if (clients[i]) {
                if (!underscore.isUndefined(clients[i].following)) {
                    clients[i].following = "0";
                }

                clients[i].authorized = (!odecg.bundleConfig.authorizedClients && clients[i].steam) || underscore.contains(nodecg.bundleConfig.authorizedClients, clients[i].steam);
            }
        }

        nodecg.variables.clients = underscore.where(clients, {authorized: true});
    }

    var io = nodecg.getSocketIOServer().of('/MagicMirror');

    io.on('connection', function(socket) {
        clients[socket.id] = {};

        socket.on('clientUpdate', function(data) {
            underscore.extend(clients[socket.id], data);

            updateClients();
        });

        socket.on('latencyUpdate', function(data) {
            data.end = Date.now();

            underscore.extend(clients[socket.id], {
                latency: Math.ceil((data.end - data.start) / 2)
            });

            updateClients();
        });

        socket.on('disconnect', function() {
            delete clients[socket.id];

            updateClients();
        });
    });

    updateClients();

    /* function findClient(steam) {
        return underscore.findIndex(nodecg.variables.clients, function(client) {
            return client.steam == steam;
        });
    }

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

    setInterval(function() {
        var clients = nodecg.variables.clients;

        clients = underscore.reject(clients, function(client) {
            return !checkClientAuthorization(client.steam) || Date.now() - client.lastUpdate > 10000;
        });

        nodecg.variables.clients = clients;

        nodecg.sendMessage('tick', {
            start: Date.now(),
            leaders: underscore.compact(underscore.pluck(clients, 'following'))
        });
    }, 1000); */
};
