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

rivets.binders.following = {
    bind: function(el) {
        adapter = this.config.adapters[this.key.interface]
        model = this.model
        keypath = this.keypath

        this.callback = function() {
            value = $(el).val();

            if (value == 'none') {
                adapter.publish(model, keypath, null);
            }
            else {
                adapter.publish(model, keypath, value);
            }
        }

        $(el).on('change', this.callback);
    },

    unbind: function(el) {
        $(el).off('change', this.callback);
    },
    routine: function(el, value) {
        if (_.isUndefined(value) || _.isNull(value) || !network.get(value)) {
            $(el).val('none');
        }
        else {
            $(el).val(value);
        }
    }
}

rivets.formatters.isEqual = function(one, other) {
    return one == other;
}

rivets.bind($('.MagicMirror'), {network: network});
