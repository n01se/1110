var ws;

window.addEventListener('load', function () {
  ws = new WebSocket("ws://1110.n01se.net:8080");
  //ws = new WebSocket("ws://localhost:8080");
  ws.onopen = function () {
    console.log("WebSocket connection established");
  };
  ws.onmessage = function (e) {
    console.log("WebSocket message received: ", e.data);
  };
  ws.onclose = function () {
    console.log("WebSocket connection closed");
  };
});
