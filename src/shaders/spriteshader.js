/**
 * @constructor
 * @extends {a3d.TextureShader}
 */
a3d.SpriteShader = function(cfg) {
	a3d.TextureShader.call(this, cfg);
	
	this.type = a3d.ShaderType.SPRITE;
};
a3d.inherits(a3d.SpriteShader, a3d.TextureShader);
	
