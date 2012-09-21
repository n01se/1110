var send_poll_interval = 50;
var swing = 2;
var maxSpeed = 0.3; // pixels per ms
var friction = 0.01;
var pullPower = 0.0003;
var message_time = 15000;
var collide_bounce = 0.0;

var clamp = function(x, min, max) {
  return x>min?(x<max?x:max):min;
};

var tilesize = 2048;
var size=[14,48,25,33]; 

var viewport = $('#viewport')[0];
var ctx = viewport.getContext("2d");
//var sctx = $('#scanner')[0].getContext("2d");
//var s2ctx = $('#scanner2')[0].getContext("2d");
var canvas_size = {x: $('#viewport').width(), y: $('#viewport').height()};
var canvas_center = {x: Math.round(canvas_size.x/2),
                     y: Math.round(canvas_size.y/2)};
var name = "1n1w";
var images = {};

var avatar_img = loadImage("images/avatar01.png");
var avatar_width = 26;
var avatar_height = 57;

var avatar = {
  x : 11659,
  //y : -1294,
  y : -1645,
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
      url = 'images/'+name+'.png';
      images[name] = loadImage(url, function () {
        images[name].isLoaded = true;
      });
    }
  });
};

var drawAvatar = function (ox, oy, dx, id, msg) {
  var x = canvas_center.x + ox, y = canvas_center.y + oy;
  // Only draw if on-screen
  if (x > -60 && y > -60 &&
      x < (canvas_size.x+60) && y < (canvas_size.y+60)) {
    ctx.save();
    ctx.translate(x, y);
    if(msg) {
      ctx.fillText(msg,-(ctx.measureText(msg).width/2),-10);
    }
    ctx.rotate(dx*swing);
    ctx.drawImage(avatar_img,-avatar_width/2,-5);
    if(id) {
      ctx.fillText(id,-(ctx.measureText(id).width/2),70);
    }
    ctx.restore();
  }
};

var getDensity = function (x, y, w, h, skip) {
  var data = ctx.getImageData(x, y, w, h).data,
      cnt = 0, skip = (skip || 4);
  for (var i=0; i< data.length; i+=skip) {
    cnt += data[i];
  }
  //s2ctx.drawImage(viewport, x, y, w, h, 0, 0, 40, 40);
  //console.log("cnt:", cnt, data.length);
  return (255-((skip*cnt)/data.length)) / 255;
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
        ctx.drawImage(images[name], ox, oy);
      }
    }
  });

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.font = "10pt Comic Sans, Arial";

  // Draw our avatar
  avatar.last_update = avatar.last_update || now;
  var dx = avatar.dx * (now - avatar.last_update),
      dy = avatar.dy * (now - avatar.last_update);

  // Collision detection
  if (dx || dy) {

//    sctx.drawImage(viewport, canvas_center.x + dx, canvas_center.y + dy,
//                             avatar_width, avatar_height, 0, 0,
//                             260, 570);
    var ax = canvas_center.x+7-(avatar_width/2),
        ay = canvas_center.y+2,
        aw = avatar_width-14, //-avatar_width/2,
	ah = avatar_height-12;

    var xDensity1 = getDensity(ax, ay, aw, ah);
    var yDensity1 = getDensity(ax, ay, aw, ah);
    var xDensity2 = getDensity(ax+dx, ay, aw, ah);
    var yDensity2 = getDensity(ax, ay+dy, aw, ah);

    /*
    // Show the bounding boxes for collision detection
    ctx.strokeStyle = "rgb(255,128,128)";
    ctx.strokeRect(ax, ay, aw, ah);
    ctx.strokeStyle = "rgb(128,255,128)";
    ctx.strokeRect(ax+dx, ay, aw, ah);
    ctx.strokeStyle = "rgb(128,128,255)";
    ctx.strokeRect(ax, ay+dy, aw, ah);
    */

    if (xDensity2 > 0.10 && xDensity1 < xDensity2) {
      avatar.dx = -avatar.dx * collide_bounce;
      dx = -dx * collide_bounce;
    }
    if (xDensity2 > 0.10 && yDensity1 < yDensity2) {
      avatar.dy = -avatar.dy * collide_bounce;
      dy = -dy * collide_bounce;
    }
  }

  avatar.x += dx;
  avatar.y += dy;
  avatar.last_update = now;
  drawAvatar(0, 0, avatar.dx, clientId, avatar.msg);

  // Draw the other avatars
  for(avatarId in allAvatars) {
    oa = allAvatars[avatarId];
    if(avatarId != clientId && oa.last_update) {
      ox = Math.round(oa.x - avatar.x + oa.dx * (now - oa.last_update));
      oy = Math.round(oa.y - avatar.y + oa.dy * (now - oa.last_update));
      drawAvatar(ox, oy, oa.dx, avatarId, oa.msg);
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

$('#viewport').mousedown(function(e){
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
var clearNextMessage = false;

var messageTimeout = function () {
      messageTimer = null;
      avatar.msg = "";
      pending_update = avatar;
};


$('body').keyup(function(e){
  var key = e.keyCode,
      msg = $('#message');
  //console.log("key:", e.keyCode);

  if (messageTimer) {
    clearTimeout(messageTimer);
  }
  messageTimer = setTimeout(messageTimeout, message_time);

  if (key === 8) {
    clearNextMessage = false;
    avatar.msg = avatar.msg.substring(0, avatar.msg.length-1);
    pending_update = avatar;
  }
});

$('body').keypress(function(e){
  var key = e.keyCode, chr = e.charCode,
      msg = $('#message');
  //console.log("char:", chr, String.fromCharCode(e.charCode));
  if (key === 13) {
    clearNextMessage = true;
  } else {
    if (clearNextMessage) {
      clearNextMessage = false;
      avatar.msg = "";
    }
    avatar.msg += String.fromCharCode(chr);
    pending_update = avatar;
  }
});
