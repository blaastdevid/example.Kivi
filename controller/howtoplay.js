var app = this;

exports[':load'] = function() {
	var scene = this.control('scene');

	scene.defineSpritesheet('back', app.imageURL('back-to-menu.png'), 142, 14);
	scene.defineSpritesheet('help', app.imageURL('help-page.png'), 224, 166);
	scene.defineSpritesheet('bgtile', app.imageURL('bgtile.png'), 42, 42);

	scene.setLayers(2);

	scene.setLayerBackground(0, {
		sprite: 'bgtile',
		x: 0,
		y: 0,
		tile: true
	});

	this.helpObj = scene.add({
		sprite: 'help',
		frame: 0,
		layer: 1,
		x: 0,
		y: 0
	});

	this.backObj = scene.add({
		sprite: 'back',
		frame: 0,
		layer: 1,
		x: (224 - 142) / 2,
		y: 166+10
	});
};

exports[':resized'] = function(width, height) {
	this.control('scene').changeLayer(0, {
		width: width,
		height: height
	});

	this.control('scene').changeLayer(1, {
		x: (width-224)/2,
		y: (height-166-10-14)/2
	});
};

exports[':keypress'] = function(key) {
	if (key === 'fire') {
		app.back();
	}
};
