var externalExtensions;
var connectLoop;
var steam;
var lastUpdate = Date.now();

nodecg.declareSyncedVar({
    name: 'clients',
    initialValue: []
});

function findClient(steam) {
    return _.findIndex(nodecg.variables.clients, function(client) {
        return client.steam == steam;
    });
}

nodecg.listenFor('ping', function(data) {
    if (steam) {
        data.client = steam;

        nodecg.sendMessage('pong', data);
    }
});

nodecg.listenFor('stateUpdate', function(data) {
    if (findClient(steam) != -1) {
        var ourClient = nodecg.variables.clients[findClient(steam)];

        if (ourClient && ourClient.following == data.client && lastUpdate < data.time && externalExtensions && externalExtensions.readyState == 1) {
            externalExtensions.send(JSON.stringify({'type': 'convarchange', 'name': 'statusspec_cameratools_state', 'value': data.state}));
            lastUpdate = data.time;
        }
    }
});

nodecg.listenFor('requestClientUpdate', function() {
    if (externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'gameinforequest'}));
    }
});

function processMessage(event) {
    var data = JSON.parse(event.data);

    if (data.type == 'gameinfo') {
        steam = data.client.steam;

        if (steam) {
            nodecg.sendMessage('clientUpdate', {
                steam: data.client.steam,
                name: data.client.name,
                game: data.game ? data.game.address : null,
                lastUpdate: Date.now()
            });
        }
    }
    else if (data.type == 'convarchanged') {
        if (data.name == 'statusspec_cameratools_state') {
            if (steam) {
                nodecg.sendMessage('stateUpdate', {
                    client: steam,
                    time: Date.now(),
                    state: data.newvalue
                });
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

    externalExtensions.onopen = function() {
        if (connectLoop) {
            clearInterval(connectLoop);
            connectLoop = null;
        }

        externalExtensions.send(JSON.stringify({'type': 'gameinforequest'}));
    };

    externalExtensions.onclose = function() {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }
    };

    externalExtensions.onerror = function() {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }
    };

    externalExtensions.onmessage = processMessage;
}

connectLoop = setInterval(connect, 1000);
