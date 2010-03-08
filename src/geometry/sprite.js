/**
 * A 2D image sprite object.
 * Technically it's a "point sprite," might distinguish in the future.
 * 
 * @constructor
 * @extends {a3d.SceneNode}
 */
a3d.Sprite = function() {
	a3d.SceneNode.call(this);
	
	this.geom = a3d.Render.Geometry.SPRITE;
	this.shader = new a3d.SpriteShader();
	this.center = new a3d.Vec3();
};
a3d.inherits(a3d.Sprite, a3d.SceneNode);
	
a3d.Sprite.prototype._collect = function(r) {
	r.camera.projectVert(this.cm, a3d.Vec3.ZERO, this.center);
	//this.center.z = this.cm._34;
	r.objs.push(this);
};
