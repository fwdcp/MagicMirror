var underscore = require('underscore');
var backbone = require('backbone');

module.exports = function(nodecg) {
    nodecg.declareSyncedVar({
        name: 'clients',
        initialValue: [],
        setter: function(clients) {
            if (network) {
                network.fetch();
            }
        }
    });

    nodecg.variables.clients = [];

    function syncClients(method, model, options) {
        if (model instanceof backbone.Model) {
            var clients = nodecg.variables.clients;

            var index = underscore.findIndex(clients, function(doc) {
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
                    underscore.extend(clients[index], model.toJSON());
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
        else if (model instanceof backbone.Collection) {
            if (method == 'read') {
                options.success(nodecg.variables.clients);
            }
            else {
                console.log(method);
            }
        }
    }

    var Client = backbone.Model.extend({
        sync: syncClients,
        set: function() {
            var returnValue = Backbone.Model.prototype.set.apply(this, arguments);
            this.save();
            return returnValue;
        }
    });

    var Network = backbone.Collection.extend({
        model: Client,
        sync: syncClients
    });

    var network = new Network();
    network.fetch();
}
