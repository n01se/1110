var send_poll_interval = 50;
var swing = 2;
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
var canvas_size = {x: $('#viewport').width(), y: $('#viewport').height()};
var canvas_center = {x: Math.round(canvas_size.x/2),
                     y: Math.round(canvas_size.y/2)};
var scanner = $('<canvas width="' + canvas_size.x + '" height="' + canvas_size.y + '"/>');
var sctx = scanner[0].getContext("2d");
var bg_tiles = {};
var scan_tiles = {};

var applyMousePull = function(d, pull, maxSpeed) {
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

var drawTiles = function(ctx, tileset) {
  var ox, oy, oa;
  for_tiles(function(tx, ty, name) {
    if( tileset[name] && tileset[name].isLoaded) {
      ox = tx*tilesize-Math.round(avatar.x)-canvas_center.x;
      oy = ty*tilesize-Math.round(avatar.y)-canvas_center.y;
      if( ox < canvas_size.x && oy < canvas_size.y &&
          ox+tilesize > 0 && oy+tilesize > 0 ) {
        ctx.drawImage(tileset[name], ox, oy);
      }
    }
  });
};

var centerText = function(text, y) {
  if(text) {
    ctx.fillText(text,-(ctx.measureText(text).width/2),y);
  }
}

var skins = {
  ghost: {
    imgs: { left: loadImage("images/ghost-left.png"),
            right: loadImage("images/ghost-right.png") },
    width: 50,
    height: 57,
    maxSpeed: 0.1, // pixels per ms
    draw: function (skin, avatar, ox, oy, dx, id, msg) {
      var x = canvas_center.x + ox, y = canvas_center.y + oy;
      // Only draw if on-screen
      if (x > -60 && y > -60 &&
	  x < (canvas_size.x+60) && y < (canvas_size.y+60)) {
	ctx.save();
	ctx.fillStyle = "rgb(128,128,128)";
	ctx.translate(x, y);
	centerText(avatar.msg, -10);
	centerText(avatar.nick || id, 50);
	ctx.save();
        ctx.scale(0.7, 0.7);
	ctx.drawImage((avatar.last_dx||dx)<0?skin.imgs.left:skin.imgs.right, -skin.width/2, -5);
	ctx.restore();
	ctx.restore();
      }
    },
    update: function(skin, now) {
      avatar.dx = applyMousePull(avatar.dx, mousepull.x, skin.maxSpeed);
      avatar.dy = applyMousePull(avatar.dy, mousepull.y, skin.maxSpeed);

      avatar.last_update = avatar.last_update || now;
      var dx = avatar.dx * (now - avatar.last_update),
	  dy = avatar.dy * (now - avatar.last_update);

      avatar.x += dx;
      avatar.y += dy;
      if(dx != 0) {
        avatar.last_dx = dx;
      }
      avatar.last_update = now;
      pending_update = avatar;
    }
  },
  sticky: {
    img: loadImage("images/avatar01.png"),
    width: 26,
    height: 57,
    maxSpeed: 0.3,
    draw: function (skin, avatar, ox, oy, dx, id, msg) {
      var x = canvas_center.x + ox, y = canvas_center.y + oy;
      // Only draw if on-screen
      if (x > -60 && y > -60 &&
	  x < (canvas_size.x+60) && y < (canvas_size.y+60)) {
	ctx.save();
	ctx.translate(x, y);
	centerText(avatar.msg, -10);
	ctx.rotate(dx*swing);
	ctx.drawImage(skin.img,-skin.width/2,-5);
	centerText(avatar.nick || id, 70);
	ctx.restore();
      }
    },
    update: function(skin, now) {
      avatar.dx = applyMousePull(avatar.dx, mousepull.x, skin.maxSpeed);
      avatar.dy = applyMousePull(avatar.dy, mousepull.y, skin.maxSpeed) + (avatar.y > -25000 ? -0.008 : 0);
      pending_update = avatar;

      avatar.last_update = avatar.last_update || now;
      var dx = avatar.dx * (now - avatar.last_update),
	  dy = avatar.dy * (now - avatar.last_update);

      // Collision detection
      if (dx || dy) {

        drawTiles(sctx, scan_tiles);
	var ax = canvas_center.x+7-(skin.width/2),
	    ay = canvas_center.y+2,
	    aw = skin.width-14, //-skin.width/2,
	    ah = skin.height-12;

	var xDensity1 = getDensity(sctx, ax, ay, aw, ah);
	var yDensity1 = getDensity(sctx, ax, ay, aw, ah);
	var xDensity2 = getDensity(sctx, ax+dx, ay, aw, ah);
	var yDensity2 = getDensity(sctx, ax, ay+dy, aw, ah);

	/*
	// Show the bounding boxes for collision detection
	ctx.strokeStyle = "rgb(255,128,128)";
	ctx.strokeRect(ax, ay, aw, ah);
	ctx.strokeStyle = "rgb(128,255,128)";
	ctx.strokeRect(ax+dx, ay, aw, ah);
	ctx.strokeStyle = "rgb(128,128,255)";
	ctx.strokeRect(ax, ay+dy, aw, ah);
	*/

	if (xDensity2 > (0.40 * (ah/(aw+ah))) && xDensity1 < xDensity2) {
	  avatar.dx = -avatar.dx * collide_bounce;
	  dx = -dx * collide_bounce;
	}
	if (xDensity2 > (0.40 * (aw/(ah+aw))) && yDensity1 < yDensity2) {
	  avatar.dy = -avatar.dy * collide_bounce;
	  dy = -dy * collide_bounce;
	}
      }

      avatar.x += dx;
      avatar.y += dy;
      avatar.last_update = now;
    }
  }
};

function drawAvatar(avatar, ox, oy, id) {
  var skin = skins[avatar.skin || "sticky"];
  var skinTime = (avatar.sent || new Date()) - (avatar.skinUpdate || 0);
  if(skinTime > 200) {
    skin.draw(skin, avatar, ox, oy, avatar.dx, id);
  }
  if(skinTime < 300) {
    var x = canvas_center.x + ox, y = canvas_center.y + oy;
    // Only draw if on-screen
    if (x > -60 && y > -60 &&
	x < (canvas_size.x+60) && y < (canvas_size.y+60)) {
      ctx.save();
      ctx.fillStyle = "rgb(128,128,128)";
      ctx.translate(x+7, y+20);
      var r = skinTime / 30;
      for(i = 0; i < 8; ++i) {
	ctx.fillRect(r,0,r*2,1);
	ctx.rotate(3.1415/4);
      }
      ctx.restore();
    }
  }
}

function updateAvatar(now) {
  var skin = skins[avatar.skin || "sticky"];
  skin.update(skin, now);
}

var avatar = {
  skin: "sticky",
  //x : 11659, y : -1645,  // marioland
  x : -595,
  y : -1494,
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

var load_tiles = function() {
  for_tiles(function(tx, ty, name) {
    if( !bg_tiles[name] ) {
      var bg_tile = loadImage('images/'+name+'.png', function () {
	this.isLoaded = true;
      });
      var scan_tile = loadImage('images/'+name+'-scan.png', function () {
        this.isLoaded = true;
      });
      bg_tiles[name] = bg_tile;
      scan_tiles[name] = scan_tile;
      scan_tile.onerror = function() { scan_tiles[name] = bg_tile; };
    }
  });
};

var getDensity = function (ctx, x, y, w, h, skip) {
  var data = ctx.getImageData(x, y, w, h).data,
      cnt = 0, skip = (skip || 4);
  for (var i=0; i< data.length; i+=skip) {
    cnt += data[i];
  }
  //console.log("cnt:", cnt, data.length);
  return (255-((skip*cnt)/data.length)) / 255;
};

var draw = function() {
  var now = (new Date()).getTime();

  ctx.fillStyle = avatar.y>-1024?"rgb(0,0,0)":"rgb(255,255,255)";
  ctx.fillRect(0, 0, canvas_size.x, canvas_size.y);

  // Draw the background
  load_tiles();

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.font = "10pt Walter Turncoat, Comic Sans, Arial";

  updateAvatar(now);

  drawTiles(ctx, bg_tiles);

  // Draw the other avatars
  for(avatarId in allAvatars) {
    oa = allAvatars[avatarId];
    if(avatarId != clientId && oa.last_update) {
      ox = oa.x - Math.round(avatar.x) + oa.dx * (now - oa.last_update);
      oy = oa.y - Math.round(avatar.y) + oa.dy * (now - oa.last_update);
      drawAvatar(oa, ox, oy, avatarId);
      //console.log("client", avatarId, "at", ox, oy);
    }
  }

  if(! connected) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(0, 0, canvas_size.x, canvas_size.y);
  }
  drawAvatar(avatar, 0, 0, clientId);
};

setInterval(function () {
  if (window.ws && ws.readyState && pending_update) {
    pending_update.sent = (new Date()).getTime();
    ws.send(JSON.stringify(pending_update));
    pending_update = null;
  }
}, send_poll_interval);

var animate = function() {
  draw();
  requestAnimFrame(animate);
};

window.addEventListener('load', function () {
  load_tiles();
  animate();
});

$('#viewport').mousedown(function(e){
  var offset = $('#viewport').offset();
  var x = e.clientX - offset.left;
  var y = e.clientY - offset.top;
  e.preventDefault();
  pulling = true;
  mousepull = {x: (20+canvas_center.x)-x,
               y: (20+canvas_center.y)-y};
  if(x < canvas_center.x+30 &&
     x > canvas_center.x-10 &&
     y < canvas_center.y+60 &&
     y > canvas_center.y+0)
  {
    var slist = Object.keys(skins)
    avatar.skin = slist[(slist.indexOf(avatar.skin)+1)%slist.length];
    avatar.skinUpdate = (new Date()).getTime();
    pending_update = avatar;
  }
});
$('body').mousemove(function(e){
  if(pulling) {
    var offset = $('#viewport').offset();
    var x = e.clientX - offset.left;
    var y = e.clientY - offset.top;
    mousepull = {x: (20+canvas_center.x)-x,
                 y: (20+canvas_center.y)-y};
  }
}).mouseup(function(e){
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

$(document).keydown(function(e){
  if (e.keyCode === 8) {
    e.preventDefault();
  }
});

$(document).keyup(function(e){
  var key = e.keyCode,
      msg = $('#message');
  //console.log("key:", e.keyCode);

  if (messageTimer) {
    clearTimeout(messageTimer);
  }
  messageTimer = setTimeout(messageTimeout, message_time);

  if (key === 8 || key === 46) {
    clearNextMessage = false;
    avatar.msg = avatar.msg.substring(0, avatar.msg.length-1);
    pending_update = avatar;
  }
});


$(document).keypress(function(e){
  var key = e.keyCode, chr = e.charCode,
      msg = $('#message');
  //console.log("char:", chr, String.fromCharCode(e.charCode));
  if (key === 13) {
    clearNextMessage = true;
    var m = /^i am (.*)/i.exec(avatar.msg);
    if(m) {
      avatar.nick = m[1];
      pending_update = avatar;
    }
  } else {
    if (clearNextMessage) {
      clearNextMessage = false;
      avatar.msg = "";
    }
    avatar.msg += String.fromCharCode(chr);
    pending_update = avatar;
  }
});
