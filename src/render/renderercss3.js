/**
 * @constructor
 * @extends {c3d.RendererBase}
 */
c3d.RendererCss3 = function(cfg) {
	this.triFrag = null;		// Cache a DOM fragment for triangle proxy node trees
	this.$B = 1;				// Fake enum for browser-specific logic
	this.sqrt = Math.sqrt;
	this.cos = Math.cos;
	this.sin = Math.sin;
	this.acos = Math.acos;
	this.asin = Math.asin;
	this.halfPI = Math.PI*0.5;
	
	c3d.RendererBase.call(this, cfg);
	
	this.triFrag = document.createDocumentFragment();
	var tmpDiv = document.createElement('div');
	tmpDiv.innerHTML = '<div class="c3d-tri" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0; overflow: hidden;">' +
		'<div class="c3d-tri-unrot" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;">' +
		'<div class="c3d-tri-offset" style="position: absolute; width: 1px; height: 1px; left:0; top: 0;">' +
		'<div class="c3d-tri-crop" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0; overflow: hidden;">' +
		//'<div class="c3d-tri-crop" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;">' +
		'<div class="c3d-tri-rot" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;">' +
		//'<img class="c3d-tri-img" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;" />' +
		'</div></div></div></div></div>';
	//this.triFrag.appendChild((tmpDiv.firstChild) ? tmpDiv.firstChild : tmpDiv);
	this.triFrag.appendChild(tmpDiv.firstChild);
	
	switch (c3d.$B.substr(0, 2)) {
		case 'FF':	this.$B = 1; break;
		case 'SA':
		case 'CH':	this.$B = 2; break;
		case 'OP':	this.$B = 3; break;
		case 'IE':	this.$B = 4; break;
		default:	this.$B = null; break;
	}
};
c3d.inherits(c3d.RendererCss3, c3d.RendererBase);
	
c3d.RendererCss3.prototype._clear = function() {
};

c3d.RendererCss3.prototype._flip = function() {
};

c3d.RendererCss3.prototype.drawPoint = function(pm, col) {
};

c3d.RendererCss3.prototype.drawLines = function(pm, col) {
};

c3d.RendererCss3.prototype.remove = function(stris) {
	var trisl = stris.length;
	for (var i = 0; i < trisl; ++i) {
		var stri = stris[i];
		var node = stri.node;
		if (node && node.style.display != 'none') {
			node.style.display = 'none';
		}
	}
};

