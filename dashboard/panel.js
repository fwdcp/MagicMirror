nodecg.declareSyncedVar({
    name: 'clients',
    initialValue: [],
    setter: function(clients) {
        if (network) {
            network.fetch({remove: false});
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

rivets.formatters.following = {
    read: function(value) {
        if (_.isUndefined(value) || _.isNull(value) || !network.get(following)) {
            return 'none';
        }

        return value;
    },
    publish: function(value) {
        if (value == 'none') {
            return null;
        }

        return value;
    }
}

rivets.formatters.isEqual = function(one, other) {
    return one == other;
}

rivets.bind($('.MagicMirror'), {network: network});
