var ws, clientId, allAvatars, connected,
    serverURI = "ws://" + window.location.hostname + ":8090",
    netDebug = 5;

// hackernews mitigation:
serverURI = "ws://ec2-23-22-134-23.compute-1.amazonaws.com:8080"

function serverMsg(color, html) {
    var msg = $('#message')[0];
    msg.style.background = color;
    msg.innerHTML = html;
}

window.addEventListener('load', function () {
  console.log("Connecting to server:" + serverURI);
  ws = new WebSocket(serverURI);
  //ws = new WebSocket("ws://localhost:8080");
  ws.onopen = function () {
    console.log("WebSocket connection established");
    connected = true;
  };
  ws.onmessage = function (e) {
    if (netDebug > 0) {
      console.log("WebSocket message received: ", e.data);
      netDebug--;
    }
    connected = true;
    var now = (new Date()).getTime();
    var msg = JSON.parse(e.data);
    if(msg.id) {
      clientId = msg.id;
    } else if (msg.all) {
      allAvatars = msg.all;
      for (var id in msg.all) {
        allAvatars[id]._last_update = now;
      }
    } else if (msg["delete"]) {
      delete allAvatars[msg["delete"]];
    } else if (msg.change) {
        for (var id in msg.change) {
            if (!allAvatars[id]) { allAvatars[id] = {}; }
            $.extend(allAvatars[id], msg.change[id]);
            allAvatars[id]._last_update = now;
            if(msg.change[id].skin) {
              allAvatars[id]._skinUpdate = now;
            }
            if (id === clientId.toString()) {
                if (msg.change[id].whomp) {
                    // Whomp means synchronize our avatar
                    console.log("Whomp to: ", allAvatars[id]);
                    delete allAvatars[id].whomp;
                    $.extend(avatar, allAvatars[id]);
                }
            }
        }
    } else {
        console.error("Unrecognized message type: " + msg);
    }
  };
  ws.onerror = function (e) {
    console.log("WebSocket error:", e);
  };
  ws.onclose = function (e) {
    connected = false;
    var msg = "";
    if (e.code === 1008 || e.code === 1009) {
      msg += "Disconnected from server"
      if (e.reason) {
        msg += ": " + e.reason;
      }
      msg += "<br>You can also run your own server. " +
          "Get the code <a href='https://github.com/n01se/1110'>on github</a>.<br>" +
          "Or <a href='http://www.youtube.com/watch?v=EvLxOVYeo5w'>watch a preview</a>";
    } else {
      msg += "No connection to server";
    }
    serverMsg("#fe8", msg);
    //console.log("WebSocket connection closed:", e, e);
  };
});
