var ui = require('ui'),
	_ = require('common/util'),
	Board = require('./lib/board').Board,
	Particles = require('./lib/particles').Particles,
	ImageView = ui.ImageView;

var font = require('./lib/font');

var app = this;

app.kivi = {
	myHighScore: 0,
	myRank: 0,

	score: function(n) {
		if (n > this.myHighScore) {
			app.msg('score', {
				score: n
			});
			
			this.myHighScore = n;
		}		
	},

	receivedRank: function(data) {
		this.myRank = data.rank;
		if (this.isLoaded) {
			app.view('game').onlineRankReceived(data);
		}
	}
};

app.on('message', function(action, data) {
	if (action === 'rank') {
		app.kivi.receivedRank(data);
	}
});

app.on('connected', function() {
	app.msg('sync');
});

var gameState = {
	SPLASH:	0,
	MENU:	1,
	GAME:	2,
	OVER:	3
};

var board = new Board();

var layer = {
	checkboard:	0,
	gems:		1,
	pointer:	2,
	bgtile:		3,
	hud1:		4,
	hud2:		5,
	energy1:	6,
	energy2:	7,
	profile:	8,
	particles:	9,
	menu:		10,
	menuopts:	11,
	saucewhite:	12,
	sauce:		13
};

var boardOffsetX = 80;
var gemWidth = 30;
var gemHeight = 30;

var difficultySettings = {
	drainAmount: 0.01, // draining is done two times a second
	boostAmount: 0.1
};

function rand(n) {
	return Math.floor(Math.random() * n);
}

