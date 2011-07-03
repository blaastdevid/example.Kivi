//
// example.Kivi, backend.js -- implement a simple global highscore list.
//

var _ = require('underscore');
var storage = require('blaast/simple-data');

var clients = {};

// Ranking object. Holds .scores, array for all scores.
function Ranking() {
	this.scores = [];
	this.inhale();
}

Ranking.prototype = {
	// Get score object by userid
	get: function(userId) {
		return _.detect(this.scores, function(s) { return s.userId === userId; });
	},

	// Set score of user
	set: function(userId, score) {
		var r = this.get(userId);
		if (r) {
			if (score > r.score) {
				r.score = score;
			}
		} else {
			this.scores.push({
				userId: userId,
				score: score
			});
		}
		this.scores = _.sortBy(this.scores, function(s) {
			return -s.score;
		});
	},

	// get score by rank
	getScore: function(rank) {
		if (rank >= 1 && rank-1 < this.scores.length) {
			return this.scores[rank-1].score;
		}
	},

	// get rank of user
	getRank: function(userId) {
		var r = this.get(userId);
		return r ? _.indexOf(this.scores, r) + 1 : 0;
	},

	toArray: function() {
		return this.scores;
	},

	// Read scores from persistent storage
	inhale: function() {
		var self = this;

		storage.get('score', function(err, value) {
			if (value && value.scores) {
				self.scores = value.scores;
				log.info('read scores, count=' + self.scores.length);
			} else {
				log.info('no scores found, value=' + JSON.stringify(value));
			}
		});
	},

	// Write scores to persistent storage
	exhale: function() {
		storage.set('score', { scores: this.scores }, function(err, oldData) {
			if (err) {
				log.info('Failed to store highscores: ' + err);
			} else {
				log.info('Stored highscores.');
			}
		});
	}
};

var globalRanking = new Ranking();

if (globalRanking.scores.length === 0) {
	globalRanking.set('CPU', 100);
}

var scoreTimeout;

app.message(function(client, action, data) {
	var next;
	var rank;
	if (action === 'sync') {
		log.info('Syncing message to user-id=' + client.user.id);
		rank = globalRanking.getRank(client.user.id);
		next = globalRanking.getScore(rank-1);
		client.msg('rank', { rank: rank, next: next || 0 });
		return;
	}

	if (action === 'score' && data.score) {
		log.info('Received score, user-id=' + client.user.id + ' score=' + data.score);

		globalRanking.set(client.user.id, data.score);
		rank = globalRanking.getRank(client.user.id);
		var robj = globalRanking.get(client.user.id);

		if (!robj.prevRank || robj.prevRank !== rank) {
			robj.prevRank = rank;

			next = globalRanking.getScore(rank-1);

			log.info('Rank changed, current rank=' + rank);
			client.msg('rank', { rank: rank, next: next || 0 });
			
			// everyones ranking down from here just changed
			var messages_sent = 0;
			var arr = globalRanking.toArray();
			var _loopBody_ = function(n) {
				var userId = arr[n].userId;
				var next = globalRanking.getScore(n);
				if (userId) {
					var cls = _.select(clients, function(c) { return c.user.id === userId; });
					cls.forEach(function(c) {
						c.msg('rank', { rank: n+1, next: next || 0 });
						messages_sent++;
					});
				}
			};
			for (var n = rank; n<arr.length; n++) {
				_loopBody_(n);
			}
			
			log.info('Sent messages to other players, message-count=' + messages_sent);
		}

		globalRanking.dirty = true;
	}
});

// Every thirty seconds, write scores to db if changes happened.
setInterval(function() {
	if (globalRanking.dirty) {
		delete globalRanking.dirty;
		globalRanking.exhale();
	}
}, 30 * 1000);

// Track connected clients by client-id and user-id
app.realtime(function(client, ev) {
	if (ev === 'CONNECTED') {
		clients[client.id] = client;
		clients[client.user.id] = client;
	} else if (ev === 'DISCONNECTED') {
		delete clients[client.id];
		delete clients[client.user.id];
	}
});

// Server profile photo (not yet)
app.setResourceHandler(function(request, response) {
	var r = new RequestLogger(app.log).start('request-id=' + request.id +
		' user-id=' + request.owner + ' client-id=' + request.source);

	response.failed('Facebook profile picture coming soon.');
});
