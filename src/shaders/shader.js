// TODO: Investigate memory usage effects from keeping references to loaded images
/**
 * @constructor
 */
c3d.TextureLib = function() {
	this.imgByUrl = {};
};
	
c3d.TextureLib.prototype.get = function(url, callback) {
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
c3d.$TexLib = new c3d.TextureLib();

/**
 * @enum {number}
 */
c3d.ShaderType = {
	  WIRE: 1
	, COLOR: 2
	, TXTUR: 3
	, SPRITE: 4
};

/**
 * @constructor
 */
c3d.Shader = function(cfg) {
	if (!c3d.Shader.lib) /** @static */ c3d.Shader.lib = {};
	
	this.type = this.type || 0;
	c3d.setup(this, cfg);
	this.callbacks = {};
	if (!this.name || this.name.length == 0) {
		this.name = 'shader_' + c3d.Shader.lib.length;
	}
	c3d.Shader.lib[this.name] = this;
};
/** @static */
c3d.Shader.get = function(name) {
	return c3d.Shader.lib[name];
};

/**
 * @constructor
 * @extends {c3d.Shader}
 */
c3d.WireShader = function(cfg) {
	this.type = c3d.ShaderType.WIRE;
	this.color = c3d.Blue;
	
	c3d.Shader.call(this, cfg);
};
c3d.inherits(c3d.WireShader, c3d.Shader);

/**
 * @constructor
 * @extends {c3d.Shader}
 */
c3d.ColorShader = function(cfg) {
	this.type = c3d.ShaderType.COLOR;
	this.ambient = c3d.Blue;
	this.diffuse = c3d.Blue;
	this.specular = c3d.Blue;
	
	c3d.Shader.call(this, cfg);
};
c3d.inherits(c3d.ColorShader, c3d.Shader);

/**
 * @constructor
 * @extends {c3d.Shader}
 */
c3d.TextureShader = function(cfg) {
	this.type = c3d.ShaderType.TXTUR;
	this.textures = [];
	
	c3d.Shader.call(this, cfg);
};
c3d.inherits(c3d.TextureShader, c3d.Shader);
	
c3d.TextureShader.prototype.addTextureImage = function(img) {
	this.textures.push(img);
	var cb;
	if (cb = this.callbacks['texturechange']) {
		cb(this.textures);
	}
};
c3d.TextureShader.prototype.addTextureUrl = function(url) {
	c3d.$TexLib.get(url, c3d.bind(this, function(img) {
		this.addTextureImage(img);
	}));
};

c3d.$DefaultShader = new c3d.ColorShader({name: 'default', diffuse: c3d.DarkGray});
