/**
 * @constructor
 * @extends {c3d.RendererBase}
 */
c3d.RendererSVG = function(cfg) {
	this.ns = 'http://www.w3.org/2000/svg';
	c3d.RendererBase.call(this, cfg);
	
	if (!this.viewport) return;
	
	this.tris = [];
	this.triCount = 0;
	this.m = new c3d.Mat4();
	
	var vn = this.viewport.node;
	var vw = vn.offsetWidth, vh = vn.offsetHeight;
	
	var svg = document.createElementNS(this.ns, 'svg');
	
	svg.setAttribute('xmlns', this.ns);
	svg.setAttribute('shape-rendering', 'optimizeSpeed');
	svg.setAttribute('text-rendering', 'optimizeSpeed');
	//svg.style.width = '' + vw + 'px';
	//svg.style.height = '' + vh + 'px';
	svg.setAttribute('width', vw);
	svg.setAttribute('height', vh);
	
	var g = document.createElementNS(this.ns, 'g');
	g.setAttribute('width', vw);
	g.setAttribute('height', vh);
	svg.appendChild(g);
	vn.appendChild(svg);
	
	//svg.innerHTML = '<g width="' + vw + '" height="' + vh + '"></g>';
	this.svg = svg;
	this.g = g;
	
	var pt = document.createElementNS(this.ns, 'rect');
	pt.setAttribute('x', 0);
	pt.setAttribute('y', 0);
	pt.setAttribute('width', 1);
	pt.setAttribute('height', 1);
	pt.setAttribute('fill', '#000000');
	this.pt = pt;
};
c3d.inherits(c3d.RendererSVG, c3d.RendererBase);
	
c3d.RendererSVG.prototype._clear = function() {
	//var g = this.g;
	//while (g.lastChild) {
	//	g.removeChild(g.lastChild);
	//}
	var tris = this.tris;
	var triNum = this.triCount;
	while (triNum--) {
		var tri = tris[triNum];
		//tri.setAttribute('display', 'none');
		tri.setAttribute('visibility', 'hidden');
	};
	
	this.triCount = 0;
};

c3d.RendererSVG.prototype._flip = function() {
	
};

c3d.RendererSVG.prototype.drawPoint = function(pm, col) {
	var m = this.m;
	
	m.mulm(this.viewM, pm);
	var tx = m._14, ty = m._24, tz = m._34;
	
	if (tz < 0.0001) return;
	
	var vw = this.vw, vh = this.vh;
	//c3d.trace('tx: ' + tx + ' ty: ' + ty + ' vw: ' + vw + ' vh: ' + vh);
	if (tx < 0 || tx >= vw || ty < 0 || ty >= vh) return;
	
	var ns = this.ns;
	var pt = this.pt.cloneNode(false);
	pt.setAttribute('x', tx);
	pt.setAttribute('y', ty);
	//pt.setAttribute('width', 1);
	//pt.setAttribute('height', 1);
	pt.setAttribute('fill', col.str);
	this.g.appendChild(pt);
};

c3d.RendererSVG.prototype.drawLines = function(pm, col) {
	
};

c3d.RendererSVG.prototype.drawTriangle = function(pm, tri) {
	var m = this.m;
	m.mulm(this.viewM, pm);
	var tx = m._14, ty = m._24, tz = m._34;
	var v1 = tri.v1, v2 = tri.v2, v3 = tri.v3;
	
	var poly;
	
	++this.triCount;
	if (this.triCount > this.tris.length) {
		poly = document.createElementNS(this.ns, 'polygon');
		this.g.appendChild(poly);
		this.tris.push(poly);
	} else {
		poly = this.tris[this.triCount - 1];
	}
	var v1x = tx + v1.x, v1y = ty + v1.y, v2x = tx + v2.x, v2y = ty + v2.y, v3x = tx + v3.x, v3y = ty + v3.y;
	poly.setAttribute('points', '' + v1x + ',' + v1y + ' ' + v2x + ',' + v2y + ' ' + v3x + ',' + v3y);
	poly.setAttribute('fill', v1.col.str);
	poly.setAttribute('visibility', 'visible');
};
