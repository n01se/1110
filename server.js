#!/usr/bin/env node

"use strict";

var maxClients = 20,
    maxMsgLength = 500,
    pushInterval = 75,
    port = process.argv[2] ? parseInt(process.argv[2],10) : 8080,
    WebSocket = require('ws'), WebSocketServer = WebSocket.Server,
    wss = new WebSocketServer( {host: '0.0.0.0', port: port}),
    clients = {}, clientData = {}, nextId = 1,
    changes = {};

function log(msg) { console.log(Date() + ": " + msg); }
function warn(msg) { console.warn(Date() + ": " + msg); }
function error(msg) { console.error(Date() + ": " + msg); }

function removeClient(clientId) {
    if (clients[clientId]) {
        warn("Removing Client ID " + clientId);
        delete clients[clientId];
        delete clientData[clientId];
        delete changes[clientId];
        log("Current number of clients: " + Object.keys(clients).length);
        sendAll(JSON.stringify({"delete": clientId}));
    }
};

function sendOne (clientId, json) {
    var client = clients[clientId];
    if (client) {
        try {
            if (client.readyState === WebSocket.OPEN) {
                client.send(json);
            }
        } catch (e) {
            log("Failed to send to client ID " + clientId);
            removeClient(clientId);
        }
    }
}

function sendAll (json) {
    var clientIds = Object.keys(clients), clientId;
    for (var i = 0; i < clientIds.length; i++) {
        clientId = clientIds[i];
        sendOne(clientId, json);
    }
}

function tooManyClients(client, clientId) {
    warn("Too many clients, disconnecting client " +
         (clientId ? clientId : ""));
    client.close(1008, "Too many clients, try again later");
}



// Periodically push out accumulated changes
setInterval(function () {
    if (Object.keys(changes).length > 0) {
        // Game specific logic tranforms
        changes = game1110Logic(clientData, changes);

        for(var clientId in changes) {
            var change = changes[clientId];
            for (var key in change) {
                 if (key !== "whomp") {
                     clientData[clientId][key] = change[key];
                 }
            }
        }
      sendAll(JSON.stringify({"change": changes}));
    }
    changes = {};
}, pushInterval);

wss.on('connection', function(client) {
    var numClients = Object.keys(clients).length+1;

    if (numClients > maxClients) {
        tooManyClients(client);
        return;
    }

    var clientId = nextId;
    nextId++;
  
    clients[clientId] = client;
    clientData[clientId] = {"id": clientId};
    log("New client ID: " + clientId);
    log("Current number of clients: " + numClients);

    // Send the new guy his ID and the all the other client states
    sendOne(clientId, JSON.stringify({"id": clientId}));
    sendOne(clientId, JSON.stringify({"all": clientData}));
    // Send the new guy's state to all the clients
    var tmp = {};
    tmp[clientId] = clientData[clientId];
    sendAll(JSON.stringify({"change": tmp}));

    client.on('close', function() {
        warn("Client ID " + clientId + " disconnected");
        removeClient(clientId);
    });

    client.on('message', function(message) {
        var data;
        //log("Received message from client ID " + clientId + ": " + message);
        if (message.length > maxMsgLength) {
            error("client " + clientId + " sent oversize " + message.length + " byte message ");
            client.close(1009, "Message length too long");
            return;
        }
        else if(message == "testTooManyClients") { // for testing
            log("received testTooManyClients from client " + clientId);
            tooManyClients(client, clientId);
            return;
	} 
        try {
            data = JSON.parse(message);
        } catch (e) {
            error("failed to parse client " + clientId + " message: " + message);
            return;
        }

        // We have some sort of update
        if (!changes[clientId]) {
            changes[clientId] = {};
        }

        if (!changes[clientId].whomp) {
            for(var key in data) {
                changes[clientId][key] = data[key];
            }
        }
    });
});


// Game specific logic is isolated here
var warpArea = 20,
    warps = [
    {src: {x: -144, y: -1295},   // Middle of first tree
     dst: {x: 10490, y: -2104}}, // Dead tree near mario land
    {src: {x: -594, y: -1484},
     dst: "random-person"}];

function game1110Logic(clientData, changes) {
    for (var clientId in changes) {
        // Check for warp
        var curC = clientData[clientId],
            newC = changes[clientId];
        var warped = false;
        if (newC.skin && newC.skin !== curC.skin) {
            //console.log("Detected skin change to " + newC.skin + " for client id " + clientId);
            for (var i=0; i < warps.length; i++) {
                var warp = warps[i];
                if ((curC.x < warp.src.x + warpArea) && 
                    (curC.x > warp.src.x - warpArea) &&
                    (curC.y < warp.src.y + warpArea) &&
                    (curC.y > warp.src.y - warpArea)) {
                    if (warp.dst === "random-person") {
                        var ids = Object.keys(clients);
                        if (ids.length === 1) { continue; }
                        var our_idx = ids.indexOf(clientId);
                        var rnd_idx = Math.floor(Math.random()*(ids.length - 1));
                        var id = ids[rnd_idx < our_idx ? rnd_idx : rnd_idx + 1];
                        newC.x = clientData[id].x;
                        newC.y = clientData[id].y;
                    } else {
                        newC.x = warp.dst.x;
                        newC.y = warp.dst.y;
                    }
                    console.log("Warp of " + clientId + " to " + newC.x + "," + newC.y);
                    warped = true;
                    changes[clientId]["whomp"] = true;
                    //sendOne(clientId, JSON.stringify({"msg": "message data"}))
                }
            }
        }
    }
    return changes;
}

