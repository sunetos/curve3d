c3d.newCanvas = function(w, h) {
	var cvs = document.createElement('canvas');
	cvs.style.width = '' + w + 'px';
	cvs.style.height = '' + h + 'px';
	cvs.width = w;
	cvs.height = h;
	
	return cvs;
};

/**
 * @constructor
 * @extends {c3d.RendererBase}
 */
c3d.RendererCanvas2dBase = function(cfg) {
	c3d.RendererBase.call(this, cfg);
	
	if (!this.viewport) return;
	
	var vn = this.viewport.node;
	
	// Made multiple canvas layers for rendering
	this.cvs = c3d.newCanvas(vn.offsetWidth, vn.offsetHeight);
	this.rcvs = c3d.newCanvas(vn.offsetWidth, vn.offsetHeight);
	vn.appendChild(this.cvs);
	
	this.ctx = this.cvs.getContext('2d');
	this.rctx = this.rcvs.getContext('2d');
	
	this.pixelCount = this.cvs.width*this.cvs.height;
	this.byteCount = this.pixelCount << 2;
};
c3d.inherits(c3d.RendererCanvas2dBase, c3d.RendererBase);

/**
 * @constructor
 * @extends {c3d.RendererCanvas2dBase}
 */
c3d.RendererCanvas2d = function(cfg) {
	c3d.RendererCanvas2dBase.call(this, cfg);
};
c3d.inherits(c3d.RendererCanvas2d, c3d.RendererCanvas2dBase);

c3d.RendererCanvas2d.prototype._clear = function() {
	this.ctx.clearRect(0, 0, this.vw, this.vh);
	this.rctx.clearRect(0, 0, this.vw, this.vh);
	this.rctx.save();
	//this.rctx.setTransform(1, 0, 0, 1, 0, 0);
	//this.rctx.moveTo(0, 0);
};

c3d.RendererCanvas2d.prototype._flip = function() {
	this.ctx.drawImage(this.rcvs, 0, 0);
	this.rctx.restore();
};

c3d.RendererCanvas2d.prototype.drawPoint = function(pm, col) {
	var screenM = this.sm1;
	//screenM.ident();
	screenM.mulm(this.viewM, pm);
	var tx = screenM._14, ty = screenM._24, tz = screenM._34;
	
	if (tz < 0.0001) return;
	
	var vw = this.vw, vh = this.vh;
	//c3d.trace('tx: ' + tx + ' ty: ' + ty + ' vw: ' + vw + ' vh: ' + vh);
	if (tx < 0 || tx >= vw || ty < 0 || ty >= vh) return;
	
	this.rctx.fillStyle = col.str;
	this.rctx.fillRect(tx, ty, 1, 1);
	
	/*
	var rctx = this.rctx;
	rctx.beginPath();
	rctx.strokeStyle = col.str;
	rctx.moveTo(tx++, ty++);
	rctx.lineTo(tx, ty);
	rctx.stroke();
	*/
};

c3d.RendererCanvas2d.prototype.drawLines = function(pm, col) {
	
};

