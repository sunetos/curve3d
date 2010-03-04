// TODO: Investigate memory usage effects from keeping references to loaded images
/**
 * @constructor
 */
a3d.TextureLib = function() {
	this.imgByUrl = {};
};
	
a3d.TextureLib.prototype.get = function(url, callback) {
	var imgs = this.imgByUrl;
	
	if (imgs[url] !== undefined) {
		if (typeof(callback) == 'function') callback(imgs[url]);
	} else {
		var img = new Image();
		img.onload = function() {
			imgs[url] = img;
			/* Started some poking at tiled textures
			img.style.backgroundImage = 'url("' + img.src + '")';
			img.style.backgroundSize = '' + img.width + 'px ' + img.height + 'px';
			img.src = 'http://www.golivetutor.com/download/spacer.gif';
			*/
			if (typeof(callback) == 'function') callback(imgs[url]);
		};
		img.src = url;
	}
};
a3d.$TexLib = new a3d.TextureLib();

/**
 * @enum {number}
 */
a3d.ShaderType = {
	  WIRE: 1
	, COLOR: 2
	, TXTUR: 3
	, SPRITE: 4
};

/**
 * @constructor
 */
a3d.Shader = function(cfg) {
	if (!a3d.Shader.lib) /** @static */ a3d.Shader.lib = {};
	
	this.type = this.type || 0;
	a3d.setup(this, cfg);
	this.callbacks = {};
	if (!this.name || this.name.length == 0) {
		this.name = 'shader_' + a3d.Shader.lib.length;
	}
	a3d.Shader.lib[this.name] = this;
};
/** @static */
a3d.Shader.get = function(name) {
	return a3d.Shader.lib[name];
};

/**
 * @constructor
 * @extends {a3d.Shader}
 */
a3d.WireShader = function(cfg) {
	this.type = a3d.ShaderType.WIRE;
	this.color = a3d.Blue;
	
	a3d.Shader.call(this, cfg);
};
a3d.inherits(a3d.WireShader, a3d.Shader);

/**
 * @constructor
 * @extends {a3d.Shader}
 */
a3d.ColorShader = function(cfg) {
	this.type = a3d.ShaderType.COLOR;
	this.ambient = a3d.Blue;
	this.diffuse = a3d.Blue;
	this.specular = a3d.Blue;
	
	a3d.Shader.call(this, cfg);
};
a3d.inherits(a3d.ColorShader, a3d.Shader);

/**
 * @constructor
 * @extends {a3d.Shader}
 */
a3d.TextureShader = function(cfg) {
	this.type = a3d.ShaderType.TXTUR;
	this.textures = [];
	
	a3d.Shader.call(this, cfg);
};
a3d.inherits(a3d.TextureShader, a3d.Shader);
	
a3d.TextureShader.prototype.addTextureImage = function(img) {
	this.textures.push(img);
	var cb;
	if (cb = this.callbacks['texturechange']) {
		cb(this.textures);
	}
};
a3d.TextureShader.prototype.addTextureUrl = function(url) {
	a3d.$TexLib.get(url, a3d.bind(this, function(img) {
		this.addTextureImage(img);
	}));
};

a3d.$DefaultShader = new a3d.ColorShader({name: 'default', diffuse: a3d.DarkGray});
