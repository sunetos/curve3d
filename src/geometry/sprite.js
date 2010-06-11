/**
 * A 2D image sprite object.
 * Technically it's a "point sprite," might distinguish in the future.
 * 
 * @constructor
 * @extends {c3d.SceneNode}
 */
c3d.Sprite = function() {
	c3d.SceneNode.call(this);
	
	this.geom = c3d.Render.Geometry.SPRITE;
	this.shader = new c3d.SpriteShader();
	this.center = new c3d.Vec3();
};
c3d.inherits(c3d.Sprite, c3d.SceneNode);
	
c3d.Sprite.prototype._collect = function(r) {
	r.camera.projectVert(this.cm, c3d.Vec3.ZERO, this.center);
	//this.center.z = this.cm._34;
	r.objs.push(this);
};
