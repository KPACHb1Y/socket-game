var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 }
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    } 
  };
   
  var game = new Phaser.Game(config);
   
  function preload() {
    this.load.image('tiles', 'assets/my-tiles.png');
    this.load.atlas('atlas', 'https://www.mikewesthad.com/phaser-3-tilemap-blog-posts/post-1/assets/atlas/atlas.png', 'https://www.mikewesthad.com/phaser-3-tilemap-blog-posts/post-1/assets/atlas/atlas.json');
    this.load.tilemapTiledJSON('map', 'assets/new-new.json');
    this.load.image('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 45 });
  }
   
  function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === self.socket.id) {
          addPlayer(self, players[id]);
        } else {
          addOtherPlayers(self, players[id]);
        }
      });
    });
    this.socket.on('newPlayer', function (playerInfo) {
      addOtherPlayers(self, playerInfo);
    });
    this.socket.on('disconnect', function (playerId) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy();
        }
      });
    });
    this.socket.on('playerMoved', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.setRotation(playerInfo.rotation);
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        }
      });
    });

    const anims = this.anims;
    anims.create({
      key: 'misa-left-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-left-walk.', start: 0, end: 3, zeroPad: 3
      }),
      frameRate: 10,
      repeat: -1
    });
    anims.create({
      key: 'misa-right-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-right-walk.', start: 0, end: 3, zeroPad: 3
      }),
      frameRate: 10,
      repeat: -1
    });
    anims.create({
      key: 'misa-front-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-front-walk.', start: 0, end: 3, zeroPad: 3
      }),
      frameRate: 10,
      repeat: -1
    });
    anims.create({
      key: 'misa-back-walk',
      frames: anims.generateFrameNames('atlas', {
        prefix: 'misa-back-walk.', start: 0, end: 3, zeroPad: 3
      }),
      frameRate: 10,
      repeat: -1
    });

    this.cursors = this.input.keyboard.createCursorKeys();
  }
  
  function addPlayer(self, playerInfo) {
    self.dude= self.physics.add
    .sprite(playerInfo.x, playerInfo.y, 'atlas', 'misa-front')
    .setOffset(0, 24)
    .setDepth(20);

    const map = self.make.tilemap({ key: 'map' });
    const tileset = map.addTilesetImage('my-tiles', 'tiles');

    map.createStaticLayer('bg', tileset, 0, 0);

    const interactivePlayer = map.createStaticLayer('interactive_player', tileset, 0, 0);

    interactivePlayer.setCollisionByProperty({ collides: true });
    interactivePlayer.setDepth(10);

    self.physics.add.collider(self.dude, interactivePlayer);

  }
  
  function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add
    .sprite(playerInfo.x, playerInfo.y, 'atlas', 'misa-front')
    .setOffset(0, 24)
    .setDepth(20);
    
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
  }
  
  function update() {
    if (this.dude) {
      const speed = 175;
      const prevVelocity = this.dude.body.velocity.clone();

      // Stop any previous movement from the last frame
      this.dude.body.setVelocity(0);

      // Horizontal movement
      if (this.cursors.left.isDown) {
        this.dude.body.setVelocityX(-speed);
      } else if (this.cursors.right.isDown) {
        this.dude.body.setVelocityX(speed);
      }

      // Vertical movement
      if (this.cursors.up.isDown) {
        this.dude.body.setVelocityY(-speed);
      } else if (this.cursors.down.isDown) {
        this.dude.body.setVelocityY(speed);
      }

      // Normalize and scale the velocity so that
      // globalVariables.player can't move faster along a diagonal
      this.dude.body.velocity.normalize().scale(speed);

      // Update the animation last and give left/right animations precedence over up/down animations
      if (this.cursors.left.isDown) {
        this.dude.anims.play('misa-left-walk', true);
      } else if (this.cursors.right.isDown) {
        this.dude.anims.play('misa-right-walk', true);
      } else if (this.cursors.up.isDown) {
        this.dude.anims.play('misa-back-walk', true);
      } else if (this.cursors.down.isDown) {
        this.dude.anims.play('misa-front-walk', true);
      } else {
        this.dude.anims.stop();

        // If we were moving, pick and idle frame to use
        if (prevVelocity.x < 0) {
          this.dude.setTexture('atlas',
            'misa-left');
        } else if (prevVelocity.x > 0) {
          this.dude.setTexture('atlas',
            'misa-right');
        } else if (prevVelocity.y < 0) {
          this.dude.setTexture('atlas',
            'misa-back');
        } else if (prevVelocity.y > 0) {
          this.dude.setTexture('atlas',
            'misa-front');
        }
      }
      
      this.physics.world.wrap(this.dude, 5);
  
      // emit player movement
      var x = this.dude.x;
      var y = this.dude.y;
      if (this.dude.oldPosition && (x !== this.dude.oldPosition.x || y !== this.dude.oldPosition.y)) {
        this.socket.emit('playerMovement', { x: this.dude.x, y: this.dude.y});
      }
      // save old position data
      this.dude.oldPosition = {
        x: this.dude.x,
        y: this.dude.y,
      };
    }
  }