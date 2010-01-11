// TODO: Investigate memory usage effects from keeping references to loaded images
a3d.TextureLib = Class.extend({
	  imgByUrl: {}
	  
	
	, init: function() {
		this.imgByUrl = {};
	}
	
	, get: function(url, callback) {
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
	}
});
a3d.$TexLib = new a3d.TextureLib();

a3d.ShaderType = {
	  COLOR: 0
	, TXTUR: 1
};
a3d.Shader = Class.extend({
	  type: 0
	, callbacks: null
	  
	, init: function(cfg) {
		a3d.setup(this, cfg);
		this.callbacks = {};
	}
});

a3d.ColorShader = a3d.Shader.extend({
	  type: a3d.ShaderType.COLOR
	  
	, color: a3d.Blue
});

a3d.TextureShader = a3d.Shader.extend({
	  type: a3d.ShaderType.TXTUR
	, color: a3d.Blue
	
	, textures: null
	
	, init: function(cfg) {
		this._super(cfg);
		
		this.textures = [];
	}
	
	, addTextureImage: function(img) {
		this.textures.push(img);
		var cb;
		if (cb = this.callbacks['texturechange']) {
			cb(this.textures);
		}
	}
	, addTextureUrl: function(url) {
		a3d.$TexLib.get(url, a3d.bind(this, function(img) {
			this.addTextureImage(img);
		}));
	}
})

a3d.$DefaultShader = new a3d.ColorShader({color: a3d.DarkGray});
