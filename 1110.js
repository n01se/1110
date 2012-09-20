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

var x = 0;
var y = -1024;

var pulling = false;
var mousepull = {x:0, y:0};

var tile_name=function(x,y){
  //x-=size[3];
  //y-=size[0];
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
  ctx.fillStyle = y>-1024?"rgb(0,0,0)":"rgb(255,255,255)";
  ctx.fillRect(0, 0, canvas_size.x, canvas_size.y);

  var ox, oy;
  for_tiles(function(tx, ty, name) {
    if( images[name] && images[name].isLoaded) {
      ox = tx*tilesize-x;
      oy = ty*tilesize-y;
      if( ox < canvas_size.x && oy < canvas_size.y &&
          ox+tilesize > 0 && oy+tilesize > 0 ) {
        ctx.drawImage(images[name][0], ox, oy);
      }
    }
  });

  ctx.save();
  ctx.translate(325,325);
  ctx.rotate(-mousepull.x/500);
  ctx.translate(-13,-8);
  ctx.drawImage(avatar[0],0,0);
  ctx.restore();
};

// initial draw
load_images();
images['1n1w'].load(draw);
avatar.load(draw);

var pull = function() {
  if(pulling) {
    x += clamp(Math.round(-mousepull.x / 20), -5, 5);
    y += clamp(Math.round(-mousepull.y / 20), -5, 5);
    load_images();
    draw();
    requestAnimFrame(pull);
  }
};

$('canvas').mousedown(function(e){
  pulling = true;
  mousepull = {x: 350-e.clientX, y: 350-e.clientY};
  pull();
}).mousemove(function(e){
  if(pulling) {
    mousepull = {x: 350-e.clientX, y: 350-e.clientY};
  }
});
$('body').mouseup(function(e){
  pulling = false;
  mousepull = {x:0, y:0};
});
