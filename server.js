#!/usr/bin/env node

var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer( {host: '0.0.0.0', port: 8080}),
    clients = {}, clientData = {}, nextId = 1;

function sendOne (clientId, data) {
    var json = JSON.stringify(data);
    try {
        clients[clientId].send(json);
    } catch (e) {
        console.log("Failed to send to client ID " + clientId);
    }
}

function sendAll (data) {
    var json = JSON.stringify(data);
    for (var i in clients) {
        try {
            clients[i].send(json);
        } catch (e) {
            console.log("Failed to send to client ID " + i);
        }
    }
}

wss.on('connection', function(client) {
    clientId = nextId;
    nextId++;
    clients[clientId] = client;
    clientData[clientId] = {};
    console.log("New client ID: " + clientId);

    sendOne(clientId, {"id": clientId});
    sendAll({"data": clientData});

    client.on('close', function() {
        console.log("Client ID " + clientId + " disconnected");
        delete clients[clientId];
        delete clientData[clientId];
        sendAll({"data": clientData});
    });

    client.on('message', function(message) {
        var data;
        console.log("Received message from client ID " + clientId + ": " + message);
        try {
            clientData[clientId] = JSON.parse(message);
        } catch (e) {
            console.error("failed to parse message");
        }
        sendAll({"data": clientData});
    });
});

