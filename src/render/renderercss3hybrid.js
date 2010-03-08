/**
 * @constructor
 * @extends {a3d.RendererBase}
 */
a3d.RendererCss3Hybrid = function(cfg) {
	this.triFrag = null;		// Cache a DOM fragment for triangle proxy node trees
	this.$B = 1;				// Fake enum for browser-specific logic
	this.sqrt = Math.sqrt;
	this.cos = Math.cos;
	this.sin = Math.sin;
	this.acos = Math.acos;
	this.asin = Math.asin;
	this.halfPI = Math.PI*0.5;
	
	a3d.RendererBase.call(this, cfg);
	
	switch (a3d.$B.substr(0, 2)) {
		case 'FF':	this.$B = 1; break;
		case 'Sa':
		case 'Ch':	this.$B = 2; break;
		case 'Op':	this.$B = 3; break;
		case 'IE':	this.$B = 4; break;
		default:	this.$B = null; break;
	}
};
a3d.inherits(a3d.RendererCss3Hybrid, a3d.RendererBase);
	
a3d.RendererCss3Hybrid.prototype._clear = function() {
};

a3d.RendererCss3Hybrid.prototype._flip = function() {
};

a3d.RendererCss3Hybrid.prototype.drawPoint = function(pm, col) {
};

a3d.RendererCss3Hybrid.prototype.drawLines = function(pm, col) {
};

a3d.RendererCss3Hybrid.prototype.remove = function(stris) {
	var trisl = stris.length;
	for (var i = 0; i < trisl; ++i) {
		var stri = stris[i];
		var node = stri.node;
		if (node && node.style.display != 'none') {
			node.style.display = 'none';
		}
	}
};

a3d.RendererCss3Hybrid.prototype.drawTriangles = function(stris) {
	var v = this.viewport;
	var abs = Math.abs;
	var texturing = (this.camera.detail == a3d.Render.Detail.TXTUR);
	
	var trisl = stris.length;
	for (var i = 0; i < trisl; ++i) {
		var stri = stris[i];
		var tri = stri.tri;
		var uvm = tri.uvm, iuvm = tri.iuvm;
		if (!iuvm) continue;
		
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		
		var v1x = sv1.x, v1y = sv1.y, v2x = sv2.x, v2y = sv2.y, v3x = sv3.x, v3y = sv3.y;
		//var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		// Attempt to account for seams
		var center = this.sv1.set(sv1).add(sv2).add(sv3).div(3.0);
		var dir1x = sv1.x - center.x, dir1y = sv1.y - center.y
		  , dir2x = sv2.x - center.x, dir2y = sv2.y - center.y
		  , dir3x = sv3.x - center.x, dir3y = sv3.y - center.y;
		
		var factor = 0.02;
		//if (this.$B == 2) factor = 0.05;
		off1x = dir1x*factor; off1y = dir1y*factor;
		off2x = dir2x*factor; off2y = dir2y*factor;
		off3x = dir3x*factor; off3y = dir3y*factor;
		
		v1x += off1x; v2x += off2x; v3x += off3x;
		v1y += off1y; v2y += off2y; v3y += off3y;
		
		var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		var winding = d13y*d12x - d13x*d12y;
		if (winding < 0) {
			if (stri.node && stri.node.style.display != 'none') {
				stri.node.style.display = 'none';
			}
			continue;
		}
		
		var shader = tri.shader;
		if (texturing && shader.type == a3d.ShaderType.TXTUR && shader.textures.length) {
			// drawTrianglesTexture()
			
			var imgs = shader.textures;
			var img = imgs[0];
			var uv1 = tri.uv1, uv2 = tri.uv2, uv3 = tri.uv3;
			
			// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
			// from the texture image to the triangle, not counting translation yet
			var w = img.width, h = img.height;
			
			// Ensure existence of the proxy DOM object
			var node = stri.node;
			if (!node || node.tagName != 'CANVAS') {
				// Cleanup other render types
				if (node) node.parentNode.removeChild(node);
				//if (imgNode) imgNode.parentNode.removeChild(imgNode);
				
				// Save memory by using as small a triangle as possible
				var bw = w, bh = h;
				if (this.$B == 2) {
					// In chrome only, something horrible happens to the texture if we shrink it much
					bw = 128; bh = 128;
				}
				var scaleX = bw/w, scaleY = bh/h;
				
				stri.node = node = a3d.newCanvas(bw, bh);
				var ctx = node.getContext('2d');
				node.className = 'a3d-tri';
				node.style.display = 'block';
				node.style.position = 'absolute';
				node.style.left = '0';
				node.style.top = '0';
				v.node.appendChild(node);
				
				a3d.avoidSelect(node);
								
				// We only need to build the inverse texture projection once
				
				// Find the texture offset post-transformation (this is crucial)
				var imgX = tri.originX, imgY = tri.originY;
				var m = tri.iuuvm;
				var pp = this.svv1;
				pp.x = imgX*scaleX; pp.y = imgY*scaleY;
				pp.trans(m, pp);
				
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(bw, 0);
				ctx.lineTo(0, bh);
				ctx.closePath();
				ctx.clip();
				
				// Bake the affine transform, including translation
				ctx.transform(m._11, m._12, m._21, m._22, -pp.x, -pp.y);
				ctx.drawImage(img, 0, 0, w, h, 0, 0, bw, bh);
				
				stri.bw = w; stri.bh = h;
				stri.invBw = 1.0/w; stri.invBh = 1.0/h;
				
				node.style.width = '' + w + 'px';
				node.style.height = '' + h + 'px';
				
				if (this.$B == 1) {	// FF
					node.style.MozTransformOrigin = 'top left';
				} else if (this.$B == 2) { // Webkit
					node.style.WebkitTransformOrigin = 'top left';
				} else if (this.$B == 3) { // Opera
					node.style.OTransformOrigin = 'top left';
				}
				node.style.TransformOrigin = 'top left';
			} else {
				if (node.style.display != 'block') {
					node.style.display = 'block';
				}
			}
			
			// Maybe move the matrix multiply math inline for an optimization?
			var aff2d = this.sm21;
			aff2d._11 = d12x; aff2d._12 = d12y;
			aff2d._21 = d13x; aff2d._22 = d13y;
			
			aff2d.scaleXY(stri.invBw, stri.invBh);
			
			var matStr = aff2d.toCssString();
			if (this.$B == 1) {	// FF
				node.style.MozTransform = matStr;
			} else if (this.$B == 2) { // Webkit
				node.style.WebkitTransform = matStr;
			} else if (this.$B == 3) { // Opera
				node.style.OTransform = matStr;
			}
			
			node.style.transform = matStr;
			node.style.left = '' + v1x + 'px';
			node.style.top = '' + v1y + 'px';
			
		} else {
			// drawTrianglesColor()
			
			// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
			// from the texture image to the triangle, not counting translation yet
			var w = 64, h = 64;
			
			// Ensure existence of the proxy DOM object
			var node = stri.node;
			//console.log(imgNode.nodeName);
			if (!node || !node.nodeName != 'DIV') {
				// Cleanup other render types
				if (node) node.parentNode.removeChild(node);
			}
		}
		if (node) node.style.zIndex = this.z++;
	}
};

