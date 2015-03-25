var externalExtensions;
var magicMirror = io('/MagicMirror');
var connectLoop;
var transmit = false;
var lastUpdate = Date.now();

magicMirror.on('stateUpdate', function(data) {
    if (lastUpdate < data.time && externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'convarchange', 'name': 'statusspec_cameratools_state', 'value': data.state}));
        lastUpdate = data.time;
    }
});

magicMirror.on('transmitUpdate', function(data) {
    transmit = data.required;
});

magicMirror.on('tick', function(data) {
    magicMirror.emit('latencyUpdate', data);

    if (externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'gameinforequest'}));
    }
});

function processMessage(event) {
    var data = JSON.parse(event.data);

    if (data.type == 'gameinfo') {
        if (magicMirror) {
            magicMirror.emit('clientUpdate', {
                steam: data.client.steam,
                name: data.client.name,
                game: data.ingame ? data.context.address : null
            });
        }
    }
    else if (data.type == 'convarchanged') {
        if (transmit && magicMirror && data.name == 'statusspec_cameratools_state') {
            magicMirror.emit('stateUpdate', {
                time: Date.now(),
                state: data.newvalue
            });
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
    };

    externalExtensions.onclose = function() {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }

        magicMirror.emit('clientUpdate', {
            steam: null,
            name: null,
            game: null
        });
    };

    externalExtensions.onerror = function() {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }

        magicMirror.emit('clientUpdate', {
            steam: null,
            name: null,
            game: null
        });
    };

    externalExtensions.onmessage = processMessage;
}

connectLoop = setInterval(connect, 1000);
