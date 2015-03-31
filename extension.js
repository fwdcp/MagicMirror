var underscore = require('underscore');

module.exports = function(nodecg) {
    nodecg.declareSyncedVar({
        name: 'clients',
        initialValue: []
    });

    var clients = {};

    function getClientSocketIDFromSteam(steam) {
        return underscore.findKey(clients, function(client) {
            return client.steam == steam;
        })
    }

    function updateClients() {
        underscore.each(clients, function(client, socketID) {
            if (client) {
                if (!client.following) {
                    clients[socketID].following = "0";
                }

                clients[socketID].authorized = (!nodecg.bundleConfig.authorizedClients && client.steam && client.steam != "0") || underscore.contains(nodecg.bundleConfig.authorizedClients, client.steam);
            }
        });

        nodecg.variables.clients = underscore.where(clients, {authorized: true});
    }

    function updateClientTransmit(steam) {
        if (!steam || steam == "0") {
            return;
        }

        var socketID = getClientSocketIDFromSteam(steam);

        if (socketID && io.connected[socketID]) {
            io.connected[socketID].emit('transmitUpdate', {
                required: underscore.where(clients, {
                    following: steam
                }).length > 0 ? true : false
            });
        }
    }

    var io = nodecg.getSocketIOServer().of('/MagicMirror');

    io.on('connection', function(socket) {
        clients[socket.id] = {};

        socket.on('clientUpdate', function(data) {
            if (!clients[socket.id]) {
                clients[socket.id] = {};
            }

            var needFollowsUpdate = !clients[socket.id].steam && data.steam;

            underscore.extend(clients[socket.id], data);

            if (needFollowsUpdate) {
                updateClientTransmit(clients[socket.id].steam);
            }

            updateClients();
        });

        socket.on('latencyUpdate', function(data) {
            data.end = Date.now();

            if (!clients[socket.id]) {
                clients[socket.id] = {};
            }

            underscore.extend(clients[socket.id], {
                latency: Math.ceil((data.end - data.start) / 2)
            });

            updateClients();
        });

        socket.on('stateUpdate', function(data) {
            if (!clients[socket.id]) {
                clients[socket.id] = {};
            }

            if (clients[socket.id].steam) {
                io.to('steam-' + clients[socket.id].steam).emit('stateUpdate', data);
            }
        });

        socket.on('disconnect', function() {
            if (clients[socket.id]) {
                var oldFollowing = clients[socket.id].following;

                clients[socket.id].following = "0";

                updateClientTransmit(oldFollowing);
            }

            delete clients[socket.id];

            updateClients();
        });
    });

    updateClients();

    nodecg.listenFor('followUpdate', function(data) {
        if (data.client) {
            var socketID = getClientSocketIDFromSteam(data.client);

            if (socketID) {
                var oldFollowing = clients[socketID].following;

                if (io.connected[socketID]) {
                    if (oldFollowing && oldFollowing != "0") {
                        io.connected[socketID].leave('steam-' + oldFollowing);
                    }

                    if (data.following && data.following != "0") {
                        io.connected[socketID].join('steam-' + data.following);
                    }
                }

                clients[socketID].following = data.following;

                updateClientTransmit(oldFollowing);
                updateClientTransmit(data.following);

                updateClients();
            }
        }
    });

    setInterval(function() {
        io.emit('tick', {
            start: Date.now()
        });
    }, 1000);
};
