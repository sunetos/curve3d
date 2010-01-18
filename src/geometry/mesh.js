a3d.UV = a3d.Vec2.extend({
	  clone: function() {
		return new a3d.UV(this.x, this.y);
	}
});

a3d.Vert = a3d.Vec3.extend({
	  col: a3d.Black
	
	, init: function(x, y, z, col) {
		this._super(x, y, z);
		
		if (col) this.col = (col instanceof a3d.Color) ? col : new a3d.Color(col);
	}
	, clone: function() {
		return new a3d.Vert(this.x, this.y, this.z, this.col);
	}
});

/**
 * @constructor
 * @extends {a3d.SceneNode}
 */
a3d.Triangle = function(v1, v2, v3, uv1, uv2, uv3) {
	this.v1 = null; this.v2 = null; this.v3 = null;
	this.vn1 = null, this.vn2 = null, this.vn3 = null;
	this.center = null;
	this.camCenter = null;
	this.uv1 = null; this.uv2 = null; this.uv3 = null;
	this.uvm = null;			// The texture projection matrix
	this.iuvm = null;			// The inverse texture projection matrix
	this.uuvm = null;
	this.iuuvm = null;
	
	// cache the texture origin calculated from UVs
	this.originX = 0.0; this.originY = 0.0;
	
	this.img = null;			// Source texture reference
	this.texture = null;		// Transformed texture via UVs
	
	a3d.SceneNode.call(this);
	
	v1 = this.v1 = (v1) ? v1.clone() : new a3d.Vert();
	v2 = this.v2 = (v2) ? v2.clone() : new a3d.Vert();
	v3 = this.v3 = (v3) ? v3.clone() : new a3d.Vert();
	
	this.uv1 = (uv1) ? uv1.clone() : null;
	this.uv2 = (uv2) ? uv2.clone() : null;
	this.uv3 = (uv3) ? uv3.clone() : null;
	
	this.uvm = new a3d.Mat2();
	this.iuvm = new a3d.Mat2();
	this.uuvm = new a3d.Mat3();
	this.iuuvm = new a3d.Mat3();
	
	this.center = v1.clone().add(v2).add(v3);
	this.center.div(3.0);
	
	this.camCenter = new a3d.Vec3();
};
a3d.inherits(a3d.Triangle, a3d.SceneNode);

a3d.Triangle.prototype.setTexture = function(img) {
	this.img = img;
	this.buildTexture();
};

// Precalculate UV projection matrix and its inverse
a3d.Triangle.prototype.buildTexture = function() {
	var img = this.img, w, h;
	if (!img || !(w = img.width) || !(h = img.height)) return;
	
	var uv1 = this.uv1, uv2 = this.uv2, uv3 = this.uv3;
	if (!this.uv1 || !this.uv2 || !this.uv3) return;
	
	if (this.texture) delete(this.texture);
	//var txt = this.texture = a3d.newCanvas(w, h);
	
	var uvm = this.uvm, iuvm = this.iuvm;
	
	var v1x = uv1.x, v1y = 1.0 - uv1.y, v2x = uv2.x, v2y = 1.0 - uv2.y, v3x = uv3.x, v3y = 1.0 - uv3.y;
	v1x *= w; v2x *= w; v3x *= w;
	v1y *= h; v2y *= h; v3y *= h;
	
	this.originX = v1x; this.originY = v1y;
	
	var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
	
	//var winding = d13y*d12x - d13x*d12y;

	uvm._11 = d12x; uvm._12 = d12y;
	uvm._21 = d13x; uvm._22 = d13y;

	iuvm.invm(uvm);
	
	// Build a 2nd set of matrices that are scaled for inverse-transforming the image
	var v1x = uv1.x, v1y = 1.0 - uv1.y, v2x = uv2.x, v2y = 1.0 - uv2.y, v3x = uv3.x, v3y = 1.0 - uv3.y;
	
	var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
	var uuvm = this.uuvm;
	uuvm._11 = d12x; uuvm._12 = d12y;
	uuvm._21 = d13x; uuvm._22 = d13y;
	//uuvm.moveTo(v1x, v1y);

	this.iuuvm.invm(uuvm);
};

a3d.Triangle.prototype._render = function(r) {
	r.drawTriangle(this.cm, this);
};

a3d.ScreenTriangle = function(tri) {
	this.tri = tri;
	
	this.v1 = new a3d.Vert(); this.v2 = new a3d.Vert(); this.v3 = new a3d.Vert();
	this.center = new a3d.Vert();
};

/**
 * @constructor
 * @extends {a3d.SceneNode}
 */
a3d.Mesh = function(cfg) {
	this.data = null;
	this.stris = null;
	
	a3d.SceneNode.call(this, cfg);
	
	if (this.data) this.build();
};
a3d.inherits(a3d.Mesh, a3d.SceneNode);
	
