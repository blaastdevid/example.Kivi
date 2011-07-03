var app = this;

var K_X = 11;
var K_Y = 14;

exports.setup = function(scene) {
	scene.defineSpritesheet('numberfont', app.resourceURL('numberfont.png'), K_X, K_Y);
};

function TextObject(scene, layer, x, y) {
	this.scene = scene;
	this.layer = layer;
	this.basex = x;
	this.basey = y;
	this.objs  = [];
}

exports.TextObject = TextObject;

TextObject.prototype = {
	set: function(n) {
		var i;
		var scene = this.scene;
		var nums  = [];

		while (n > 0) {
			nums.unshift(Math.floor(n % 10));
			n = Math.floor(n / 10);
		}

		if (nums.length === 0) {
			nums = [0];
		}

		if (nums.length !== this.objs.length) {
			while (nums.length < this.objs.length) {
				scene.remove(this.objs.pop());
			}

			for (i = this.objs.length; i < nums.length; i++) {
				this.objs.push(scene.add({
					sprite: 'numberfont',
					layer: this.layer
				}));
			}

			this.moveTo({ x: this.basex, y: this.basey });
		}

		for (i = 0; i < nums.length; i++) {
			scene.change(this.objs[i], {
				frame: nums[i]
			});
		}
	},

	moveTo: function(opts) {
		var basex  = opts.x;
		var basey  = opts.y;
		this.basex = basex;
		this.basey = basey;

		var k = (this.objs.length * K_X) / 2;

		for (var i = 0; i < this.objs.length; i++) {
			this.scene.change(this.objs[i], {
				x: basex - k + i * K_X,
				y: basey
			});
		}
	}
};
