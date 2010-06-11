/**
 * @constructor
 * @extends {c3d.TextureShader}
 */
c3d.SpriteShader = function(cfg) {
	c3d.TextureShader.call(this, cfg);
	
	this.type = c3d.ShaderType.SPRITE;
};
c3d.inherits(c3d.SpriteShader, c3d.TextureShader);
	
