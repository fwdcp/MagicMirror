var externalExtensions;
var connectLoop;
var client;
var network;

nodecg.declareSyncedVar({
    name: 'clients',
    initialValue: [],
    setter: function(clients) {
        network.fetch();

        if (client && network) {
            client.fetch();

            var following = client.get('following');

            if (following) {
                var followedClient = network.get(following);

                if (followedClient) {
                    var state = followedClient.get('state');
                    var ourLastUpdate = client.get('lastExternalUpdate') || 0;
                    var theirLastUpdate = followedClient.get('lastInternalUpdate');

                    if (state && ourLastUpdate < theirLastUpdate && externalExtensions && externalExtensions.readyState == 1) {
                        externalExtensions.send(JSON.stringify({'type': 'convarchange', 'name': 'statusspec_cameratools_state', 'value': state}));
                        client.set('lastExternalUpdate', theirLastUpdate);
                    }
                }
            }
        }
    }
});

function syncClients(method, model, options) {
    if (model instanceof Backbone.Model) {
        var clients = nodecg.variables.clients;

        var index = _.findIndex(clients, function(doc) {
            return doc[model.idAttribute] == model.id;
        });

        if (method == 'create') {
            if (index != -1) {
                clients.splice(index, 1);
            }

            clients.push(model.toJSON());
            var doc = clients[clients.length - 1];

            nodecg.variables.clients = clients;
            options.success(doc);
        }
        else if (method == 'read') {
            var doc = null;

            if (index != -1) {
                doc = clients[index];
            }

            options.success(doc);
        }
        else if (method == 'update') {
            var doc = null;

            if (index != -1) {
                _.extend(clients[index], model.toJSON());
                doc = clients[index];
            }
            else {
                clients.push(model.toJSON());
                doc = clients[clients.length - 1];
            }

            nodecg.variables.clients = clients;
            options.success(doc);
        }
        else if (method == 'delete') {
            var doc = null;

            if (index != 1) {
                doc = clients[index];

                clients.splice(index, 1);
            }

            options.success(doc);
        }
        else {
            console.log(method);
        }
    }
    else if (model instanceof Backbone.Collection) {
        if (method == 'read') {
            options.success(nodecg.variables.clients);
        }
        else {
            console.log(method);
        }
    }
}

var Client = Backbone.Model.extend({
    sync: syncClients
});
var Network = Backbone.Collection.extend({
    model: Client,
    sync: syncClients
});

var network = new Network();
network.fetch();

function processMessage(event) {
    var data = JSON.parse(event.data);

    if (data.type == 'gameinfo') {
        if (!client && data.client.steam) {
            client = network.create({
                id: data.client.steam
            });
        }

        if (client) {
            client.set('name', data.client.name);

            if (data.game) {
                client.set('serverType', data.game.type);
                client.set('server', data.game.address);
            }
            else {
                client.unset('serverType');
                client.unset('server');
            }

            client.save();
        }
    }
    else if (data.type == 'convarchanged') {
        if (data.name == 'statusspec_cameratools_state') {
            if (client) {
                client.set('lastInternalChange', Date.now());
                client.set('state', data.newvalue);

                client.save();
            }
        }
    }
}

function connect() {
    if (externalExtensions) {
        if (externalExtensions.readyState != 3) {
            if (externalExtensions.readyState == 1) {
                if (connectLoop) {
                    clearInterval(connectLoop);
                    connectLoop = null;
                }
            }

            return;
        }
    }

    externalExtensions = new WebSocket('ws://' + (url('?host') || 'localhost') + ':' + (url('?post') || 2006));

    externalExtensions.onopen = function(event) {
        if (connectLoop) {
            clearInterval(connectLoop);
            connectLoop = null;
        }

        externalExtensions.send(JSON.stringify({'type': 'gameinforequest'}));
        externalExtensions.send(JSON.stringify({'type': 'convarchange', 'name': 'statusspec_cameratools_state_enabled', 'value': 1}));
    }

    externalExtensions.onclose = function(event) {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }
    }

    externalExtensions.onerror = function(error) {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }
    }

    externalExtensions.onmessage = processMessage;
}

connectLoop = setInterval(connect, 1000);

window.onunload = function() {
    if (client) {
        nodecg.sendMessage('leaving', client.toJSON());
    }
}
