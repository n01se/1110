var send_poll_interval = 150;
var swing = 2;
var friction = 0.01;
var pullPower = 0.0003;
var message_time = 15000;
var msgWrapWidth = 30;
var collide_bounce = 0.0;
var idleTime1 = 30; // seconds
var idleTime2 = 15; // seconds

var clamp = function(x, min, max) {
  return x>min?(x<max?x:max):min;
};

var roundAt = function(num, places) {
  return Math.round(num*Math.pow(10,places))/Math.pow(10,places);
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
  for_tiles(function(tx, ty, name) {
    if( tileset[name] && tileset[name].isLoaded) {
      var ox = tx*tilesize-Math.round(avatar.x)-canvas_center.x;
      var oy = ty*tilesize-Math.round(avatar.y)-canvas_center.y;
      if( ox < canvas_size.x && oy < canvas_size.y &&
          ox+tilesize > 0 && oy+tilesize > 0 ) {
        ctx.drawImage(tileset[name], ox, oy);
      }
    }
  });
};

var centerText = function(text, y) {
  if(text) {
    var lines = (""+text).split(/\n(?=.)/);
    $.each(lines, function(i, line) {
      ctx.fillText(line,
          -(ctx.measureText(line).width/2),
          y - (15 * (lines.length - i - 1)));
    });
  }
}

var serverSkins = {
  warp: {
    width: 50,
    height: 50,
    duration: 800,
    draw: function(skin, avatar, id, msg) {
      var color;
      var p = ((new Date()) - avatar._last_update) / skin.duration;
      if(p>1) {
        delete allAvatars[id];
      }
      else {
        if(avatar.also) {
          var also = skins[avatar.also];
          also.draw(also, avatar, id);
        }
        var alpha = Math.sin(p * Math.PI / 2);
        for(var i = 0; i < 100; ++i) {
          color = Math.random() < 0.5 ? "255,255,255" : "0,0,0";
          ctx.fillStyle = "rgba(" + color + "," + alpha + ")";
          ctx.fillRect((Math.random()-0.5)*skin.width,
              (Math.random()-0.5)*skin.height + 20,
              1,
              (Math.random()-0.5)*skin.height);
        }
      }
    }
  }
};

var skins = {
  ghost: {
    imgs: { left: loadImage("images/ghost-left.png"),
            right: loadImage("images/ghost-right.png") },
    width: 50,
    height: 57,
    maxSpeed: 0.1, // pixels per ms
    draw: function (skin, avatar, id, msg) {
	ctx.fillStyle = "rgb(128,128,128)";
	centerText(avatar.msg, -10);
	centerText(avatar.nick || id, 50);
	ctx.save();
        ctx.scale(0.7, 0.7);
	ctx.drawImage((avatar.dx||avatar.last_dx)<0?skin.imgs.left:skin.imgs.right, -skin.width/2, -5);
	ctx.restore();
    },
    update: function(skin, now) {
      avatar.dx = roundAt(applyMousePull(avatar.dx, mousepull.x, skin.maxSpeed), 4);
      avatar.dy = roundAt(applyMousePull(avatar.dy, mousepull.y, skin.maxSpeed), 4);

      avatar._last_update = avatar._last_update || now;
      var dx = avatar.dx * (now - avatar._last_update),
	  dy = avatar.dy * (now - avatar._last_update);

      avatar.x = roundAt(avatar.x + dx, 1);
      avatar.y = roundAt(avatar.y + dy, 1);
      if(dx != 0) {
        avatar.last_dx = roundAt(dx, 3);
      }
      avatar._last_update = now;
    }
  },
  sticky: {
    img: loadImage("images/avatar01.png"),
    width: 26,
    height: 57,
    maxSpeed: 0.3,
    draw: function (skin, avatar, id, msg) {
	ctx.fillStyle = "rgb(128,128,128)";
	centerText(avatar.msg, -10);
	ctx.rotate(avatar.dx*swing);
	ctx.drawImage(skin.img,-skin.width/2,-5);
	centerText(avatar.nick || id, 70);
    },
    update: function(skin, now) {
      avatar.dx = roundAt(applyMousePull(avatar.dx, mousepull.x, skin.maxSpeed), 4);
      avatar.dy = roundAt(applyMousePull(avatar.dy, mousepull.y, skin.maxSpeed) + (avatar.y > -25000 ? -0.008 : 0), 4);

      avatar._last_update = avatar._last_update || now;
      var dx = avatar.dx * (now - avatar._last_update),
	  dy = avatar.dy * (now - avatar._last_update);

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
	  avatar.dx = roundAt(-avatar.dx * collide_bounce, 4);
	  dx = -dx * collide_bounce;
	}
	if (xDensity2 > (0.40 * (aw/(ah+aw))) && yDensity1 < yDensity2) {
	  avatar.dy = roundAt(-avatar.dy * collide_bounce, 4);
	  dy = -dy * collide_bounce;
	}
      }

      avatar.x = roundAt(avatar.x + dx, 1);
      avatar.y = roundAt(avatar.y + dy, 1);
      avatar._last_update = now;
    }
  }
};