c3d.RendererCss3.prototype.drawTriangles = function(stris) {
	var v = this.viewport;
	var abs = Math.abs;
	var texturing = (this.camera.detail == c3d.Render.Detail.TXTUR);
	
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
		
		var factor = 0.01;
		if (this.$B == 2) factor = 0.1;
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
		if (texturing && shader.type == c3d.ShaderType.TXTUR && shader.textures.length) {
			// drawTrianglesTexture()
			
			var imgs = shader.textures;
			var img = imgs[0];
			var uv1 = tri.uv1, uv2 = tri.uv2, uv3 = tri.uv3;
			
			// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
			// from the texture image to the triangle, not counting translation yet
			var w = img.width, h = img.height;
			
			// Ensure existence of the proxy DOM object
			var node = stri.node, imgNode = stri.imgNode, unrotNode, offsetNode, cropNode, rotNode;
			if (!node || !imgNode || imgNode.tagName != 'IMG' || !node.parentNode || !imgNode.parentNode) {
				// Cleanup other render types
				if (node && node.parentNode) node.parentNode.removeChild(node);
				if (imgNode && imgNode.parentNode) imgNode.parentNode.removeChild(imgNode);
				
				var triFrag = this.triFrag.cloneNode(true);
				stri.node = node = v.node.appendChild(triFrag.firstChild);
				
				stri.unrotNode = unrotNode = node.firstChild;
				stri.offsetNode = offsetNode = unrotNode.firstChild;
				stri.cropNode = cropNode = offsetNode.firstChild;
				stri.rotNode = rotNode = cropNode.firstChild;
				
				stri.imgNode = imgNode = img.cloneNode(false);
				imgNode.className = 'c3d-tri-img';
				imgNode.style.display = 'block';
				imgNode.style.position = 'absolute';
				imgNode.style.left = '0';
				imgNode.style.top = '0';
				rotNode.appendChild(imgNode);
				
				c3d.avoidSelect(node);
				
				// We only need to build the inverse texture projection once
				
				// Find texture screen position
				var imgX = tri.originX, imgY = tri.originY;
				
				var bw = w, bh = h;
				
				var m = tri.iuuvm;
				var pp = this.svv1;
				pp.x = imgX; pp.y = imgY;
				pp.trans(m, pp);
				
				// Small optimization for square textures
				var hypot, sinTheta, cosTheta, theta, rotRad;
				if (bw == bh) {
					hypot = 1.414213562373*bw;
					sinTheta = cosTheta = 0.707106781186;
					theta = rotRad = 0.785398163397;
				} else {
					hypot = this.sqrt(bw*bw + bh*bh);
					var invHypot = 1.0/hypot;
					sinTheta = bw*invHypot;
					//theta = this.asin(sinTheta);
					cosTheta = bh*invHypot;
					theta = this.acos(cosTheta);
					rotRad = this.halfPI - theta;
				}
				
				var cropHeight = bh*sinTheta;
				var rotOff = bh*cosTheta;
				
				if (this.$B == 1) {	// FF
					node.style.MozTransformOrigin = imgNode.style.MozTransformOrigin = 'top left';
					imgNode.style.MozTransform = m.toCssString();
					
					rotNode.style.MozTransformOrigin = unrotNode.style.MozTransformOrigin = 'top left';
					rotNode.style.MozTransform = 'rotate(' + rotRad + 'rad)';
					unrotNode.style.MozTransform = 'rotate(-' + rotRad + 'rad)';
					
					rotNode.style.left = '' + rotOff + 'px';
					offsetNode.style.left = '-' + rotOff + 'px';
					
					unrotNode.style.width = node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
				} else if (this.$B == 2) { // Webkit
					node.style.WebkitTransformOrigin = imgNode.style.WebkitTransformOrigin = 'top left';
					imgNode.style.WebkitTransform = m.toCssString();
					
					rotNode.style.WebkitTransformOrigin = unrotNode.style.WebkitTransformOrigin = 'top left';
					rotNode.style.WebkitTransform = 'rotate(' + rotRad + 'rad)';
					unrotNode.style.WebkitTransform = 'rotate(-' + rotRad + 'rad)';
					
					rotNode.style.left = '' + rotOff + 'px';
					offsetNode.style.left = '-' + rotOff + 'px';
					
					unrotNode.style.width = node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
				} else if (this.$B == 3) { // Opera
					node.style.OTransformOrigin = imgNode.style.OTransformOrigin = 'top left';
					imgNode.style.OTransform = m.toCssString();
					
					rotNode.style.OTransformOrigin = unrotNode.style.OTransformOrigin = 'top left';
					rotNode.style.OTransform = 'rotate(' + rotRad + 'rad)';
					unrotNode.style.OTransform = 'rotate(-' + rotRad + 'rad)';
					
					rotNode.style.left = '' + rotOff + 'px';
					offsetNode.style.left = '-' + rotOff + 'px';
					
					unrotNode.style.width = node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
				} else if (this.$B == 4) { // IE
					m.applyIeFilter(imgNode);
					
					rotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
					unrotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
					
					var cosRot = this.cos(rotRad), sinRot = this.sin(rotRad);
					var f = rotNode.filters['DXImageTransform.Microsoft.Matrix'];
					f.M11 = cosRot; f.M12 = -sinRot;
					f.M21 = sinRot; f.M22 = cosRot;
					
					var irotRad = -rotRad;
					var cosIRot = this.cos(irotRad), sinIRot = this.sin(irotRad);
					var f = unrotNode.filters['DXImageTransform.Microsoft.Matrix'];
					f.M11 = cosIRot; f.M12 = -sinIRot;
					f.M21 = sinIRot; f.M22 = cosIRot;
					
					node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
					unrotNode.style.width = '' + hypot + 'px';
					unrotNode.style.left = '' + (-bw*0.5) + 'px';
					unrotNode.style.top = '' + (-bh*0.5) + 'px';
					
					var offX = 0.0, offY = 0.0;
				
					if (m._11 < 0) offX += m._11;
					if (m._21 < 0) offX += m._21;
					if (m._12 < 0) offY += m._12;
					if (m._22 < 0) offY += m._22;
					
					pp.x -= offX*bw; pp.y -= offY*bh;
				}
				
				cropNode.style.width = '' + hypot + 'px';
				cropNode.style.height = '' + cropHeight + 'px';
				
				stri.bw = bw; stri.bh = bh;
				stri.invBw = 1.0/bw; stri.invBh = 1.0/bh;
				
				//imgNode.style.left = '' + (-(pp.x + 64)) + 'px';
				imgNode.style.left = '' + (-pp.x) + 'px';
				imgNode.style.top = '' + (-pp.y) + 'px';
				
				/*			
				var img2 = imgNode.cloneNode(false);
				document.body.appendChild(img2);
				//this.viewport.node.appendChild(img2);
				if (this.$B == 3)
					m.applyIeFilter(img2);
				//console.log(img2);
				*/
			} else {
				if (node.style.display != 'block') {
					node.style.display = 'block';
				}
				imgNode = stri.imgNode;
				unrotNode = stri.unrotNode;
				offsetNode = stri.offsetNode;
				cropNode = stri.cropNode;
				rotNode = stri.rotNode;
			}
			
			// Maybe move the matrix multiply math inline for an optimization?
			var aff2d = this.sm21;
			aff2d._11 = d12x; aff2d._12 = d12y;
			aff2d._21 = d13x; aff2d._22 = d13y;
			
			//aff2d.scale(1.05);
			
			aff2d.scaleXY(stri.invBw, stri.invBh);
			
			if (this.$B == 1) {	// FF
				node.style.MozTransform = aff2d.toCssString();
				
				node.style.left = '' + v1x + 'px';
				node.style.top = '' + v1y + 'px';
			} else if (this.$B == 2) { // Webkit
				node.style.WebkitTransform = aff2d.toCssString();
				
				node.style.left = '' + v1x + 'px';
				node.style.top = '' + v1y + 'px';
			} else if (this.$B == 3) { // Opera
				node.style.OTransform = aff2d.toCssString();
				
				node.style.left = '' + v1x + 'px';
				node.style.top = '' + v1y + 'px';
			} else if (this.$B == 4) { // IE
				aff2d.applyIeFilter(node);
				
				// Account for the fact that IE's "auto expand" matrix offsets the origin.
				// Took forever to arrive at this elegant, mathematically correct fix.
				var offX = 0.0, offY = 0.0;
				
				if (d12x < 0) offX += d12x;
				if (d13x < 0) offX += d13x;
				if (d12y < 0) offY += d12y;
				if (d13y < 0) offY += d13y;
				
				var screenX = v1x + offX, screenY = v1y + offY;
				
				node.style.left = '' + screenX + 'px';
				node.style.top = '' + screenY + 'px';
			}
		} else {
			// drawTrianglesColor()
			
			// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
			// from the texture image to the triangle, not counting translation yet
			var w = 64, h = 64;
			
			// Ensure existence of the proxy DOM object
			var node = stri.node, imgNode = stri.imgNode, unrotNode, offsetNode, cropNode, rotNode;
			//console.log(imgNode.nodeName);
			if (!node || !imgNode || imgNode.nodeName != 'DIV') {
				// Cleanup other render types
				if (node) node.parentNode.removeChild(node);
				if (imgNode) imgNode.parentNode.removeChild(imgNode);
				
				var triFrag = this.triFrag.cloneNode(true);
				stri.node = node = this.viewport.node.appendChild(triFrag.firstChild);
				
				stri.unrotNode = unrotNode = node.firstChild;
				stri.offsetNode = offsetNode = unrotNode.firstChild;
				stri.cropNode = cropNode = offsetNode.firstChild;
				stri.rotNode = rotNode = cropNode.firstChild;
				
				stri.imgNode = imgNode = document.createElement('div');
				if (shader.diffuse) imgNode.style.backgroundColor = shader.diffuse.str;
				imgNode.style.width = '' + w + 'px';
				imgNode.style.height = '' + h + 'px';
				imgNode.style.display = 'block';
				imgNode.style.position = 'absolute';
				imgNode.style.left = '0';
				imgNode.style.top = '0';
				rotNode.appendChild(imgNode);
				//this.viewport.node.appendChild(imgNode);
				
				// We only need to build the inverse texture projection once
				
				var bw = w, bh = h;
				
				var hypot = 1.414213562373*bw,
				    sinTheta = cosTheta = 0.707106781186,
				    theta = rotRad = 0.785398163397;
				
				var cropHeight = bh*sinTheta;
				var rotOff = bh*cosTheta;
				
				if (this.$B == 1) {	// FF
					node.style.MozTransformOrigin = imgNode.style.MozTransformOrigin = 'top left';
					
					rotNode.style.MozTransformOrigin = unrotNode.style.MozTransformOrigin = 'top left';
					rotNode.style.MozTransform = 'rotate(' + rotRad + 'rad)';
					unrotNode.style.MozTransform = 'rotate(-' + rotRad + 'rad)';
					
					rotNode.style.left = '' + rotOff + 'px';
					offsetNode.style.left = '-' + rotOff + 'px';
					
					unrotNode.style.width = node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
				} else if (this.$B == 2) { // Webkit
					node.style.WebkitTransformOrigin = imgNode.style.WebkitTransformOrigin = 'top left';
					
					rotNode.style.WebkitTransformOrigin = unrotNode.style.WebkitTransformOrigin = 'top left';
					rotNode.style.WebkitTransform = 'rotate(' + rotRad + 'rad)';
					unrotNode.style.WebkitTransform = 'rotate(-' + rotRad + 'rad)';
					
					rotNode.style.left = '' + rotOff + 'px';
					offsetNode.style.left = '-' + rotOff + 'px';
					
					unrotNode.style.width = node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
				} else if (this.$B == 3) { // Opera
					node.style.OTransformOrigin = imgNode.style.OTransformOrigin = 'top left';
					
					rotNode.style.OTransformOrigin = unrotNode.style.OTransformOrigin = 'top left';
					rotNode.style.OTransform = 'rotate(' + rotRad + 'rad)';
					unrotNode.style.OTransform = 'rotate(-' + rotRad + 'rad)';
					
					rotNode.style.left = '' + rotOff + 'px';
					offsetNode.style.left = '-' + rotOff + 'px';
					
					unrotNode.style.width = node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
				} else if (this.$B == 4) { // IE
					rotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
					unrotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
					
					var cosRot = this.cos(rotRad), sinRot = this.sin(rotRad);
					//console.log(cosRot);
					//console.log(sinRot);
					var f = rotNode.filters['DXImageTransform.Microsoft.Matrix'];
					f.M11 = cosRot; f.M12 = -sinRot;
					f.M21 = sinRot; f.M22 = cosRot;
					
					var irotRad = -rotRad;
					var cosIRot = this.cos(irotRad), sinIRot = this.sin(irotRad);
					var f = unrotNode.filters['DXImageTransform.Microsoft.Matrix'];
					f.M11 = cosIRot; f.M12 = -sinIRot;
					f.M21 = sinIRot; f.M22 = cosIRot;
					
					node.style.width = rotNode.style.width = offsetNode.style.width = '' + bw + 'px';
					unrotNode.style.height = node.style.height = rotNode.style.height = offsetNode.style.height = '' + bh + 'px';
					unrotNode.style.width = '' + hypot + 'px';
					unrotNode.style.left = '' + (-bw*0.5) + 'px';
					unrotNode.style.top = '' + (-bh*0.5) + 'px';
				}
				
				cropNode.style.width = '' + hypot + 'px';
				cropNode.style.height = '' + cropHeight + 'px';
				
				stri.bw = bw; stri.bh = bh;
				stri.invBw = 1.0/bw; stri.invBh = 1.0/bh;
	
			} else {
				if (node.style.display != 'block') {
					node.style.display = 'block';
				}
				imgNode = stri.imgNode;
				unrotNode = stri.unrotNode;
				offsetNode = stri.offsetNode;
				cropNode = stri.cropNode;
				rotNode = stri.rotNode;
			}
			
			// Maybe move the matrix multiply math inline for an optimization?
			var aff2d = this.sm21;
			aff2d._11 = d12x; aff2d._12 = d12y;
			aff2d._21 = d13x; aff2d._22 = d13y;
			
			
			aff2d.scaleXY(stri.invBw, stri.invBh);
			
			if (this.$B == 1) {	// FF
				node.style.MozTransform = aff2d.toCssString();
				
				node.style.left = '' + v1x + 'px';
				node.style.top = '' + v1y + 'px';
			} else if (this.$B == 2) { // Webkit
				node.style.WebkitTransform = aff2d.toCssString();
				
				node.style.left = '' + v1x + 'px';
				node.style.top = '' + v1y + 'px';
			} else if (this.$B == 3) { // Opera
				node.style.OTransform = aff2d.toCssString();
				
				node.style.left = '' + v1x + 'px';
				node.style.top = '' + v1y + 'px';
			} else if (this.$B == 4) { // IE
				aff2d.applyIeFilter(node);
				
				// Account for the fact that IE's "auto expand" matrix offsets the origin.
				// Took forever to arrive at this elegant, mathematically correct fix.
				var offX = 0.0, offY = 0.0;
				
				if (d12x < 0) offX += d12x;
				if (d13x < 0) offX += d13x;
				if (d12y < 0) offY += d12y;
				if (d13y < 0) offY += d13y;
				
				var screenX = v1x + offX, screenY = v1y + offY;
				
				node.style.left = '' + screenX + 'px';
				node.style.top = '' + screenY + 'px';
			}
		}
		node.style.zIndex = this.z++;
	}
};

c3d.RendererCss3.prototype.drawSprites = function(sprites) {
	var texturing = (this.camera.detail == c3d.Render.Detail.TXTUR);
	if (!texturing) return;
	var persp = (this.camera.projection == c3d.Render.Projection.PERSP);
	
	var v = this.viewport;
	var abs = Math.abs;
	var nearZ = this.camera.nearZ, farZ = this.camera.farZ;
	
	var spritesl = sprites.length;
	for (var i = 0; i < spritesl; ++i) {
		var sprite = sprites[i];
		
		var pos = sprite.center, scale = sprite.scale;	// TODO: Need to get the scale from the concatenated matrix instead
		//c3d.trace(pos.z);
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
			
			node.className = 'c3d-sprite';
			node.style.position = 'absolute';
			node.style.overflow = 'hidden';
			//node.style.opacity = '0.8';
			
			imgNode.className = 'c3d-sprite-img';
			imgNode.style.display = 'block';
			imgNode.style.position = 'absolute';
			imgNode.style.left = '0';
			imgNode.style.top = '0';
			node.appendChild(imgNode);
			
			c3d.avoidSelect(node);
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
