var ws, clientId, allAvatars;

window.addEventListener('load', function () {
  ws = new WebSocket("ws://1110.n01se.net:8080");
  //ws = new WebSocket("ws://localhost:8080");
  ws.onopen = function () {
    console.log("WebSocket connection established");
  };
  ws.onmessage = function (e) {
    console.log("WebSocket message received: ", e.data);
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
        }
    } else {
        console.error("Unrecognized message type: " + msg);
    }
    requestAnimFrame(draw);
  };
  ws.onclose = function () {
    console.log("WebSocket connection closed");
  };
});