function drawAvatar(avatar, id) {
  var skin = skins[avatar.skin || "sticky"] || serverSkins[avatar.skin];
  if (!skin) {
    return;
  }
  var x = canvas_center.x + avatar._x, y = canvas_center.y + avatar._y;
  // Only draw if on-screen
  if (x > -60 && y > -60 &&
      x < (canvas_size.x+60) && y < (canvas_size.y+60)) {
    var skinTime = (new Date()) - (avatar._skinUpdate || 0);
    if(skinTime > 200) { // draw avatar
      ctx.save();
      ctx.translate(x, y);
      skin.draw(skin, avatar, id);
      ctx.restore();
    }
    if(skinTime < 300) { // drop pop animation
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
  else if(avatar.temp) {
    // offscreen temp avatars should be safe to clean up
    delete allAvatars[id];
  }
}

function updateAvatar(now) {
  var skin = skins[avatar.skin || "sticky"];
  if (!skin) {
    return;
  }
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
  _x: 0,
  _y: 0,
  _last_update : 0};

var pulling = false;
var mousepull = {x:0, y:0};

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
  var basex = Math.round(avatar.x);
  var basey = Math.round(avatar.y);
  var oa, ox, oy;
  for(avatarId in allAvatars) {
    if(avatarId != clientId) {
      oa = allAvatars[avatarId];
      oa._x = oa.x + (oa.dx || 0) * (now - oa._last_update) - basex;
      oa._y = oa.y + (oa.dy || 0) * (now - oa._last_update) - basey;
      drawAvatar(oa, avatarId);
      //console.log("client", avatarId, "at", ox, oy);
    }
  }

  if(! connected) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(0, 0, canvas_size.x, canvas_size.y);
  }
  drawAvatar(avatar, clientId);
};


var oldAvatar = {};
setInterval(function () {
  if (window.ws && ws.readyState) {
    var msg = {};
    for(var key in avatar) {
      if (key[0] !== "_" &&
          (avatar[key] !== oldAvatar[key])) {
        msg[key] = avatar[key];
      }
    }
    if (Object.keys(msg).length) {
      ws.send(JSON.stringify(msg));
    }
    oldAvatar = $.extend({}, avatar)
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

var idleTimeout, idleWarning;
var idle1 = function() {
  if(connected) {
      idleWarning = true;
      $('#message').html("You have been idle for " + idleTime1 + " seconds. To reduce server load,<br>" +
              "if you don't act within " + idleTime2 + " seconds, you will be disconnected.")
        .css("background", "red");
      idleTimeout = setTimeout(idle2, idleTime2 * 1000);
  }
};
var idle2 = function() {
  if(connected) {
    idleWarning = false;
    ws.close();
  }
};
var clearIdle = function() {
  clearTimeout(idleTimeout);
  idleTimeout = null;
  if(idleWarning) {
    $('#message').html("");
    idleWarning = false;
  }
};
var restartIdle = function() {
  if(idleTimeout) clearIdle();
  idleTimeout = setTimeout(idle1, idleTime1 * 1000);
};
restartIdle();


$('#viewport').mousedown(function(e){
  restartIdle();
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
    avatar._skinUpdate = (new Date()).getTime();
  }
});
$('body').mousemove(function(e){
  if(pulling) {
    restartIdle();
    var offset = $('#viewport').offset();
    var x = e.clientX - offset.left;
    var y = e.clientY - offset.top;
    mousepull = {x: (20+canvas_center.x)-x,
                 y: (20+canvas_center.y)-y};
  }
}).mouseup(function(e){
  restartIdle();
  pulling = false;
  mousepull = {x:0, y:0};
});


// Key/message handling

var messageTimer = null;

var messageTimeout = function () {
      messageTimer = null;
      avatar.msg = "";
};

$(document).keydown(function(e){
  restartIdle();
  if (e.keyCode === 8 || e.keyCode === 46) {
    e.preventDefault();
    avatar.msg = avatar.msg.substring(0, avatar.msg.length-1);
  }
});

$(document).keyup(function(e){
  restartIdle();
  var key = e.keyCode,
      msg = $('#message');
  //console.log("key:", e.keyCode);

  if (messageTimer) {
    clearTimeout(messageTimer);
  }
  messageTimer = setTimeout(messageTimeout, message_time);
});


$(document).keypress(function(e){
  restartIdle();
  var key = e.keyCode, chr = e.charCode,
      msg = $('#message');
  //console.log("char:", chr, String.fromCharCode(e.charCode));
  if(chr === 13) { chr = 10; }
  else if(chr === 32 && avatar.msg.length - avatar.msg.lastIndexOf('\n') > msgWrapWidth) {
    // autowrap
    chr=10;
  }
  avatar.msg += String.fromCharCode(chr);
  var m = /(?:^|\n)i am (.*)\n/i.exec(avatar.msg);
  if(m) { avatar.nick = m[1]; }
  avatar.msg = /(?:.*\n){0,2}.*\n?$/.exec(avatar.msg)[0]; // limit 3 lines
});