c3d.RendererCanvas2d.prototype.drawTriangles = function(stris) {
	var trisl = stris.length;
	for (var i = 0; i < trisl; ++i) {
		var stri = stris[i];
		var tri = stri.tri;
		
		var uvm = tri.uvm, iuvm = tri.iuvm;
		if (!iuvm) continue;
		
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		var rctx = this.rctx;
		
		var v1x = sv1.x, v1y = sv1.y, v2x = sv2.x, v2y = sv2.y, v3x = sv3.x, v3y = sv3.y;
		var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		var winding = d13y*d12x - d13x*d12y;
		if (winding < 0) continue;
		
		var img = tri.img;
		if (img) {
			// drawTrianglesTexture()
			
			var uv1 = tri.uv1, uv2 = tri.uv2, uv3 = tri.uv3;
			
			
			/*
			//var winding = d13y*d12x - d13x*d12y;
			if (winding > 0) {	// Swap v2 with v3
				var tmpvx = v1x, tmpvy = v1y;
				v1x = v2x; v1y = v2y; v2x = tmpvx; v2y = tmpvy;
				d12x = -d12x; d12y = -d12y;
				d13x = v3x - v1x; d13y = v3y - v1y;
				winding = d13y*d12x - d13x*d12y;
			}
			*/
			
			// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
			// from the texture image to the triangle, not counting translation yet
			var w = img.width, h = img.height;
			
			// Maybe move the matrix multiply math inline for an optimization?
			var aff2d = this.sm21;
			aff2d._11 = d12x; aff2d._12 = d12y;
			aff2d._21 = d13x; aff2d._22 = d13y;
			aff2d.mulm(iuvm, aff2d);
			var aff2d11 = aff2d._11, aff2d12 = aff2d._21, aff2d21 = aff2d._12, aff2d22 = aff2d._22;
			
			// Find texture screen position
			var imgX = tri.originX, imgY = tri.originY;
			var scrImgX = (imgX*aff2d11 + imgY*aff2d12) | 0
			  , scrImgY = (imgX*aff2d21 + imgY*aff2d22) | 0;
			// Find delta vector from texture to triangle
			var scrDX = v1x - scrImgX, scrDY = v1y - scrImgY;
			
			// Find source and destination bounding boxes; requires sorting vertices
			var x1 = w*uv1.x, x2 = w*uv2.x, x3 = w*uv3.x
			  , y1 = h - h*uv1.y, y2 = h - h*uv2.y, y3 = h - h*uv3.y;
			
			var bx1, bx2, bx3, by1, by2, by3, bx1y, bx2y, bx3y;
			var xTmp, yTmp;
			
			// Sort the vertices
			if (x1 < x2) {
				if (x1 < x3) {
					if (x2 < x3) {
						bx1 = x1; bx2 = x2; bx3 = x3;
						bx1y = y1; bx2y = y2; bx3y = y3;
					} else{
						bx1 = x1; bx2 = x3; bx3 = x2;
						bx1y = y1; bx2y = y3; bx3y = y2;
					}
				} else {
					bx1 = x3; bx2 = x1; bx3 = x2;
					bx1y = y3; bx2y = y1; bx3y = y2;
				}
			} else {
				if (x2 < x3) {
					if (x1 < x3) {
						bx1 = x2; bx2 = x1; bx3 = x3;
						bx1y = y2; bx2y = y1; bx3y = y3;
					} else{
						bx1 = x2; bx2 = x3; bx3 = x1;
						bx1y = y2; bx2y = y3; bx3y = y1;
					}
				} else {
					bx1 = x3; bx2 = x2; bx3 = x1;
					bx1y = y3; bx2y = y2; bx3y = y1;
				}
			}
	
			if (y1 < y2) {
				if (y1 < y3) {
					if (y2 < y3) {
						by1 = y1; by2 = y2; by3 = y3;
					} else{
						by1 = y1; by2 = y3; by3 = y2;
					}
				} else {
					by1 = y3; by2 = y1; by3 = y2;
				}
			} else {
				if (y2 < y3) {
					if (y1 < y3) {
						by1 = y2; by2 = y1; by3 = y3;
					} else{
						by1 = y2; by2 = y3; by3 = y1;
					}
				} else {
					by1 = y3; by2 = y2; by3 = y1;
				}
			}
			
			var bw = bx3 - bx1, bh = by3 - by1;
			
			var center = this.sv1.set(sv1).add(sv2).add(sv3).div(3.0);
			var dir1x = sv1.x - center.x, dir1y = sv1.y - center.y
			  , dir2x = sv2.x - center.x, dir2y = sv2.y - center.y
			  , dir3x = sv3.x - center.x, dir3y = sv3.y - center.y;
			  
			// Account for seams between triangles (rendering artifacts)
			var grow = 2, halfGrow = grow >> 1;
			var dstbx = bx1, dstby = by1, dstbw = bw, dstbh = bh;
			
			if (grow) {
				if (dstbx > halfGrow) {
					dstbx -= halfGrow;
					dstbw += grow;
				}
				if (dstby > halfGrow) {
					dstby -= halfGrow;
					dstbh += grow;
				}
				
				if ((dstbx + dstbw) < w) dstbw += grow;
				else dstbw = w - dstbx;
				if ((dstby + dstbh) < h) dstbh += grow;
				else dstbh = h - dstby;
			}
			
			// More attempts to account for the seams
			off1x = dir1x*0.15; off1y = dir1y*0.15;
			off2x = dir2x*0.15; off2y = dir2y*0.15;
			off3x = dir3x*0.15; off3y = dir3y*0.15;
			
			rctx.save();
			
			// Clip to show just the triangle.
			// TODO: This nearly doubles the rendering time. Optimize it by maybe rendering to a clipping buffer
			// and clip out after rendering all triangles but before flipping the buffer?
			// TODO: In firefox, this causes rendering artifacts in the form of gaps between triangles. Fix it.
			rctx.beginPath();
			rctx.moveTo(v1x + off1x, v1y + off1y);
			rctx.lineTo(v2x + off2x, v2y + off2y);
			rctx.lineTo(v3x + off3x, v3y + off3y);
			rctx.closePath();
			rctx.clip();
			
			if (dstbx < 0) dstbx = 0;
			if (dstby < 0) dstby = 0;
			if (bx1 < 0) bx1 = 0;
			if (by1 < 0) by1 = 0;
			
			if (bw && bh && dstbw && dstbh) {
				// Bake the affine transform, including translation
				rctx.transform(aff2d11, aff2d21, aff2d12, aff2d22, scrDX, scrDY);
				//console.log([bx1, by1, bw, bh, dstbx, dstby, dstbw, dstbh]);
				rctx.drawImage(img, bx1, by1, bw, bh, dstbx, dstby, dstbw, dstbh);
			}
			
			rctx.restore();
		} else {
			// drawTrianglesColor()
			
			rctx.beginPath();
			//rctx.fillStyle = c3d.Blue.str;
			rctx.fillStyle = tri.v1.col.str;
			rctx.moveTo(v1x, v1y);
			rctx.lineTo(v2x, v2y);
			rctx.lineTo(v3x, v3y);
			rctx.closePath();
			rctx.fill();
		}
	}
};