a3d.Mesh.prototype.build = function() {
	// Save an array for the screen triangles to prevent allocating new ones every frame
	var data = this.data;
	if (!data) return;
	
	var dl = data.fs.length;
	if (dl == 0) return;

	var shader = this.shader;
	var tris = data.fs;
	this.stris = new Array(dl);
	for (var i = 0; i < dl; ++i) {
		var tri = tris[i];
		tri.shader = shader;
		this.stris[i] = new a3d.ScreenTriangle(tri);
	}
	
	this.moveToCenter();
	
	shader.callbacks['texturechange'] = a3d.bind(this, this.buildTextures);
	if (shader.textures && shader.textures.length) {
		this.buildTextures(shader.textures);
	}
};
a3d.Mesh.prototype.buildTextures = function(imgs) {
	var tris = this.data.fs;
	var trisl = tris.length;
	
	for (var i = 0, img; img = imgs[i]; ++i) {
		for (var j = 0; j < trisl; ++j) {
			var tri = tris[j];
			tri.setTexture(img);
		}
	}
};

a3d.Mesh.prototype.moveToCenter = function() {
	if (this.data) {
		var tris = this.data.fs;
		var trisl = tris.length;
		
		if (trisl) {
			var avg = new a3d.Vec3();
			
			for (var i = 0; i < trisl; ++i) {
				var tri = tris[i];
				
				avg.add(tri.v1); avg.add(tri.v2); avg.add(tri.v3);
				
				//this.addChild(tri);
			}
			avg.div(trisl*3.0);
			//a3d.trace(avg);
			this.m.moveToV(avg);
			avg.div(3.0);
			
			for (var i = 0; i < trisl; ++i) {
				var tri = tris[i];
				tri.v1.sub(avg);
				tri.v2.sub(avg);
				tri.v3.sub(avg);
			}
		}
		
	}
};

a3d.Mesh.prototype._render = function(r) {
	if (!this.data) return;
	
	r.camera.projectTris(this.cm, this.stris);
	
	// Super fast in-place concat, taken from
	// http://ejohn.org/blog/javascript-array-remove/
	r.stris.push.apply(r.stris, this.stris);
};

a3d.Mesh.prototype.remove = function(r) {
	// Remove this object from the renderer's display list
	r.remove(this.stris);
};

a3d.Mesh.prototype.debugUVs = function() {
	var img = this.data.fs[0].img;
	if (!img) return;
	var w = img.width, h = img.height;
	var lw = 16, lh = 16;
	
	var cvs = a3d.newCanvas(w, h);
	var ctx = cvs.getContext('2d');
	
	var dbgDiv = document.createElement('div');
	dbgDiv.id = 'a3d-debug-uvs';
	dbgDiv.style.position = 'absolute';
	dbgDiv.style.width = '' + w + 'px';
	dbgDiv.style.height = '' + h + 'px';
	dbgDiv.style.left = '' + 80 + 'px';
	dbgDiv.style.top = '' + 400 + 'px';
	
	dbgDiv.appendChild(cvs);
	document.body.appendChild(dbgDiv);
	
	ctx.drawImage(img, 0, 0);
	
	var tris = this.data.fs;
	var trisl = tris.length;
	for (var i = 0; i < trisl; ++i) {
		var tri = tris[i];
		
		var x1 = w*tri.uv1.x, y1 = h - h*tri.uv1.y,
		    x2 = w*tri.uv2.x, y2 = h - h*tri.uv2.y,
			x3 = w*tri.uv3.x, y3 = h - h*tri.uv3.y;
		
		ctx.strokeStyle = '#000000';
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.lineTo(x3, y3);
		ctx.closePath();
		ctx.stroke();
		
		// color r, g, b for uv points 1,2,3
		ctx.fillStyle = '#FF0000';
		ctx.fillRect(x1 - 1, y1 - 1, 2, 2);
		ctx.fillStyle = '#00FF00';
		ctx.fillRect(x2 - 1, y2 - 1, 2, 2);
		ctx.fillStyle = '#0000FF';
		ctx.fillRect(x3 - 1, y3 - 1, 2, 2);
		
		var avgX = (x1 + x2 + x3)*0.3333333, avgY = (y1 + y2 + y3)*0.3333333;
		var numLabel = document.createElement('div');
		numLabel.style.position = 'absolute';
		numLabel.style.textAlign = 'center';
		numLabel.style.fontSize = '77%';
		numLabel.style.color = '#CCCCCC';
		numLabel.style.width = '' + lw + 'px';
		numLabel.style.height = '' + lh + 'px';
		numLabel.style.zIndex = 10;
		numLabel.style.left = '' + (avgX - lw*0.5) + 'px';
		numLabel.style.top = '' + (avgY - lh*0.5) + 'px';
		numLabel.innerText = '' + (i + 1);
		
		dbgDiv.appendChild(numLabel);
	}
};
