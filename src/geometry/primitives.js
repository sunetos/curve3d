// Renderable objects
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {c3d.Color} col
 * @constructor
 * @extends {c3d.SceneNode}
 */
c3d.Point = function(x, y, z, col) {
	this.col = c3d.Black;
	
	c3d.SceneNode.call(this);
	
	if (col) this.col = (col instanceof c3d.Color) ? col : new c3d.Color(col);
	
	if (x && y && z) {
		this.m.moveTo(x, y, z);
		this.dirty = true;
	}
};
c3d.inherits(c3d.Point, c3d.SceneNode);
	
c3d.Point.prototype._collect = function(r) {
	r.drawPoint(this.cm, this.col);
};


