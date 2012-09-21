var send_poll_interval = 50;
var swing = 2;
var maxSpeed = 0.3; // pixels per ms
var friction = 0.01;
var pullPower = 0.0003;
var message_time = 15000;

var clamp = function(x, min, max) {
  return x>min?(x<max?x:max):min;
};

var tilesize = 2048;
var size=[14,48,25,33]; 

var ctx = $('canvas')[0].getContext("2d");
var canvas_size = {x: $('canvas').width(), y: $('canvas').height()};
var canvas_center = {x: Math.round(canvas_size.x/2),
                     y: Math.round(canvas_size.y/2)};
var name = "1n1w";
var images = {};

var avatar_img = $('<img src="avatar01.png" />');

var avatar = {
  x : -608,
  y : -1483,
  dx : 0,
  dy : 0,
  msg : "",
  last_update : 0};

var pulling = false;
var mousepull = {x:0, y:0};

var pending_update = null;

var tile_name=function(x,y){
  return (y>=0?(y+1)+'s':-y+'n')+(x>=0?(x+1)+'e':-x+'w');
}; 

var for_tiles = function(f) {
  var name, url;
  var sx = Math.floor(avatar.x / tilesize);
  var sy = Math.floor(avatar.y / tilesize);
  for(var dx = -1; dx <= 1; ++dx)
  for(var dy = -1; dy <= 1; ++dy) {
    name = tile_name(sx+dx, sy+dy);
    f(sx+dx, sy+dy, name);
  }
};

var load_images = function() {
  for_tiles(function(tx, ty, name) {
    if( !images[name] ) {
      url = 'http://imgs.xkcd.com/clickdrag/'+name+'.png';
      images[name] = $('<img src="' + url + '" />');
      images[name].isLoaded = false;
      images[name].load(function () {
        images[name].isLoaded = true;
      });
    }
  });
};

var drawAvatar = function (ox, oy, dx, label) {
  var x = canvas_center.x + ox, y = canvas_center.y + oy;
  // Only draw if on-screen
  if (x > -60 && y > -60 &&
      x < (canvas_size.x+60) && y < (canvas_size.y+60)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dx*swing);
    ctx.drawImage(avatar_img[0],0,0);
    ctx.fillText(label,0,70);
    ctx.restore();
  }
};

var draw = function() {
  //console.log('draw!');
  var now = (new Date()).getTime();

  ctx.fillStyle = avatar.y>-1024?"rgb(0,0,0)":"rgb(255,255,255)";
  ctx.fillRect(0, 0, canvas_size.x, canvas_size.y);

  // Draw the background
  var ox, oy, oa;
  for_tiles(function(tx, ty, name) {
    if( images[name] && images[name].isLoaded) {
      ox = tx*tilesize-Math.round(avatar.x)-canvas_center.x;
      oy = ty*tilesize-Math.round(avatar.y)-canvas_center.y;
      if( ox < canvas_size.x && oy < canvas_size.y &&
          ox+tilesize > 0 && oy+tilesize > 0 ) {
        ctx.drawImage(images[name][0], ox, oy);
      }
    }
  });

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.font = "10pt Comic Sans, Arial";

  // Draw our avatar
  avatar.last_update = avatar.last_update || now;
  avatar.x += avatar.dx * (now - avatar.last_update);
  avatar.y += avatar.dy * (now - avatar.last_update);
  avatar.last_update = now;
  var label = "";
  if (clientId) {
    label = clientId + " " + avatar.msg;
  }
  drawAvatar(0, 0, avatar.dx, label);

  // Draw the other avatars
  for(avatarId in allAvatars) {
    oa = allAvatars[avatarId];
    if(avatarId != clientId && oa.last_update) {
      ox = Math.round(oa.x - avatar.x + oa.dx * (now - oa.last_update));
      oy = Math.round(oa.y - avatar.y + oa.dy * (now - oa.last_update));
      drawAvatar(ox, oy, oa.dx, (avatarId + " " + (oa.msg || "")));
      //console.log("client", avatarId, "at", ox, oy);
    }
  }
};

setInterval(function () {
  if (window.ws && ws.readyState && pending_update) {
    ws.send(JSON.stringify(pending_update));
    pending_update = null;
  }
}, send_poll_interval);

var applyMousePull = function(d, pull) {
  d = clamp(d - pull * pullPower, -maxSpeed, maxSpeed);
  if (d >= friction) {
    return d - friction;
  }
  else if (d <= -friction) {
    return d + friction;
  }
  else {
    return 0;
  }
};

var pull = function() {
  avatar.dx = applyMousePull(avatar.dx, mousepull.x);
  avatar.dy = applyMousePull(avatar.dy, mousepull.y);
  pending_update = avatar;
  load_images();
};

var animate = function() {
  pull();
  draw();
  requestAnimFrame(animate);
};

window.addEventListener('load', function () {
  load_images();
  animate();
});

$('canvas').mousedown(function(e){
  pulling = true;
  mousepull = {x: (20+canvas_center.x)-e.clientX,
               y: (20+canvas_center.y)-e.clientY};
}).mousemove(function(e){
  if(pulling) {
    mousepull = {x: (20+canvas_center.x)-e.clientX,
                 y: (20+canvas_center.y)-e.clientY};
  }
});
$('body').mouseup(function(e){
  pulling = false;
  mousepull = {x:0, y:0};
});


// Key/message handling

var messageTimer = null;

$('body').keyup(function(e){
  var key = e.keyCode,
      msg = $('#message');
  //console.log("key:", e.keyCode);
  if (key === 8) {
    var txt = msg.text();
    msg.text(txt.substring(0, txt.length-1));
  }
});

$('body').keypress(function(e){
  var key = e.keyCode, chr = e.charCode,
      msg = $('#message');
  //console.log("char:", chr, String.fromCharCode(e.charCode));
  if (key === 13) {
    console.log("sending:", msg.text());
    avatar.msg = msg.text();
    pending_update = avatar;
    msg.text("");
    if (messageTimer) {
      clearTimeout(messageTimer);
    }
    messageTimer = setTimeout(function () {
      avatar.msg = "";
      pending_update = avatar;
    }, message_time);
  } else {
    msg.text(msg.text() + String.fromCharCode(chr));
  }
});
