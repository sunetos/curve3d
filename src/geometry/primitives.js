// Renderable objects
/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {a3d.Color} col
 * @constructor
 * @extends {a3d.SceneNode}
 */
a3d.Point = function(x, y, z, col) {
	this.col = a3d.Black;
	
	a3d.SceneNode.call(this);
	
	if (col) this.col = (col instanceof a3d.Color) ? col : new a3d.Color(col);
	
	if (x && y && z) {
		this.m.moveTo(x, y, z);
		this.dirty = true;
	}
};
a3d.inherits(a3d.Point, a3d.SceneNode);
	
a3d.Point.prototype._render = function(r) {
	r.drawPoint(this.cm, this.col);
};


