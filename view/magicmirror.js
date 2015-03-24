var externalExtensions;
var mmSocket = io('/MagicMirror');
var connectLoop;
var sendUpdates = false;
var lastUpdate = Date.now();

nodecg.declareSyncedVar({
    name: 'clients',
    initialValue: []
});

mmSocket.on('stateUpdate', function(data) {
    if (lastUpdate < data.time && externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'convarchange', 'name': 'statusspec_cameratools_state', 'value': data.state}));
        lastUpdate = data.time;
    }
});

mmSocket.on('tick', function(data) {
    if (steam) {
        data.client = steam;

        nodecg.sendMessage('latencyUpdate', data);
    }

    if (externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'gameinforequest'}));
    }
});

function processMessage(event) {
    var data = JSON.parse(event.data);

    if (data.type == 'gameinfo') {
        if (mmSocket) {
            mmSocket.emit('clientUpdate', {
                steam: data.client.steam,
                name: data.client.name,
                game: data.ingame ? data.context.address : null
            });
        }
    }
    else if (sendUpdates && data.type == 'convarchanged') {
        if (data.name == 'statusspec_cameratools_state') {
            if (mmSocket) {
                nodecg.sendMessage('stateUpdate', {
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
