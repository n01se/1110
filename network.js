var ws, clientId, allAvatars, connected,
    serverURI = "ws://1110.n01se.net:8080";

window.addEventListener('load', function () {
  console.log("Connecting to server:" + serverURI);
  ws = new WebSocket(serverURI);
  //ws = new WebSocket("ws://localhost:8080");
  ws.onopen = function () {
    console.log("WebSocket connection established");
    connected = true;
  };
  ws.onmessage = function (e) {
    //console.log("WebSocket message received: ", e.data);
    connected = true;
    var now = (new Date()).getTime();
    var msg = JSON.parse(e.data);
    if(msg.id) {
      clientId = msg.id;
    } else if (msg.all) {
      allAvatars = msg.all;
    } else if (msg.delete) {
      delete allAvatars[msg.delete];
    } else if (msg.change) {
        for (var id in msg.change) {
            allAvatars[id] = msg.change[id];
            allAvatars[id].last_update = now;
        }
    } else {
        console.error("Unrecognized message type: " + msg);
    }
  };
  ws.onerror = function (e) {
    console.log("WebSocket error:", e);
    alert("WebSocket error");
  };
  ws.onclose = function (e) {
    connected = false;
    console.log("WebSocket connection closed:", e, e);
    alert("Disconnected from server: " + e.reason + "(" + e.code + ")");
  };
});
