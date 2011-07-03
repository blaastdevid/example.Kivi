var app = this;

var kClear = -1;

function Board() {
	this.map = [];
	this.trash = [];
	this.modified = [];

	this.randomize();

	this.score = 0;
	this.multiplier = 1;
}

Board.prototype = {
	at: function(x, y) {
		if (y === undefined) {
			return this.map[x];
		}
		return this.map[y * 8 + x];
	},
	
	xy: function(index) {
		return {
			x: Math.floor(index % 8),
			y: Math.floor(index / 8)
		};
	},

	newGem: function() {
		return {
			gem: Math.floor(Math.random() * 7),
			id: ++this.gemIds
		};
	},

	rand: function(x, y) {
		var index = y * 8 + x;
		this.map[index] = this.newGem();
		this.modified.push(index);
	},

	clear: function(x, y) {
		var n = y * 8 + x;
		this.map[n].gem = kClear;
		this.trash.push(this.map[n].id);
	},
	
	randomize: function() {
		this.gemIds = 0;
		this.map = [];
		for (var n=0; n<64; n++) {
			this.map.push(this.newGem());
			this.modified.push(n);
		}
	},

	_swap: function(a, b) {
		var x = this.map[a];
		this.map[a] = this.map[b];
		this.map[b] = x;
	},

	swap: function(a, b) {
		this._swap(a, b);
		this.modified.push(a);
		this.modified.push(b);
	},

	isValidMove: function(a, b) {
		this._swap(a, b);

		var res = false;

		var gem = this.at(a).gem;
		var xy = this.xy(a);

		var m = this.rowMatch(xy.x, xy.y, gem);
		if (m.match) {
			res = true;
		}
		else {
			m = this.colMatch(xy.x, xy.y, gem);
			if (m.match) {
				res = true;
			}
			else {
				gem = this.at(b).gem;
				xy = this.xy(b);
		
				m = this.rowMatch(xy.x, xy.y, gem);
				if (m.match) {
					res = true;
				} else {
					m = this.colMatch(xy.x, xy.y, gem);
					if (m.match) {
						res = true;
					}
				}
			}
		}

		this._swap(a, b);
		return res;
	},

	rowMatch: function(x, y, gem) {
		var k, l, dummy;

		for (k = x - 1; k >= 0 && this.at(k, y).gem === gem; k--) {
			dummy = 1;
		}
		if (k < 0 || this.at(k, y).gem !== gem) {
			k++;
		}
		for (l = x + 1; l < 8 && this.at(l, y).gem === gem; l++) {
			dummy = 1;
		}

		return {
			start: k,
			end: l,
			match: ((l - k) > 2)
		};
	},

	colMatch: function(x, y, gem) {
		var k, l, dummy;

		for (k = y - 1; k > 0 && this.at(x, k).gem === gem; k--) {
			dummy = 1;
		}
		if (k < 0 || this.at(x, k).gem !== gem) {
			k++;
		}
		for (l = y + 1; l < 8 && this.at(x, l).gem === gem; l++) {
			dummy = 1;
		}
		
		return {
			start: k,
			end: l,
			match: ((l - k) > 2)
		};
	},

	matchCheck: function() {
		var n;
		var self = this;

		var matches = [];

		while(self.modified.length) {
			var index = self.modified.shift();
			var gem = self.at(index).gem;
			if (gem !== kClear) {
				var xy = self.xy(index);

				var row = this.rowMatch(xy.x, xy.y, gem);
				if (row.match) {
					for (n = row.start; n < row.end; n++) {
						matches.push([n, xy.y]);
					}
					self.score += 10 * (row.end-row.start-2) * self.multiplier++;
				}

				var col = this.colMatch(xy.x, xy.y, gem);
				if (col.match) {
					for (n = col.start; n < col.end; n++) {
						matches.push([xy.x, n]);
					}
					self.score += 10 * (col.end-col.start-2) * self.multiplier++;
				}
			}
		}

		matches.forEach(function(m) {
			self.clear(m[0], m[1]);
		});

		var cleared = matches.length > 0;
		if (!cleared) {
			self.multiplier = 1;
		}

		return cleared;
	},

	trim: function() {
		var trimmed = false;

		var x, y, k, dummy;

		for (x=0; x<8; x++) {
			for (y=7; y>0; y--) {
				if (this.at(x, y).gem === kClear) {
					trimmed = true;
					for (k=y-1; k >= 0 && this.at(x, k).gem === kClear; k--) {
						dummy = 1;
					}
					if (k >= 0) {
						this.swap((y*8+x), k*8+x);
					}
				}
			}
			for (y=0; y<8 && this.at(x, y).gem === kClear; y++) {
				this.rand(x, y);
			}
		}

		return trimmed;
	}
};

exports.Board = Board;