c3d.RendererCanvas2d.prototype.drawSprites = function(sprites) {
};

/**
 * @constructor
 * @extends {c3d.RendererCanvas2dBase}
 */
c3d.RendererCanvas2dBlit = function(cfg) {
	c3d.RendererCanvas2dBase.call(this, cfg);
	
	this.imgData = this.rctx.getImageData(0, 0, this.cvs.width, this.cvs.height);
	//this.origImgData = this.imgData;
	
	// Caching several canvas lookup vars for performance
	this.origPixels = this.pixels = this.imgData.data;
};
c3d.inherits(c3d.RendererCanvas2dBlit, c3d.RendererCanvas2dBase);
	
c3d.RendererCanvas2dBlit.prototype._clear = function() {
	this.ctx.clearRect(0, 0, this.vw, this.vh);
	
	/*
	var ps = this.pixels, bc = this.byteCount;
	for (var i = 0; i < bc; ++i) {
		ps[i] = 0;
	}
	*/
	this.imgData = this.ctx.getImageData(0, 0, this.cvs.width, this.cvs.height);
	//this.origImgData = this.imgData;
	this.pixels = this.imgData.data;
};

c3d.RendererCanvas2dBlit.prototype._flip = function() {
	this.rctx.putImageData(this.imgData, 0, 0);
	this.ctx.drawImage(this.rcvs, 0, 0);
};

c3d.RendererCanvas2dBlit.prototype.drawPoint = function(pm, col, colStr) {
	var bc = this.byteCount, ps = this.pixels;
	var m = this.m;
	
	m.mulm(this.viewM, pm);
	var tx = m._14, ty = m._24;
	
	var vw = this.vw, vh = this.vh;
	//c3d.trace('tx: ' + tx + ' ty: ' + ty + ' vw: ' + vw + ' vh: ' + vh);
	if (tx < 0 || tx >= vw || ty < 0 || ty >= vh) return;
	
	var pixOff = ty*vw + tx;
	var byteOff = pixOff << 2;
	//ps[byteOff] = 255;
	//c3d.trace('r: ' + (col >> 16) + ' g: ' + ((col >> 8) & 0xFF) + ' b: ' + (col & 0xFF));
	
	ps[byteOff++] = col.r;
	ps[byteOff++] = col.g;
	ps[byteOff++] = col.b;
	ps[byteOff] = 255;
};
