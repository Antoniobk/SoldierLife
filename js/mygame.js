window.addEventListener("load",function() {

  var Q = window.Q = Quintus({ development: true, audioSupported: [ 'wav','mp3','ogg' ] })
    .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio")
    .setup("slidermap",{ maximize: true }).controls(true).touch().enableSound();;

  Q.input.keyboardControls();
  Q.input.joypadControls();

  Q.gravityY = 0;
  Q.gravityX = 0;

  var SPRITE_PLAYER = 1;
  var SPRITE_TILES = 2;
  var SPRITE_ENEMY = 4;
  var SPRITE_DOT = 8;
  var SPRITE_PBULLET = 16;
  var SPRITE_FLOOR = 32;
  var SPRITE_STAIRS = 64;
  var col_bullet = true;

  // People
  Q.Sprite.extend("Player", {
    init: function(p, sheetplayer) {
      this._super(p,{
        sheet: "player",
        sprite: "player",
        stepDelay: 0.8,  // seconds to delay before next step
        type: SPRITE_PLAYER,
        collisionMask: SPRITE_TILES | SPRITE_ENEMY | SPRITE_DOT,
        speed: 85,
        score:0
      });
      this.p.sheet = sheetplayer;
      this.add("2d, animation");
      Q.input.on("fire", this, function(){
        var xx = this.p.x , yy = this.p.y;
        if(this.p.direction=='left'){ xx -=8; } else
        if(this.p.direction=='right'){ xx +=8; } else
        if(this.p.direction=='up'){yy -=15;xx-=1;} else
        if(this.p.direction=='down'){yy +=15;}
        if(col_bullet){
          this.stage.insert(
            new Q.Bullet({
              type: SPRITE_PBULLET,
              direction: this.p.direction,
              x: xx,
              y: yy,
              speed: 200,
              collisionMask: SPRITE_ENEMY | SPRITE_TILES
            })
          );
          col_bullet=false;
        }

      });
      this.on("hit.sprite",function(collision) {
        if(collision.obj.isA("Portal")) {
          var portal = collision.obj;
          this.destroy();
//          this.resetLevel();
          Q.stageScene("endLevel",1, { label: portal.nextLevel });
        }
//        else if(collision.obj.isA("Dot")) {
//          this.p.pBullet += 1;
//          Q.stageScene('hud', 1, this.p);
//          Q.audio.play('coin.mp3');
//        }
        else if(collision.obj.isA("Enemy")){
          Q.audio.play('Game_Over.mp3',{loop:false});
          this.destroy();
          var lvl = new Q.stage();
          Q.stageScene("endLevel",1, { label: lvl.scene.name });
        }
      });
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

  Q.Sprite.extend("Bullet", {
    init: function (p) {
      this._super(p, {
        type: SPRITE_PBULLET,
        sheet: 'fire',
        direction: 'left',
        speed: 350,
        collisionMask: SPRITE_ENEMY | SPRITE_TILES | SPRITE_STAIRS
      });
      this.add("2d");
      this.on("hit.sprite",function(collision) { if(collision.obj.isA("Enemy")) { this.destroy(); col_bullet=true; } });
      this.on("hit",function(){ this.destroy(); col_bullet=true; });
    },
    step: function (dt) {
      if(this.p.direction == "left") {
        this.p.angle = 0;
      } else if(this.p.direction == "right") {
        this.p.angle = -180;
      } else if(this.p.direction == "up") {
        this.p.angle = 90;
      } else if(this.p.direction == "down") {
        this.p.angle = -90;
      }
      switch(this.p.direction) {
        case "left":  this.p.vx = -this.p.speed;  break;
        case "right": this.p.vx = this.p.speed; break;
        case "up":    this.p.vy = -this.p.speed; break;
        case "down":  this.p.vy = this.p.speed; break;
      }
    },
    hit: function(){
      this.destroy();
    }
  });
  Q.Sprite.extend("Enemy", {
    init: function(p) {
      this._super(p,{
        sprite: "enemy",
        sheet:"enemy",
        type: SPRITE_ENEMY,
        collisionMask: SPRITE_PLAYER | SPRITE_TILES | SPRITE_PBULLET | SPRITE_STAIRS,
        edestroy: false
      });
      this.add("2d, enemyControls, animation");
      this.on("hit.sprite",function(collision) {
        this.on("died", this, "playDead");
        if(collision.obj.isA("Bullet")){
          Q.audio.play('fire.mp3');
          this.play("die");
          this.p.edestroy = true;
        }
      });
    }, playDead: function () {
      this.destroy();
    }
  });
  Q.component("enemyControls", {
    defaults: { speed: 95, direction: 'left', switchPercent: 8 },
    added: function() {
      var p = this.entity.p;
      Q._defaults(p,this.defaults);
      this.entity.on("step",this,"step");
      this.entity.on('hit',this,"changeDirection");
    },
    step: function(dt) {
      var p = this.entity.p;
      if(!p.edestroy){
        if(Math.random() < p.switchPercent / 100) { this.tryDirection(); }
        switch(p.direction) {
          case "left": p.vx = -p.speed; this.entity.play("walk_left"); break;
          case "right":p.vx = p.speed; this.entity.play("walk_right"); break;
          case "up":   p.vy = -p.speed; this.entity.play("walk_up"); break;
          case "down": p.vy = p.speed; this.entity.play("walk_down"); break;
        }
      }else {
        p.vx=0;p.vy=0;
      }
    },
    tryDirection: function() {
      var p = this.entity.p;
      if(p.vy != 0 && p.vx == 0) {
        p.direction = Math.random() < 0.5 ? 'left' : 'right';
      } else if(p.vx != 0 && p.vy == 0) {
        p.direction = Math.random() < 0.5 ? 'up' : 'down';
      }
    },
    changeDirection: function(collision) {
      var p = this.entity.p;
      if(p.vx == 0 && p.vy == 0) {
        if(collision.normalY) {
          p.direction = Math.random() < 0.5 ? 'left' : 'right';
        } else if(collision.normalX) {
          p.direction = Math.random() < 0.5 ? 'up' : 'down';
        }
      }
    }
  });

  Q.Sprite.extend("Portal", {
    init: function(p, nextLevel,sheetPortal) {
      this._super(p, {
        sheet: 'portal'
      });
      this.nextLevel = nextLevel;
      this.p.sheet = sheetPortal;
    }
  });

  //Map
  Q.tilePos = function(col,row) {
    return { x: col*32 + 16, y: row*32 + 16 };
  }
  //draw map
  Q.Sprite.extend("Floor", { init: function(p) { this._super(p, { type: SPRITE_FLOOR, sheet: 'floor' }); } });
  Q.Sprite.extend("Floor1", { init: function(p) { this._super(p, { type: SPRITE_FLOOR, sheet: 'floor1' }); } });
  Q.Sprite.extend("Floor2", { init: function(p) { this._super(p, { type: SPRITE_FLOOR, sheet: 'floor2' }); } });
  Q.Sprite.extend("Ice1", { init: function(p) { this._super(p, { type: SPRITE_FLOOR, sheet: 'ice1' }); } });
  Q.Sprite.extend("Ice2", { init: function(p) { this._super(p, { type: SPRITE_FLOOR, sheet: 'ice2' }); } });
  Q.Sprite.extend("Icestep", { init: function(p) { this._super(p, { type: SPRITE_STAIRS, sheet: 'icestep' }); } });
  Q.Sprite.extend("Greenstep", { init: function(p) { this._super(p, { type: SPRITE_STAIRS, sheet: 'greenstep' }); } });
  Q.TileLayer.extend("SoldierMap",{
    init: function(p) {
      this._super(p,{
        type: SPRITE_TILES,
        dataAsset: 'level.json',
        sheet:     'tiles'
      });
    },
    setup: function() {
      var tiles = this.p.tiles = this.p.tiles.concat();
      var size = this.p.tileW;
      for(var y=0;y<tiles.length;y++) {
        var row = tiles[y] = tiles[y].concat();
        for(var x =0;x<row.length;x++) {
          var tile = row[x];
          var className, _step;
          if(tile == 0) {
            if(this.p.sheet == "tiles"){ floor = "Floor"}
            else if(this.p.sheet == "tiles1") { floor = "Floor1"}
            else if(this.p.sheet == "tiles2") { floor = "Floor2"}
            this.stage.insert(new Q[floor](Q.tilePos(x,y)));
            row[x] = 0;
          }else if(tile == 98 || tile == 97) {
            className = tile == 97 ? "Ice1" : "Ice2";
            this.stage.insert(new Q[className](Q.tilePos(x,y)));
            row[x] = 0;
          }else if(tile == 95) {
            if(this.p.sheet == "tiles1") { _step = "Icestep"}
            else if(this.p.sheet == "tiles2") { _step = "Greenstep"}
            this.stage.insert(new Q[_step](Q.tilePos(x,y)));
            row[x] = 0;
          }
        }
      }
    }
  });


  Q.scene("Nivel 1",function(stage) {
    stage.insert(new Q.Repeater({ asset: "bg-nivel3.png"}));
    var mp = stage.collisionLayer(new Q.SoldierMap({
      type: SPRITE_TILES,
      dataAsset: 'level2.json',
      sheet:     'tiles2'
    }));
    mp.setup();
    var _enemy = [
      [4,1],[19,1],[5,6],[5,9],[5,13],[18,6],[18,9],
      [18,13],[6,20],[10,20],[13,20],[17,20],[6,26],[18,26]
    ];
//    Q.stageScene('hud', 1, Q['Player'].p);
    var player = new Q.Player(Q.tilePos(12,2),"player2");
    for( var i = 0 ; i < _enemy.length; i++ ){
      stage.insert( new Q.Enemy( Q.tilePos(_enemy[i][0],_enemy[i][1]) ) );
    }
    stage.add("viewport").follow(stage.insert(player));
    stage.insert(new Q.Portal(Q.tilePos(11,30),"Nivel 2","portal2"));
  });
  Q.scene("Nivel 2",function(stage) {
    stage.insert(new Q.Repeater({ asset: "bg-nivel1.png"}));
    var mp = stage.collisionLayer(new Q.SoldierMap({
      type: SPRITE_TILES,
      dataAsset: 'level1.json',
      sheet:     'tiles'
    }));
    mp.setup();
    var _enemy = [
      [4,8],[8,8],[2,12],[11,13],[3,20],[9,20],[17,2],[26,2],[17,19],
      [26,19],[16,10],[26,10],[31,8],[35,8],[31,12],[35,12]
    ];
    var player = new Q.Player(Q.tilePos(6,1),"player1");
    stage.add("viewport").follow(stage.insert(player));
    for( var i = 0 ; i < _enemy.length; i++ ){
      stage.insert( new Q.Enemy( Q.tilePos(_enemy[i][0],_enemy[i][1]) ) );
    }
    stage.insert(new Q.Portal(Q.tilePos(33,17),"Nivel 3","portal"));
    // Q.audio.play('intro.mp3',{ loop: true });
  });
  Q.scene("Nivel 3",function(stage) {
    stage.insert(new Q.Repeater({ asset: "bg-nivel2.png"}));
    var mp = stage.collisionLayer(new Q.SoldierMap({
      type: SPRITE_TILES,
      dataAsset: 'level.json',
      sheet:     'tiles1'
    }));
    mp.setup();
    var _enemy = [
      [1,1],[5,5],[17,1],[23,5],[9,7],[15,7],[6,14],[6,22],[18,22],[1,23],
      [23,23],[1,26],[23,26],[1,34],[23,34],[1,55],[23,55],[9,59],[15,59]
    ];
    var player = new Q.Player(Q.tilePos(12,2),"player3");
    stage.add("viewport").follow(stage.insert(player));
    for( var i = 0 ; i < _enemy.length; i++ ){
      stage.insert( new Q.Enemy( Q.tilePos(_enemy[i][0],_enemy[i][1]) ) );
    }
    stage.insert(new Q.Portal(Q.tilePos(14,30),"Nivel 1","portal1"));
    // Q.audio.play('intro.mp3',{ loop: true });
  });
//  Q.scene('hud',function(stage) {
//    var container = stage.insert(new Q.UI.Container({
//      x: Q.width/2, y: 20, fill: "rgba(24,24,24,.8)", radius: 20
//    }));
//
//    if(stage.options.pBullet == 0 || stage.options.pBullet === undefined ){
//      stage.options.pBullet = 0;
//    }
//    var label = container.insert(new Q.UI.Text({
//      x:0,
//      y: 0,
//      color: "white",
//      family: "'Hanalei Fill', cursive",
//      textBaseline: "alphabetic",
//      label: "Bullet: " + stage.options.pBullet
//    }));
//    container.fit(20,15);
//  });

  Q.scene("endLevel",function(stage) {
    var container = stage.insert(new Q.UI.Container({
      x: Q.width/2,
      y: Q.height/2,
      fill: "rgb(16,16,16)"
    }));
    var button = container.insert(new Q.UI.Button({
      asset:"btn-start.png",
      x: 0,
      y: 10,
      radius: 25,
      fill: "rgba(116,116,116,.8)",
      font: "100 45px 'Hanalei Fill', cursive",
      fontColor: "#f6e8db",
      label: stage.options.btnText
    }));
    var label = container.insert(new Q.UI.Text({
      x:0,
      y: -5 - button.p.h,
      color: "white",
      family: "'Hanalei Fill', cursive",
      label: stage.options.label+ "  Go!"
    }));
    button.on("click",function() {
      Q.clearStages();
      Q.stageScene(stage.options.label);
    });
    container.fit(Q.width,Q.height);
  });
  //GameStart
  Q.load("sprite.png, background-wall.png, tiles.png, btn-start.png, pisos.png, " +
    "bg-nivel1.png, bg-nivel2.png, bg-nivel3.png, soldier.png, tiles1.png, tiles2.png, " +
    "sprites.json, level.json, level1.json, level2.json, pisos.json, soldier.json, " +
    "gamestart.mp3, coin.mp3, intro.mp3, fire.mp3, Game_Over.mp3",
    function() {
      Q.sheet("tiles","tiles.png", { tileW: 32, tileH: 32 });
      Q.sheet("tiles1","tiles1.png", { tileW: 32, tileH: 32 });
      Q.sheet("tiles2","tiles2.png", { tileW: 32, tileH: 32 });
      Q.sheet("pisos","pisos.png", { tileW: 32, tileH: 32 });
      var stepPlayer = {
        walk_right: { frames: [6,7,8], rate: 1/3, flip: false, loop: true },
        walk_left:  { frames: [6,7,8], rate: 1/3, flip: "x",   loop: true },
        walk_up:    { frames: [3,4,5], rate: 1/3, flip: false, loop: true },
        walk_down:  { frames: [0,1,2], rate: 1/3, flip: false, loop: true },
        stand_up:   { frames: [4], rate: 1/10, flip: false },
        stand_down: { frames: [1], rate: 1/10, flip: false },
        stand_right:{ frames: [7], rate: 1/10, flip: false },
        stand_left: { frames: [7], rate: 1/10, flip:"x" }
      };
      var stepEnemy = {
        walk_right:  { frames: [1], rate: 1/3, flip: false, loop: false },
        walk_left:   { frames: [2], rate: 1/3, flip: false, loop: false },
        walk_up:     { frames: [3], rate: 1/3, flip: false, loop: false },
        walk_down:   { frames: [0], rate: 1/3, flip: false, loop: false },
        die: { frames: [4,5,6,7,8], rate: 1/3, trigger: "died", loop: false}
      };
      Q.animations('player', stepPlayer);
      Q.animations('enemy', stepEnemy);
//      Q.stageScene('hud', 1, Q['Player'].p);
      Q.compileSheets("sprite.png","sprites.json");
      Q.compileSheets("soldier.png","soldier.json");
      Q.compileSheets("pisos.png","pisos.json");
      Q.stageScene("Nivel 1");
    },{
      progressCallback: function(loaded,total) {
        var element = document.getElementById("loading_progress");
        element.style.width = Math.floor(loaded/total*100) + "%";
      }
    });

});