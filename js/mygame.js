window.addEventListener("load",function() {
  var Q = window.Q = Quintus({ development: true, audioSupported: [ 'wav','mp3','ogg' ] })
    .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio")
    .setup("slidermap",{ maximize: true }).controls(true).touch().enableSound();;

  // Add in the default keyboard controls
  // along with joypad controls for touch
  Q.input.keyboardControls();
  Q.input.joypadControls();

  Q.gravityX = 0;
  Q.gravityY = 0;

  var SPRITE_PLAYER = 1;
  var SPRITE_TILES = 2;
  var SPRITE_ENEMY = 4;
  var SPRITE_DOT = 8;

  Q.Sprite.extend("Player", {
    init: function(p) {
      this._super(p,{
        sheet: "player",
        sprite: "player",
//        direction: "right",
        stepDistance: 32, // should be tile size
        stepDelay: 0.9,  // seconds to delay before next step
        type: SPRITE_PLAYER,
        collisionMask: SPRITE_TILES | SPRITE_ENEMY | SPRITE_DOT,
        speed:100,
        score:0
      });
      this.add("2d, stepControls, animation");

      this.on("hit.sprite",function(collision) {
        if(collision.obj.isA("Portal")) {
          var portal = collision.obj;
          this.destroy();
          this.resetLevel();
          Q.stageScene("endLevel",1, { label: portal.nextLevel, btnText: "»" });

        }
        if(collision.obj.isA("Dot")) {
          var portal = collision.obj;
          this.p.score += 1;
          Q.stageScene('hud', 1, this.p);
          Q.audio.play('coin.mp3');
        }
      });
    },
    resetLevel: function() {
      this.p.score = 0;
      Q.stageScene('hud', 1, this.p);
    },
    step: function(){
      if(this.p.vx > 0) { this.play("walk_right"); }
      else if(this.p.vx < 0) { this.play("walk_left"); }
      else if(this.p.vy > 0) { this.play("walk_down"); }
      else if(this.p.vy < 0) { this.play("walk_up"); }
      else if(this.p.vx == 0 && this.p.vy == 0 && this.p.direction == "left"){ this.play("stand_left"); }
      else if(this.p.vx == 0 && this.p.vy == 0 && this.p.direction == "right"){ this.play("stand_right"); }
      else if(this.p.vx == 0 && this.p.vy == 0 && this.p.direction == "down"){ this.play("stand_down"); }
      else if(this.p.vx == 0 && this.p.vy == 0 && this.p.direction == "up"){ this.play("stand_up"); }

      this.p.direction = Q.inputs['left']  ? 'left' : Q.inputs['right'] ? 'right' :
                         Q.inputs['up']    ? 'up'   : Q.inputs['down']  ? 'down'  : this.p.direction;

      switch(this.p.direction) {
        case "left":  this.p.vx = -this.p.speed; break;
        case "right": this.p.vx = this.p.speed; break;
        case "up":    this.p.vy = -this.p.speed; break;
        case "down":  this.p.vy = this.p.speed; break;
      }
    }
  });

  Q.Sprite.extend("Enemy", {
    init: function(p) {
      this._super(p,{
        sheet:"enemy",
        sprite: "enemy",
        type: SPRITE_ENEMY,
        switchPercent: 100,
        speed: 100,
        collisionMask: SPRITE_PLAYER | SPRITE_TILES
      });
      this.add("2d, enemyControls, animation");
      this.on("hit.sprite",function(collision) {
        if(collision.obj.isA("Player")) {
          Q.stageScene("endGame");
        }
      });
    }
  });
  Q.component("enemyControls", {

    added: function() {
      var p = this.entity.p;
      Q._defaults(p,this.defaults);
      this.entity.on("step",this,"step");
      this.entity.on('hit',this,"changeDirection");
    },

    step: function(dt) {
      var p = this.entity.p;
      if(Math.random() < p.switchPercent / 100) {
        this.tryDirection();
      }
      switch(p.direction) {
        case "left": p.vx = -p.speed; break;
        case "right":p.vx = p.speed; break;
        case "up":   p.vy = -p.speed; break;
        case "down": p.vy = p.speed; break;
      }
      this.entity.play("walk_"+ p.direction);
    },
    tryDirection: function() {
      var p = this.entity.p;
      var rnd = Math.random();
      if(p.vy != 0 && p.vx == 0) {
        p.direction = rnd < 0.5 ? 'left' : 'right';
      } else if(p.vx != 0 && p.vy == 0) {
        p.direction = rnd < 0.5 ? 'up' : 'down';
      }
    },
    changeDirection: function(collision) {
      var p = this.entity.p;
      var rnd = Math.random();
      if(p.vx == 0 && p.vy == 0) {
        if(collision.normalY) {
          p.direction = rnd < 0.5 ? 'left' : 'right';
        } else if(collision.normalX) {
          p.direction = rnd < 0.5 ? 'up' : 'down';

        }
      }
    }
  });

  // Create the Dot sprite
  Q.Sprite.extend("Dot", {
    init: function(p) {
      this._super(p,{
        sheet: 'dot',
        type: SPRITE_DOT,
        sensor: true
      });
      this.on("sensor");
     /*this.on("inserted");*/
    },
    sensor: function() {
//      Destroy it and keep track of how many dots are left
      var xx = (this.p.x-16)/32;
      var yy = (this.p.y-16)/32;
      this.destroy();
      /*var pp = new Q.SoldierMap();
      pp.stage.insert(new Q['Floor'](Q.tilePos(xx,yy)));*/
    }
  });

  Q.Sprite.extend("Portal", {
    init: function(p, nextLevel) {
      this._super(p, {
        sheet: 'portal'
      });
      this.nextLevel = nextLevel;
    }
  });
  Q.Sprite.extend("Floor", { init: function(p) { this._super(p, { sheet: 'floor', sensor: true }); } });
  Q.Sprite.extend("FloorTwo", { init: function(p) { this._super(p, { sheet: 'floortwo', sensor: true }); } });
  Q.Sprite.extend("FloorThree", { init: function(p) { this._super(p, { sheet: 'floorthree', sensor: true }); } });
  Q.Sprite.extend("StairVer", { init: function(p) { this._super(p, { sheet: 'stairver', sensor: true }); } });
  Q.Sprite.extend("StairHor", { init: function(p) { this._super(p, { sheet: 'stairhor', sensor: true }); } });
  Q.Sprite.extend("StairDig", { init: function(p) { this._super(p, { sheet: 'stairdig', sensor: true }); } });
  Q.Sprite.extend("MesaOne", { init: function(p) { this._super(p, { sheet: 'mesaone' }); } });
  Q.Sprite.extend("MesaTwo", { init: function(p) { this._super(p, { sheet: 'mesatwo' }); } });


  // Return a x and y location from a row and column
  // in our tile map
  Q.tilePos = function(col,row) {
    return { x: col*32 + 16, y: row*32 + 16 };
  }

  Q.TileLayer.extend("SoldierMap",{
    init: function(p) {
      this._super(p,{
        type: SPRITE_TILES,
        dataAsset: 'level2.json',
        sheet:     'tiles'
      });
    },
    setup: function() {
      // Clone the top level arriw
      var tiles = this.p.tiles = this.p.tiles.concat();
      var size = this.p.tileW;
      for(var y=0;y<tiles.length;y++) {
        var row = tiles[y] = tiles[y].concat();
        for(var x =0;x<row.length;x++) {
          var tile = row[x];
          if(tile == 4 || tile == 11 ) {
            var className3 = tile == 4 ? 'Floor' : 'FloorThree';
            this.stage.insert(new Q[className3](Q.tilePos(x,y)));
            row[x] = 0;
          }else if( tile == 6 ||  tile == 5 ){
            var className2 = tile == 6 ? 'StairVer' : 'StairHor';
            this.stage.insert(new Q[className2](Q.tilePos(x,y)));
            row[x] = 0;
          }else if( tile == 7 || tile == 8 ){
            var className1 = tile == 7 ? 'StairDig' : 'FloorTwo';
            this.stage.insert(new Q[className1](Q.tilePos(x,y)));
            row[x] = 0;
          }else  if( tile == 9 || tile == 10 ){
            var className = tile == 9 ? 'MesaOne' : 'MesaTwo';
            this.stage.insert(new Q[className](Q.tilePos(x,y)));
            row[x] = 0;
          }
//          else if( tile == 25 ){
//            var dot = new Q['Dot'](Q.tilePos(x,y));
//            this.stage.insert(new Q['Dot'](Q.tilePos(x,y)));
//            row[x] = 0;
//          }
        }
      }
    }
  });

  Q.scene("Nivel 1",function(stage) {

    stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));
    var map = stage.collisionLayer(new Q.SoldierMap({
      type: SPRITE_TILES,
      dataAsset: 'level.json',
      sheet:     'tiles'
    }));
    map.setup();
    var player = new Q.Player(Q.tilePos(1,2));
    stage.add("viewport").follow(stage.insert(player));
    stage.insert(new Q.Dot(Q.tilePos(2,2)));
    stage.insert(new Q.Dot(Q.tilePos(4,2)));
    stage.insert(new Q.Dot(Q.tilePos(6,2)));
    stage.insert(new Q.Enemy(Q.tilePos(17,2)));
    stage.insert(new Q.Portal(Q.tilePos(13,16),"Nivel 2"));
   // Q.audio.play('intro.mp3',{ loop: true });
  });

  Q.scene("Nivel 2",function(stage) {
    stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));
    var map = stage.collisionLayer(new Q.SoldierMap({
      type: SPRITE_TILES,
      dataAsset: 'level1.json',
      sheet:     'tiles'
    }));
    map.setup();
    Q.stageScene('hud', 1, Q['Player'].p);
    var player = new Q.Player(Q.tilePos(1,2));
    stage.add("viewport").follow(stage.insert(player));
    stage.insert(new Q.Portal(Q.tilePos(13,16),"Nivel 3"));
   // Q.audio.play('intro.mp3',{ loop: true });
  });

  Q.scene("Nivel 3",function(stage) {
    stage.insert(new Q.Repeater({ asset: "sea.png", speedX: 0.5, speedY: 0.5 }));
    var map = stage.collisionLayer(new Q.SoldierMap({
      type: SPRITE_TILES,
      dataAsset: 'level2.json',
      sheet:     'tiles'
    }));
    map.setup();
    Q.stageScene('hud', 1, Q['Player'].p);
    var player = new Q.Player(Q.tilePos(1,2),{hitPoints: 0});
    stage.add("viewport").follow(stage.insert(player));
    stage.insert(new Q.Portal(Q.tilePos(14,15),"Nivel 1"));
   // Q.audio.play('intro.mp3',{ loop: true });
  });

  Q.scene('hud',function(stage) {
    var container = stage.insert(new Q.UI.Container({
      x: Q.width/2, y: 20, fill: "rgba(24,24,24,.8)", radius: 20
    }));
    if(stage.options.score == 0 || stage.options.score === undefined ){
      stage.options.score = 0;
    }
    var label = container.insert(new Q.UI.Text({
      x:0,
      y: 0,
      color: "white",
      family: "'Bangers', cursive",
      textBaseline: "alphabetic",
      label: "Balas: " + stage.options.score
    }));
    container.fit(20,15);
  });

  Q.scene("endLevel",function(stage) {
    var container = stage.insert(new Q.UI.Container({
      x: Q.width/2,
      y: Q.height/2,
      fill: "rgb(16,16,16)"
    }));

    var button = container.insert(new Q.UI.Button({
      x: 0,
      y: 10,
      radius: 25,
      fill: "rgba(116,116,116,.8)",
      font: "100 45px 'Bangers', cursive",
      fontColor: "#f6e8db",
      label: stage.options.btnText
    }));
    var label = container.insert(new Q.UI.Text({
      x:0,
      y: -5 - button.p.h,
      color: "white",
      family: "'Bangers', cursive",
      label: stage.options.label+ "  Go!"
    }));
    // When the button is clicked, clear all the stages
    // and restart the game.
    button.on("click",function() {
      Q.clearStages();
      Q.stageScene(stage.options.label);
    });

    container.fit(Q.width,Q.height);
  });

  Q.load(
    "sprites.png, tiles.png, background-wall.png, sea.png, " +
    "sprites.json, level.json, level1.json, floor.json, level2.json,  " +
    "gamestart.mp3, coin.mp3, intro.mp3",
    function() {
      Q.sheet("tiles","tiles.png", { tileW: 32, tileH: 32});
      Q.compileSheets("tiles.png","floor.json");
      Q.compileSheets("sprites.png","sprites.json");
      var step = {
        walk_right: { frames: [6,7,8], rate: 1/3, flip: false, loop: true },
        walk_left:  { frames: [6,7,8], rate: 1/3, flip: "x",   loop: true },
        walk_up:    { frames: [3,4,5], rate: 1/3, flip: false, loop: true },
        walk_down:  { frames: [0,1,2], rate: 1/3, flip: false, loop: true },
        stand_up:   { frames: [4], rate: 1/10, flip: false },
        stand_down: { frames: [1], rate: 1/10, flip: false },
        stand_right:{ frames: [7], rate: 1/10, flip: false },
        stand_left: { frames: [7], rate: 1/10, flip:"x" }
      };
      Q.animations('player', step);
      Q.animations('enemy', step);
      Q.stageScene('hud', 1, Q['Player'].p);
      Q.stageScene("Nivel 1");
  });

});