_.extend(exports, {
	scene: function() {
		return this.get('scene');
	},

	':load': function() {
		var view = this;

		app.kivi.isLoaded = true;
		app.msg('sync');

		this.selected = 0;

		var scene = this.scene();
		this.particles = new Particles(scene);
	
		scene.setLayers(14);

		scene.defineSpritesheet('sauce', app.resourceURL('sauce.png'), 210, 64);
		scene.setLayerBackground(layer.sauce, {
			sprite: 'sauce',
			x: 0,
			y: 0,
			width: 210,
			height: 64
		});

		scene.defineSpritesheet('gems', app.resourceURL('gems.png'), gemWidth, gemHeight);
		scene.defineSpritesheet('particles', app.resourceURL('particles.png'), 8, 8);
		scene.defineSpritesheet('pointer', app.resourceURL('pointer.png'), 42, 42);
		scene.defineSpritesheet('energy', app.resourceURL('energy.png'), 28, 60);
		scene.defineSpritesheet('rank', app.resourceURL('rank.png'), 31, 9);
		scene.defineSpritesheet('score', app.resourceURL('score.png'), 41, 9);
		scene.defineSpritesheet('menu', app.resourceURL('menu.png'), 178, 83);
		scene.defineSpritesheet('bgtile', app.resourceURL('bgtile.png'), 42, 42);
		scene.defineSpritesheet('newgame', app.resourceURL('newgame.png'), 136, 18);
		scene.defineSpritesheet('continue', app.resourceURL('continue.png'), 136, 18);
		scene.defineSpritesheet('howtoplay', app.resourceURL('howtoplay.png'), 136, 18);

		for (var n=0; n<64; n += 2) {
			var y = Math.floor(n / 8);
			scene.add({
				color: '#ccc',
				x: gemWidth * Math.floor((n + (y % 2)) % 8),
				y: gemHeight * y,
				layer: layer.checkboard,
				width: gemWidth,
				height: gemHeight
			});
		}

		this.selObj = scene.add({
			sprite: 'pointer',
			x: -6,
			y: -6,
			layer: layer.pointer,
			frame: 0
		});
		
		scene.setLayerBackground(layer.energy1, {
			sprite: 'energy',
			width: 28,
			height: 60
		});

		scene.setLayerBackground(layer.energy2, {
			sprite: 'energy',
			width: 28,
			height: 0,
			x_src: 28
		});

		var img = new ImageView({
			style: {
				border: '2 2 2 2',
				'background-color': 'white',
				width: 52,
				height: 52
			}
		});

		scene.setLayerControl(layer.profile, img);

		this.scoreLabel = scene.add({
			sprite: 'score',
			x: 16,
			y: 90,
			layer: layer.hud1,
			frame: 0
		});

		this.rankLabel = scene.add({
			sprite: 'rank',
			x: 21,
			y: 140,
			layer: layer.hud1,
			frame: 0
		});

		// rank meter
		this.rankMeterGray = scene.add({
			color: '#afafaf',
			x: 23,
			y: 153,
			layer: layer.hud1,
			width: 31,
			height: 3
		});

		font.setup(scene);

		this.currentScore = new (font.TextObject)(scene, layer.hud1, 15, 70);
		this.currentScore.set(0);
		this.currentRank = new (font.TextObject)(scene, layer.hud1, 15, 120);
		this.onlineRankReceived(0);

		scene.setLayerBackground(layer.bgtile, {
			sprite: 'bgtile',
			x: 0,
			y: 0,
			tile: true
		});

		scene.setLayerBackground(layer.menu, {
			sprite: 'menu',
			x: 0,
			y: 0,
			width: 178,
			height: 83,
			x_src: 0,
			y_src: 0
		});

		this.newObj = scene.add({
			sprite: 'newgame',
			layer: layer.menuopts,
			frame: 0
		});

		this.howToPlayObj = scene.add({
			sprite: 'howtoplay',
			x: 0,
			y: 20,
			layer: layer.menuopts,
			frame: 1
		});

		this.contObj = scene.add({
			sprite: 'continue',
			x: 0,
			y: 20,
			layer: layer.menuopts,
			frame: 1
		});

		this.gems = {};
		this.energy = 1.0;

		this._selection = 0;

		this.setGameState(gameState.SPLASH);
	},
	
	setRankMeter: function(percentage) {
		var scene = this.scene();

		if (this.rankMeter) {
			scene.remove(this.rankMeter);
		}
		
		if (percentage > 1.0) {
			percentage = 1.0;
		}

		this.rankMeter = scene.add({
			color: '#f25c67',
			x: this.isPortrait ? 150 : 23,
			y: this.isPortrait ? boardOffsetX - 17 : 153,
			layer: layer.hud2,
			width: Math.floor(percentage * 31),
			height: 3
		});
	},

	menuSelection: function(state) {
		var scene = this.scene();

		//state = this.inProgress ? state : 0;

		scene.change(this.newObj, {
			frame: state === 0 ? 0 : 1
		});

		if (this.inProgress) {
			scene.change(this.contObj, {
				frame: state === 1 ? 0 : 1
			});

			scene.change(this.howToPlayObj, {
				frame: state === 2 ? 0 : 1
			});
		} else {
			scene.change(this.howToPlayObj, {
				frame: state === 1 ? 0 : 1
			});
		}

		this._selection = state;
	},

	setGameState: function(state) {
		var self = this;

		var scene = self.scene();

		if (self.state === gameState.SPLASH && state !== gameState.SPLASH) {
			scene.animate(layer.sauce, {
				x: -320
			});
			scene.animate(layer.saucewhite, {
				x: -320
			});

			setTimeout(function() {
				scene.changeLayer(layer.sauce, {
					visible: false
				});
				scene.changeLayer(layer.saucewhite, {
					visible: false
				});			
			}, 500);
		}

		switch(state) {
			case gameState.SPLASH:
				self.state = gameState.SPLASH;
				setTimeout(function() {
					if (self.state === gameState.SPLASH) {
						self.setGameState(gameState.MENU);
					}
				}, 2000);
				break;
			case gameState.MENU:
				self.state = gameState.MENU;

				self.animateLayers(false);

				scene.changeLayer(layer.menu, { visible: true });
				scene.changeLayer(layer.menuopts, { visible: true });

				if (self.inProgress) {
					scene.change(self.contObj, { x: 0 });
					scene.change(self.howToPlayObj, { y: 40 });
				} else {
					scene.change(self.contObj, { x: -320 });
					scene.change(self.howToPlayObj, { y: 20 });
				}
				break;
			case gameState.GAME:
				self.state = gameState.GAME;

				scene.changeLayer(layer.menu, { visible: false });
				scene.changeLayer(layer.menuopts, { visible: false });
				
				self.animateLayers(true);

				self.inProgress = true;
				self.updateGems();
				self.drainEnergy(true);
				self.matchCheck();
				break;
			case gameState.OVER:
				self.state = gameState.OVER;
				self.gameOver();

				setTimeout(function() {
					self.setGameState(gameState.MENU);
				}, 750);

				break;
		}
	},
	
	':inactive': function() {
		this.drainEnergy(false);
		this.menuSelection(1);
		this.setGameState(gameState.MENU);
	},

	animateLayers: function(open) {
		var scene = this.scene();
		var d     = this.dimensions();
		var dims  = this.dims;

		var neededWidth = gemWidth * 8;
		var x = width - neededWidth;

		var f = open ? function(v) { return v; } : this.closed_f;

		if (d.width > d.height) {
			scene.animate(layer.menu, f(dims.menu));
			scene.animate(layer.bgtile, f({ x: -(8 * gemWidth) }));
			scene.animate(layer.profile, f(dims.profile));
			scene.animate(layer.energy1, f(dims.energy));
			scene.animate(layer.energy2, f(dims.energy));
			scene.animate(layer.hud1, f(dims.hud1));
			scene.animate(layer.hud2, f(dims.hud2));
		} else {
			scene.animate(layer.menu, f(dims.menu));
			scene.animate(layer.bgtile, f({ y: (8 * gemWidth) }));
			scene.animate(layer.profile, f(dims.profile));
			scene.animate(layer.energy1, f(dims.energy));
			scene.animate(layer.energy2, f(dims.energy));
			scene.animate(layer.hud1, f(dims.hud1));
			scene.animate(layer.hud2, f(dims.hud2));
		}
	},

	':resized': function(width, height) {
		var scene = this.scene();

		var neededWidth = gemWidth * 8;
		var x = width - neededWidth;

		scene.changeLayer(layer.bgtile, {
			width: width,
			height: height
		});

		scene.changeLayer(layer.splashwhite, {
			width: width,
			height: height
		});

		if (!this._saucewhite) {
			this._saucewhite = scene.add({
				color: '#fff',
				x: 0,
				y: 0,
				layer: layer.saucewhite,
				width: width,
				height: height
			});
			
			scene.translate(layer.sauce, (width - 210) / 2, (height - 64) / 2);
		}

		var dims, f;

		if (width < height) {
			this.isPortrait = true;
			
			x /= 2;

			var bot = boardOffsetX;

			dims = {
				scoreLabel: { x: x + 90, y: boardOffsetX - 30 },
				rankLabel: { x: x + 150, y: boardOffsetX - 30 },
				rankMeterGray: { x: x + 150, y: boardOffsetX - 17 },
				profile: { x: x + 16, y: neededWidth + 14 },
				energy: { x: x + (neededWidth - 38), y: neededWidth + 10 },
				hud1: { x: 0, y: neededWidth },
				hud2: { x: 0, y: neededWidth },
				currentScore: { x: x + 110, y: boardOffsetX - 55 },
				currentRank: { x: x + 165, y: boardOffsetX - 55 },
				menu: { x: (width - 178) / 2,
						y: height + (neededWidth - 138) / 2 },
				menuopts: { x: (width - 138) / 2,
						y: height + (neededWidth - 138) / 2 + 100 }
			};

			f = function(val) {
				return { x: val.x, y: val.y - neededWidth };
			};
		} else {
			dims = {
				scoreLabel: { x: 20, y: 95 },
				rankLabel: { x: 23, y: 140 },
				rankMeterGray: { x: 23, y: 153 },
				profile: { x: 14, y: 8 },
				energy: { x: 26, y: 170 },
				hud1: { x: 0, y: 0 },
				hud2: { x: 0, y: 0 },
				currentScore: { x: boardOffsetX / 2, y: 75 },
				currentRank: { x: boardOffsetX / 2, y: 120 },
				menu: { x: -(neededWidth - (neededWidth - 178) / 2),
						  y: (height - 138) / 2 },
				menuopts: { x: -(neededWidth - (neededWidth - 136) / 2),
						  y: (height - 138) / 2 + 100 }
			};

			f = function(val) {
				return { x: val.x + neededWidth, y: val.y };
			};
		}

		this.dims     = dims;
		this.closed_f = f;

		scene.changeLayer(layer.menu, f(dims.menu));
		scene.changeLayer(layer.menuopts, f(dims.menuopts));

		scene.change(this.scoreLabel, dims.scoreLabel);
		scene.change(this.rankLabel, dims.rankLabel);
		scene.change(this.rankMeterGray, dims.rankMeterGray);
		scene.changeLayer(layer.profile, f(dims.profile));

		scene.changeLayer(layer.energy1, f(dims.energy));
		scene.changeLayer(layer.energy2, f(dims.energy));

		scene.changeLayer(layer.hud1, f(dims.hud1));
		scene.changeLayer(layer.hud2, f(dims.hud2));

		this.currentScore.moveTo(dims.currentScore);
		this.currentRank.moveTo(dims.currentRank);

		scene.translate(layer.checkboard, x, 0);
		scene.translate(layer.gems, x, 0);
		scene.translate(layer.particles, x, 0);
		scene.translate(layer.pointer, x, 0);
		scene.translate(layer.bgtile, 0, 0);
	},

	gemXY: function(index) {
		return {
			x: Math.floor(index % 8) * 30,
			y: Math.floor(index / 8) * 30
		};
	},

	matchCheck: function() {
		var self = this;
		if (board.matchCheck()) {

			self.energy += difficultySettings.boostAmount;
			if (self.energy > 1.0) {
				self.energy = 1.0;
			}

			if (self.interval) {
				clearInterval(self.interval);
			}
			self.interval = setInterval(function() {
				if (!board.trim()) {
					clearInterval(self.interval);
					self.matchCheck();
				}
				self.update();
			}, 500);
		}
	},

	updateGems: function() {
		var self = this;
		var scene = self.scene();
		var xy;
		var gem;

		for (var n=0; n<board.map.length; n++) {
			gem = board.map[n];
			var g = self.gems[gem.id];
			if (!g) {
				if (gem.gem !== -1) {
					xy = self.gemXY(n);
					
					var obj = scene.add({
						sprite: 'gems',
						x: xy.x,
						y: xy.y,
						layer: layer.gems,
						frame: gem.gem
					});
					
					self.gems[gem.id] = {
						obj: obj,
						x: xy.x,
						y: xy.y,
						index: n
					};
				}
			}
			else {
				if (n !== g.index) {
					xy = self.gemXY(n);

					self.moveTo(g.obj, g.x, g.y, xy.x, xy.y);
					
					g.x = xy.x;
					g.y = xy.y;
					g.index = n;
				}
			}
		}

		if (board.trash.length) {
			//this.sounds.xplode.play();
			app.vibrate(50);
		}

		while (board.trash.length) {
			var id = board.trash.shift();
			gem = self.gems[id];
			if (gem) {
				self.explodeGem(gem);
				delete self.gems[id];
			}
		}
	},

	moveTo: function(obj, x, y, to_x, to_y) {
		var self = this;

		self.moving = self.moving || [];

		self.moving.push({
			start: new Date().getTime(),
			obj: obj,
			x: x,
			y: y,
			to_x: to_x,
			to_y: to_y
		});

		if (!self.moveInterval) {
			self.drainEnergy(false);
			self.moveInterval = setInterval(function() {
				var scene = self.scene();
				var now = new Date().getTime();
				var toremove = [];
				var n;
				
				for (n=0; n<self.moving.length; n++) {
					var m = self.moving[n];

					var t = (now - m.start) / 200;
					if (t > 1) {
						t = 1;
					}

					scene.change(m.obj, {
						x: m.x + (m.to_x - m.x) * t,
						y: m.y + (m.to_y - m.y) * t
					});
					
					if (t === 1) {
						toremove.push(n);
					}
				}

				while (toremove.length > 0) {
					n = toremove.pop();
					// splice(0, 1) broken - this is a temp fix
					if (n === 0 && self.moving.length === 1) {
						self.moving.pop();
					} else {
						self.moving.splice(n, 1);
					}
				}

				if (!self.moving.length) {
					clearInterval(self.moveInterval);
					delete self.moveInterval;

					self.drainEnergy(true);
				}
			}, 1000/10);
		}
	},

	explodeGem: function(gem) {
		var self  = this;

		var scene = self.scene();

		scene.change(gem.obj, {
			layer: layer.particles
		});

		var x = gem.x;
		var y = gem.y;

		setTimeout(function() {
			self.particles.add(gem.obj, x, y, {
				y: { u: -100, a: 1000 }
			});
		}, 250);

		var px = x + 14;
		var py = y + 20;
		
		if (board.trash.length > 6) {
			return;
		}

		var num = board.trash.length < 3 ? 4 : 2;

		for (var i = 0; i < num; i++) {
			var p = scene.add({
				sprite: 'particles',
				layer: layer.particles,
				frame: rand(7),
				x: px,
				y: py
			});

			var dir = !rand(2) ? -1 : 1;

			this.particles.add(p, px, py, {
				x: { u: (dir * rand(20)), a: (dir * 50) },
				y: { u: -(100 + rand(100)), a: 500 }
			});
		}
	},

	clearGems: function() {
		var scene = this.scene();
		for (var k in this.gems) {
			var g = this.gems[k];
			scene.remove(g.obj);
		}
		this.gems = {};
	},

	newGame: function() {
		delete this.inProgress;
		board.randomize();
		board.score = 0;
		this.energy = 1.0;
		this.updateEnergy();
	},

	':keypress': function(key) {
		var self = this;

		if (self.state === gameState.SPLASH) {
			if (key === 'fire') {
				self.setGameState(gameState.MENU);
			}
			return;
		}

		if (self.state === gameState.MENU) {
			if (key === 'up') {
				self.menuSelection(this._selection > 0 ? this._selection - 1 : 0);
			}
			if (key === 'down') {
				var count = self.inProgress ? 3 : 2;
				self.menuSelection(this._selection < (count - 1) ? this._selection + 1 : (count - 1));
			}
			if (key === 'fire') {
				if (self._selection === 0) {
					self.clearGems();
					self.newGame();
					self.updateGems();
				} else if (self._selection !== 1 || !self.inProgress) {
					app.setContent('howtoplay');
					return;
				}

				self.setGameState(gameState.GAME);
			}
			return;
		}

		if (self.state === gameState.OVER) {
			if (key === 'fire') {
				self.setGameState(gameState.MENU);
			}
			return;
		}

		// gameState.GAME assumed

		if (key === 'up' && this.selected >= 8) {
			if (this.hot === undefined || this.validMove(this.selected - 8)) {
				this.select(this.selected - 8);
				if (this.hot !== undefined) {
					key = 'fire';
				}
			} else {
				if (this.hot !== undefined) {
					key = 'fire'; // XXX invalid move/could animate
				}
			}
		}
		if (key === 'down' && this.selected < 56) {
			if (this.hot === undefined || this.validMove(this.selected + 8)) {
				this.select(this.selected + 8);
				if (this.hot !== undefined) {
					key = 'fire';
				}
			} else {
				if (this.hot !== undefined) {
					key = 'fire';
				}
			}
		}
		if (key === 'left' && this.selected > 0) {
			if (this.hot === undefined || this.validMove(this.selected - 1)) {
				this.select(this.selected - Math.floor(this.selected % 8) + Math.floor((this.selected - 1) % 8));
				if (this.hot !== undefined) {
					key = 'fire';
				}
			} else {
				if (this.hot !== undefined) {
					key = 'fire';
				}
			}
		}
		if (key === 'right' && this.selected < 63) {
			if (this.hot === undefined || this.validMove(this.selected + 1)) {
				this.select(this.selected - Math.floor(this.selected % 8) + Math.floor((this.selected + 1) % 8));
				if (this.hot !== undefined) {
					key = 'fire';
				}
			} else {
				if (this.hot !== undefined) {
					key = 'fire';
				}
			}
		}
		
		if (key === 'fire') {
			if (this.hot === undefined) {
				this.hot = this.selected;
				this.scene().change(this.selObj, {
					frame: 1
				});
				//this.sounds.select.play();
				return;
			}

			this.scene().change(this.selObj, {
				frame: 0
			});

			board.swap(this.hot, this.selected);
			self.matchCheck();
			self.update();

			delete this.hot;
		}
	},

	validMove: function(index) {
		return board.isValidMove(this.hot, index);
	},
	
	select: function(index) {
		this.selected = index;

		var xy = this.gemXY(index);

		this.scene().change(this.selObj, {
			x: xy.x - 6,
			y: xy.y - 6
		});
	},

	update: function() {
		this.updateGems();

		this.currentScore.set(board.score);
		app.kivi.score(board.score);
		this.setRankMeter(this.nextRank > 0  ? (board.score / this.nextRank) : 1);
	},

	updateEnergy: function() {
		this.scene().changeLayer(layer.energy2, {
			height: (1 - this.energy) * 60
		});
	},

	drainEnergy: function(state) {
		if (state) {
			if (!this.energyInterval) {
				var self = this;
				this.energyInterval = setInterval(function() {
					self.energy -= difficultySettings.drainAmount;

					self.updateEnergy();

					if (self.energy <= 0.01) {
						self.energy = 0;
						self.setGameState(gameState.OVER);
						self.drainEnergy(false);
					}
				}, 500);
			}
		} else {
			if (this.energyInterval) {
				clearInterval(this.energyInterval);
				delete this.energyInterval;
			}
		}
	},

	gameOver: function() {
		var particles = this.particles;
		var gems      = this.gems;

		this.menuSelection(0);
		this.newGame();

		for (var k in gems) {
			var g = gems[k];

			particles.add(g.obj, g.x, g.y, {
				y: { u: -(80+rand(40)), a: 800+rand(400) }
			});
		}
	},

	onlineRankReceived: function(data) {
		if (this.currentRank && this.currentRank.set) {
			this.currentRank.set(data.rank);
		}
		this.nextRank = data.next;
	}
});
