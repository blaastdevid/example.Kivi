var Particles = exports.Particles = function Particles(board) {
	this.board     = board;
	this.particles = [];
};

Particles.prototype = {
	stop: function() {
		if (this.timer) {
			clearInterval(this.timer);
			delete this.timer;
		}
	},

	add: function(obj, x, y, vectors) {
		if (vectors.x || vectors.y) {
			if (!this.particles.length) {
				var self = this;

				this.timer = setInterval(function() {
					self._updateParticles();

					if (!self.particles.length) {
						self.stop();
					}
				}, 1000/60);
			}

			this.particles.push({
				start: new Date().getTime(),
				id: obj,
				u_x: x,
				u_y: y,
				v: vectors
			});
		}
	},

	_updateParticles: function() {
		var particles = this.particles;
		var now       = new Date().getTime();
		var board     = this.board;
		var dim       = board.dimensions();
		var tsh_left  = -20;
		var tsh_right = dim.width + 20;
		var tsh_bot   = dim.height + 20;
		var toremove;

		for (var i = 0, len = particles.length; i < len; i++) {
			var obj = particles[i];
			var t   = (now - obj.start) / 1000;
			var v_x = obj.v.x;

			if (v_x) {
				obj.x = obj.u_x + v_x.u * t + (v_x.a * t * t) / 2;

				if (obj.x < tsh_left || obj.x > tsh_right) {
					toremove = toremove || [];
					toremove.push(i);
					continue;
				}
			}

			var v_y = obj.v.y;

			if (v_y) {
				obj.y = obj.u_y + v_y.u * t + (v_y.a * t * t) / 2;

				if (obj.y > tsh_bot) {
					toremove = toremove || [];
					toremove.push(i);
					continue;
				}
			}

			board.change(obj.id, obj);
		}

		if (toremove) {
			while (toremove.length) {
				var index = toremove.pop();
				board.remove(particles[index].id);
				particles.splice(index, 1);
			}
		}
	}
};
