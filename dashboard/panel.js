var expose = {};

nodecg.declareSyncedVar({
    name: 'clients',
    initialValue: [],
    setter: function(data) {
        expose.clients = data;
    }
});

function findClient(steam) {
    return _.findIndex(nodecg.variables.clients, function(client) {
        return client.steam == steam;
    });
}

function updateFollow(event, model) {
    nodecg.sendMessage('followUpdate', {
        client: model.client.steam,
        following: $(this).val()
    });
}

rivets.formatters.isEqual = function(one, other) {
    return one == other;
}

rivets.bind($('.MagicMirror'), {data: expose, updateFollow: updateFollow});
