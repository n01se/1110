// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
	  window.webkitRequestAnimationFrame || 
	  window.mozRequestAnimationFrame    || 
	  window.oRequestAnimationFrame      || 
	  window.msRequestAnimationFrame     || 
	  function( callback ){
	    window.setTimeout(callback, 1000 / 60);
	  };
})();

var send_poll_interval = 50;
var swing = 2;
var maxSpeed = 0.3; // pixels per ms
var friction = 0.01;
var pullPower = 0.0003;

var clamp = function(x, min, max) {
  return x>min?(x<max?x:max):min;
};

var tilesize = 2048;
var size=[14,48,25,33]; 

var ctx = $('canvas')[0].getContext("2d");
var canvas_size = {x: $('canvas').width(), y: $('canvas').height()};
var name = "1n1w";
var images = {};

var avatar = $('<img src="avatar01.png" />');

var x = -608;
var y = -1483;
var dx = 0;
var dy = 0;
var last_update;

var pulling = false;
var mousepull = {x:0, y:0};

var pending_update = null;

var tile_name=function(x,y){
  return (y>=0?(y+1)+'s':-y+'n')+(x>=0?(x+1)+'e':-x+'w');
}; 

var for_tiles = function(f) {
  var name, url;
  var sx = Math.floor(x / tilesize);
  var sy = Math.floor(y / tilesize);
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

var draw = function() {
  //console.log('draw!');
  var now = (new Date()).getTime();
  last_update = last_update || now;
  x += dx * (now - last_update);
  y += dy * (now - last_update);
  last_update = now;

  ctx.fillStyle = y>-1024?"rgb(0,0,0)":"rgb(255,255,255)";
  ctx.fillRect(0, 0, canvas_size.x, canvas_size.y);

  var ox, oy, oa;
  for_tiles(function(tx, ty, name) {
    if( images[name] && images[name].isLoaded) {
      ox = tx*tilesize-Math.round(x)-370;
      oy = ty*tilesize-Math.round(y)-320;
      if( ox < canvas_size.x && oy < canvas_size.y &&
          ox+tilesize > 0 && oy+tilesize > 0 ) {
        ctx.drawImage(images[name][0], ox, oy);
      }
    }
  });

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.font = "10pt Comic Sans, Arial";
  ctx.save();
  ctx.translate(370,320);
  ctx.rotate(dx*swing);
  ctx.drawImage(avatar[0],0,0);
  if(clientId) ctx.fillText(clientId,0,70);
  ctx.restore();

  for(avatarId in allAvatars) {
    oa = allAvatars[avatarId];
    if(avatarId != clientId && oa.last_update) {
      ox = Math.round(oa.x - x + 370 + oa.dx * (now - oa.last_update));
      oy = Math.round(oa.y - y + 320 + oa.dy * (now - oa.last_update));
      ctx.save();
      ctx.translate(ox,oy);
      ctx.rotate(allAvatars[avatarId].dx*swing);
      ctx.drawImage(avatar[0],0,0);
      ctx.fillText(avatarId,0,70);
      ctx.restore();
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
  dx = applyMousePull(dx, mousepull.x);
  dy = applyMousePull(dy, mousepull.y);
  pending_update = {x: x, y: y, dx: dx, dy: dy};
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
  mousepull = {x: 385-e.clientX, y: 350-e.clientY};
}).mousemove(function(e){
  if(pulling) {
    mousepull = {x: 385-e.clientX, y: 350-e.clientY};
  }
});
$('body').mouseup(function(e){
  pulling = false;
  mousepull = {x:0, y:0};
});
