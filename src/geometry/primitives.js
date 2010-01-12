// Renderable objects
/**
 * @extends a3d.SceneNode
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {a3d.Color} col
 */
a3d.Point = a3d.SceneNode.extend({
	  col: a3d.Black
	  
	, init: function(x, y, z, col) {
		this._super();
		
		if (col) this.col = (col instanceof a3d.Color) ? col : new a3d.Color(col);
		
		if (x && y && z) {
			this.m.moveTo(x, y, z);
			this.dirty = true;
		}
	  }
	
	, _render: function(r) {
		r.drawPoint(this.cm, this.col);
	}
});
