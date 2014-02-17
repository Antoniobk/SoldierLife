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
  var SPRITE_FLOOR = 16;


  // People
  Q.Sprite.extend("Player", {
    init: function(p) {
      this._super(p,{
        sheet: "player",
        sprite: "player",
        stepDelay: 0.8,  // seconds to delay before next step
        type: SPRITE_PLAYER,
        collisionMask: SPRITE_TILES | SPRITE_ENEMY | SPRITE_DOT,
        speed:100,
        score:0
      });
      this.add("2d, animation");
      Q.input.on("fire", this, function(){
        var xx = this.p.x , yy = this.p.y;
        if(this.p.direction=='left'){ xx -=8; } else
        if(this.p.direction=='right'){ xx +=8; } else
        if(this.p.direction=='up'){yy -=15;xx-=1;} else
        if(this.p.direction=='down'){yy +=15;}
        console.log("fire fire");
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
      });
      this.on("hit.sprite",function(collision) {
        if(collision.obj.isA("Portal")) {
          var portal = collision.obj;
          this.destroy();
          Q.stageScene("endLevel",1, { label: portal.nextLevel });
        }
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
        collisionMask: SPRITE_ENEMY | SPRITE_TILES
      });
      this.add("2d");
      this.on("hit.sprite",function(collision) { if(collision.obj.isA("Enemy")) { this.destroy(); } });
      this.on("hit",function(){ this.destroy(); });
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
        stepDelay: 0.6,
        type: SPRITE_ENEMY,
        collisionMask: SPRITE_PLAYER | SPRITE_TILES | SPRITE_PBULLET,
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
    defaults: { speed: 100, direction: 'left', switchPercent: 8 },
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
          case "left": p.vx = -p.speed; p.angle = 0; break;
          case "right":p.vx = p.speed; p.angle = 180; break;
          case "up":   p.vy = -p.speed; p.angle = 90; break;
          case "down": p.vy = p.speed; p.angle = -90; break;
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
    init: function(p, nextLevel) {
      this._super(p, {
        sheet: 'portal'
      });
      this.nextLevel = nextLevel;
    }
  });

  //Map
  Q.tilePos = function(col,row) {
    return { x: col*32 + 16, y: row*32 + 16 };
  }
  Q.TileLayer({
    init: function(p) {
      this._super(p,{
        type: SPRITE_TILES,
        dataAsset: 'level.json',
        sheet:     'tiles'
      });
    }
  });

  Q.scene("Nivel 1",function(stage) {
    stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));

    stage.collisionLayer(new Q.TileLayer({
      type: SPRITE_TILES,
      dataAsset: 'level.json',
      sheet:     'tiles'
    }));

    var player = new Q.Player(Q.tilePos(10,7));
    stage.add("viewport").follow(stage.insert(player));
    stage.insert(new Q.Enemy(Q.tilePos(10,4)));
    stage.insert(new Q.Enemy(Q.tilePos(15,10)));
    stage.insert(new Q.Enemy(Q.tilePos(5,10)));
    stage.insert(new Q.Portal(Q.tilePos(18,16),"Nivel 2"));
    Q.audio.play('intro.mp3',{ loop: true });
  });
  Q.scene("Nivel 2",function(stage) {
    stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));
    stage.collisionLayer(new Q.TileLayer({
      type: SPRITE_TILES,
      dataAsset: 'level1.json',
      sheet:     'tiles'
    }));

    var player = new Q.Player(Q.tilePos(1,2));
    stage.add("viewport").follow(stage.insert(player));

    stage.insert(new Q.Portal(Q.tilePos(13,16),"Nivel 3"));
    Q.audio.play('intro.mp3',{ loop: true });
  });
  Q.scene("Nivel 3",function(stage) {
    stage.insert(new Q.Repeater({ asset: "background-wall.png", speedX: 0.5, speedY: 0.5 }));
    stage.collisionLayer(new Q.TileLayer({
      type: SPRITE_TILES,
      dataAsset: 'level2.json',
      sheet:     'tiles'
    }));

    var player = new Q.Player(Q.tilePos(1,2));
    stage.add("viewport").follow(stage.insert(player));

    stage.insert(new Q.Portal(Q.tilePos(14,15),"Nivel 1"));
    Q.audio.play('intro.mp3',{ loop: true });
  });

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
    "sprites.json, level.json, level1.json, level2.json, pisos.json, " +
    "gamestart.mp3, coin.mp3, intro.mp3, fire.mp3, Game_Over.mp3",
    function() {
      Q.sheet("tiles","tiles.png", { tileW: 32, tileH: 32 });
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
        run:  { frames: [0], rate: 1/3, flip: false, loop: true },
        die: { frames: [1,2,3,4,5], rate: 1/3, trigger: "died", loop: false}
      };
      Q.animations('player', stepPlayer);
      Q.animations('enemy', stepEnemy);
//      Q.stageScene('hud', 1, Q['Player'].p);
      Q.compileSheets("sprite.png","sprites.json");
      Q.compileSheets("pisos.png","pisos.json");
      Q.stageScene("Nivel 1");
    },{
      progressCallback: function(loaded,total) {
        var element = document.getElementById("loading_progress");
        element.style.width = Math.floor(loaded/total*100) + "%";
      }
    });

});