a3d.RendererCss3Hybrid.prototype.drawSprites = function(sprites) {
	var texturing = (this.camera.detail == a3d.Render.Detail.TXTUR);
	if (!texturing) return;
	var persp = (this.camera.projection == a3d.Render.Projection.PERSP);
	
	var v = this.viewport;
	var abs = Math.abs;
	var nearZ = this.camera.nearZ, farZ = this.camera.farZ;
	
	var spritesl = sprites.length;
	for (var i = 0; i < spritesl; ++i) {
		var sprite = sprites[i];
		
		var pos = sprite.center, scale = sprite.scale;	// TODO: Need to get the scale from the concatenated matrix instead
		//a3d.trace(pos.z);
		if (pos.z >= farZ || pos.z <= nearZ) {			// near & far-plane clipping
			if (sprite.node && sprite.node.style.display != 'none') {
				sprite.node.style.display = 'none';
			}
			continue;
		}
		
		var shader = sprite.shader;
		var imgs = shader.textures;
		if (!imgs.length) continue;
		var img = imgs[0];
		
		var node = sprite.node, imgNode = sprite.imgNode;
		if (!node) {
			sprite.node = node = document.createElement('div');
			sprite.imgNode = imgNode = img.cloneNode(false);
			
			node.className = 'a3d-sprite';
			node.style.position = 'absolute';
			node.style.overflow = 'hidden';
			//node.style.opacity = '0.8';
			
			imgNode.className = 'a3d-sprite-img';
			imgNode.style.display = 'block';
			imgNode.style.position = 'absolute';
			imgNode.style.left = '0';
			imgNode.style.top = '0';
			node.appendChild(imgNode);
			
			a3d.avoidSelect(node);
			v.node.appendChild(node);
		}
		
		if (node.style.display != 'block') {
			node.style.display = 'block';
		}
		
		var zScale = 1.0;
		if (persp) {
			zScale = (farZ - pos.z)/farZ;
		}
		var mScaleX = 1.0, mScaleY = 1.0;
		// TODO: Find a way to use the concatenated matrix's scale without a sqrt() call (in scaleX())
		var mScaleX = sprite.cm.scaleX(), mScaleY = sprite.cm.scaleY();
		var w = mScaleX*zScale, h = mScaleY*zScale;
		
		node.style.left = '' + pos.x - w*0.5 + 'px';
		node.style.top = '' + pos.y - h*0.5 + 'px';
		node.style.width = imgNode.style.width = '' + w + 'px';
		node.style.height = imgNode.style.height = '' + h + 'px';
		
		node.style.zIndex = this.z++;
	}
};
