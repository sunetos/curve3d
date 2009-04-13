/*
* Adamia 3D Engine
* Copyright (c) 2009 Adam R. Smith
* Licensed under the new BSD License:
* http://www.opensource.org/licenses/bsd-license.php
*
* Project home: http://code.google.com/p/adamia-3d/
*/

// TODO: Figure out the namespace desired and wrap the whole thing in a single closure

if (typeof(a3d) == 'undefined') a3d = {};

adamia3d = function() {

	var viewports = {};

	function init(viewportId) {
		//a3d.trace(BrowserDetect.browser);
		var v = viewports[viewportId] = new a3d.Viewport(viewportId);
		
		v.play();
		
		return v;
	}
	
	/*
	// tryin to get around the firebug errors
	setInterval(function() {
		for (var id in viewports) {
			//a3d.Viewport.viewports.push(this);
			var v = viewports[k];
			v.tick();
		}
	}, 50);
	*/

	return {
		init: init
	};
}();

// From http://www.thespanner.co.uk/2009/01/29/detecting-browsers-javascript-hacks/
a3d.$B = (function x(){})[-5]=='x'?'FF3':(function x(){})[-6]=='x'?'FF2':/a/[-1]=='a'?'FF':'\v'=='v'?'IE':/a/.__proto__=='//'?'Saf':/s/.test(/a/.toString)?'Chr':/^function \(/.test([].sort)?'Op':'Unknown';

// Standardized method of supplying options to constructors
a3d.setup = function(obj, cfg) {
	for (k in cfg) {
		if (obj[k] !== undefined) {
			obj[k] = cfg[k];
		}
	}
};
// Map through a virtual lookup table
a3d.setupMap = function(obj, map, cfg) {
	for (k in cfg) {
		if (obj[k] !== undefined) {
			obj[map[k]] = cfg[k];
		}
	}
};

// Super-simple event handler
a3d.on = function(node, type, handler) {
	if (node.addEventListener) {
		node.addEventListener('resize', handler, false);
	} else if (node.attachEvent) {
		node.attachEvent('on' + type, handler);
	}
};

// Not sure why I felt the need to optimize this to death
a3d.padLeft = function(str, len, ch) {
    if (!ch) ch = ' ';
	
	var diff = len - str.length;
	var pad = '';
	while (diff) {
		if (diff & 1) pad += ch;
		diff >>= 1;
		
		ch += ch;
	};
	
    return pad + str;
}

// From http://flesler.blogspot.com/2008/11/fast-trim-function-for-javascript.html
a3d.trim = function(str) {
	var start = -1, end = str.length;
	while (str.charCodeAt(--end) < 33);
	while (str.charCodeAt(++start) < 33);
	return str.slice(start, end + 1);
};

a3d.trace = function(stuff) {
	if (typeof(console) != 'undefined') {
		console.log(stuff);
	}
}

a3d.numCmp = function(a, b) {
	return (a - b);
}

// Minimalist ajax data fetcher. Only intended for loading models.
// Async is the only support mode, no intention of allowing synchronous in JS.
// Built off of jQuery 1.3.2 source by deleting 90% of the ajax() function.
a3d.get = function(url, success, fail) {
	var xhr = window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
	var contentType = 'text/plain';
	var async = true;
	
	var requestDone = false;
	xhr.open('GET', url, async);
	
	try {
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		xhr.setRequestHeader("Accept", contentType);
	} catch(e){}
	
	var onreadystatechange = function(){
		if (xhr.readyState == 0) {
			if (ival) {
				clearInterval(ival);
				ival = null;
			}
		} else if (!requestDone && xhr && (xhr.readyState == 4)) {
			requestDone = true;
			
			if (ival) {
				clearInterval(ival);
				ival = null;
			}

			var succeeded;
			try {
				succeeded = !xhr.status && location.protocol == "file:" ||
					(xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || xhr.status == 1223;
			} catch(e){
				succeeded = false;
			}
			
			if (succeeded) {
				var data = xhr.responseText;
				if (success) success(data, url);
			} else {
				if (fail) fail(url);
			}
			
			if (async) xhr = null;
		}
	};
	
	if (async) var ival = setInterval(onreadystatechange, 13);
	
	try {
		xhr.send(null);
	} catch(e) {
		if (fail) fail(url);
	}

}

a3d.Viewport = Class.extend({
	  id: null
	, node: null
	, renderer: null
	, camera: null
	, w: 0, h: 0
	, halfW: 0, halfH: 0
	, scene: null
	, tickers: []
	
	, interval: 1000.0/30.0
	, intervalId: 0
	, startT: 0
	, lastT: 0

	// viewportId is the id of a DOM node that is in the body of the document and "ready."
	// rendererClass lets you choose the rendering pipeline. If you don't supply one,
	// it will try to choose the best one for the current browser.
	, init: function(viewportId, rendererClass) {
		this.id = viewportId;
		this.node = document.getElementById(this.id);
		this.tickers = [];
		
		if (!rendererClass) rendererClass = this.getBestRenderer();
		if (!rendererClass) return;
		
		this.camera = new a3d.Camera({viewport: this});
		this.renderer = new rendererClass({viewport: this, camera: this.camera});
		this.scene = new a3d.Scene();
		
		a3d.on(this.node, 'resize', this.resize);
		this.resize();
	}
	
	, resize: function() {
		this.w = parseInt(this.node.offsetWidth);
		this.h = parseInt(this.node.offsetHeight);
		this.halfW = this.w >> 1;
		this.halfH = this.h >> 1;
		
		this.camera.viewportResize();
		this.renderer.viewportResize();
	}
	
	// Figure out the current browser and choose the fastest renderer
	, getBestRenderer: function() {
		switch (a3d.$B) {
			case 'FF2':
			case 'FF3':
			case 'FF':
				//return a3d.RendererSVG; break;
				//return a3d.RendererCanvas2dBlit; break;
				//return a3d.RendererCss3; break;
			case 'Op':
			case 'Saf':
				return a3d.RendererCanvas2d; break;
			case 'Chr':
			case 'IE':
				return a3d.RendererCss3; break;
		}
		return null;
	}
	
	, play: function() {
		if (this.interval > 0) {
			var self = this;
			this.intervalId = setInterval(function() {
				self.tick();
			}, this.interval);
			
			this.tick();
		}
	}
	, pause: function() {
		if (this.intervalId > 0) {
			clearInterval(this.intervalId);
			this.intervalId = 0;
		}
	}
	
	, onTick: function(ticker) {
		this.tickers.push(ticker);
	}
	, unTick: function(ticker) {
		this.tickers.remove(ticker);
	}
	
	, tick: function() {
		var dt = 0.0;
		if (this.startT) {
			var thisT = (new Date()).getTime();
			dt = (thisT - this.lastT)*0.001;
			this.lastT = thisT;
		} else {
			this.lastT = this.startT = (new Date()).getTime();
		}
		
		var tk = this.tickers;
		for (var i = 0; i < tk.length; ++i) {
			tk[i](dt);
		}
		
		var cam = this.camera;
		cam.update(dt);
		this.scene.update(cam.invM, dt);				// update geometry
		this.renderer.render(this.scene);	// render to buffer & draw buffer to screen
	}
});

a3d.Entity = Class.extend({
	  id: null
	, parent: null
	, children: []

	, init: function() {
		this.children = [];
	}
	
	, addChild: function(child, dontSetP) {
		this.children.push(child);
		if (!dontSetP) child.parent = this; 
	}
	, addChildren: function(chs) {
		for (var i = 0; i < chs.length; ++i) {
			this.addChild(chs[i]);
		}
	}
	, removeChild: function(child) {
		this.children.remove(child);
	}
	
	, appendTo: function(parent) {
		if (this.parent) this.parent.removeChild(this);
		(this.parent = parent).addChild(this, true);
	}
	
	// Recursive update that will update all children first
	, update: function() {
		var chs = this.children; var chl = chs.length;
		for (var i = 0; i <  chl; ++i) {
			var ch = chs[i];
			
			ch.update();
		}
	}
});

a3d.Node = a3d.Entity.extend({
	  m: null		// local matrix
	, cm: null		// concatenated matrix
	, sm: null		// scratch matrix
	, q: null		// rotation quaternion
	, sq: null		// scratch quaternion
	, pos: null		// position vector
	, scale: null	// scale vector
	, dirty: false
	
	, init: function() {
		this._super();
		
		this.m = new a3d.Mat4();
		this.cm = new a3d.Mat4();
		this.sm = new a3d.Mat4();
		this.q = new a3d.Quat();
		this.sq = new a3d.Quat();
		this.pos = new a3d.Vec3();
		this.scale = new a3d.Vec3(1.0, 1.0, 1.0);
	}
	
	// Recursive update that will update all children first. 
	// pm & dt are passed in even though it's unnecessary, to help speed
	, update: function(pm, dt) {
		var m = this.m, cm = this.cm;
		
		cm.ident();
		cm.mulm(pm, m);
		
		if (this.dirty) {
			var q = this.q, sc = this.scale, pos = this.pos;
			
			m.fromQuat(q);
			m.scalev(sc);
			m.moveToV(pos);
			
			this.dirty = false;
		}
		
		var chs = this.children; var chl = chs.length;
		for (var i = 0; i <  chl; ++i) {
			var ch = chs[i];
			
			ch.update(this.cm, dt);
		}
	}
	
	, moveBy: function(x, y, z) {
		var pos = this.pos;
		pos.x += x; pos.y += y; pos.z += z;
		this.dirty = true;
	}
	, moveTo: function(x, y, z) {
		var pos = this.pos;
		pos.x = x; pos.y = y; pos.z = z;
		this.dirty = true;
	}
	
	// TODO: Optimize the next few functions by baking axis vectors into matrices
	, rot: function(axis, a) {
		axis = axis.clone().norm();
		
		//this.sm.fromRotAxis(axis, a);
		this.sq.fromRotAxis(axis, a);
		this.q.mul(this.sq);
		//this.m.mul3(this.sm);
		
		this.dirty = true;
	}
	
	, rotX: function(a) {
		this.sq.fromRotAxis(a3d.X, a);
		this.q.mul(this.sq);
		
		this.dirty = true;
	}
	, rotY: function(a) {
		this.sq.fromRotAxis(a3d.Y, a);
		this.q.mul(this.sq);
		
		this.dirty = true;
	}
	, rotZ: function(a) {
		this.sq.fromRotAxis(a3d.Z, a);
		this.q.mul(this.sq);
		
		this.dirty = true;
	}
	, scaleBy: function(x, y, z) {
		var sc = this.scale;
		sc.x *= x; sc.y *= y; sc.z *= z;
		
		this.dirty = true;
	}
	, scaleTo: function(x, y, z) {
		var sc = this.scale;
		sc.x = x; sc.y = y; sc.z = z;
		
		this.dirty = true;
	}
});

a3d.SceneNode = a3d.Node.extend({
	  domNode: null
	
	/*
	, init: function() {
		this._super();
	}
	*/
	
	, render: function(r) {
		var chs = this.children; var chl = chs.length;
		for (var i = 0; i < chl; ++i) {
			var ch = chs[i];
			
			ch.render(r);
		}
		
		this._render(r);
	}
	
	, _render: function(r) {;}
});

a3d.Scene = Class.extend({
	  root: null
	, baseM: null
	
	, init: function() {
		this.root = new a3d.SceneNode();
		this.baseM = new a3d.Mat4();
	}
	
	, addChild: function(child) {
		this.root.addChild(child);
	}
	
	, removeChild: function(child) {
		this.root.removeChild(child);
	}
	
	, update: function(baseM, dt) {
		if (!baseM) baseM = this.baseM;
		this.root.update(baseM, dt);
	}
	
	, render: function(r) {
		this.root.render(r);
	}
});

// Enumerations for render options
a3d.Render = {
	  Projection: {
		  ORTHO: 0
		, PERSP: 1
	}
	, Detail: {
		  PTS: 0
		, WIRE: 1
		, COLOR: 2
		, TXTUR: 4
	}
};

// TODO: Finish adding inverse camera matrix to the equation to allow free camera movement. Should be pretty easy now
a3d.Camera = a3d.Node.extend({
	  viewport: null
	, projection: 0
	, aspRatio: 1.0
	, fov: 90.0
	, nearZ: 0.01
	, farZ: 100.0
	
	, vw: 0
	, vh: 0
	, viewM: null
	, invM: null
	
	// scratch vars
	, sv1: null, sv2: null, sv3: null
	
	, init: function(cfg) {
		a3d.setup(this, cfg);
		
		this.viewM = new a3d.Mat4();
		this.invM = new a3d.Mat4();
		
		this.sv1 = new a3d.Vec3(); this.sv2 = new a3d.Vec3(); this.sv3 = new a3d.Vec3();
		
		this._super();
	}
	
	, viewportResize: function() {
		this.vw = this.viewport.w;
		this.vh = this.viewport.h;
		this.aspRatio = this.vw/this.vh;
		
		var m = this.viewM;
		
		if (this.projection == a3d.Render.Projection.ORTHO) {
			m.ident();
		} else {
			m.perspective(this.aspRatio, this.fov, this.nearZ, this.farZ);
		}
		
		m._14 = this.viewport.halfW;
		m._24 = this.viewport.halfH;
		//m._33 = 0.0;
	}
	
	// Project from world coordinates to screen coordinates. Saves result in sv.
	, projectVert: function(pm, wv, sv) {
		sv.trans(pm, wv);
		sv.trans(this.viewM, sv);
	}
	
	// Project from world coordinates to screen coordinates. Saves result in stri.
	, projectTri: function(pm, wtri, stri) {
		var screenM = this.viewM;
		
		stri.tri = wtri;
		var v1 = wtri.v1, v2 = wtri.v2, v3 = wtri.v3;
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		
		// The screen-transformed verts
		sv1.trans(pm, v1); sv2.trans(pm, v2); sv3.trans(pm, v3);
		sv1.trans(screenM, sv1); sv2.trans(screenM, sv2); sv3.trans(screenM, sv3);
		
		stri.center.set(sv1).add(sv2).add(sv3).div(3.0);
	}
	//, _update: update
	, update: function(dt) {
		this._super(a3d.M4, dt);
		this.invM.inv3m(this.m);
	}
});

// This class would be marked as abstract if that were possible
a3d.RendererBase = Class.extend({
	  viewport: null
	, camera: null
	, detail: 0
	, vw: 0
	, vh: 0
	
	// scratch vars to prevent per-frame object allocation
	, sv1: null, sv2: null, sv3: null
	, svv1: null
	, sm41: null, sm42: null, sm43: null
	, sm21: null, sm22: null, sm23: null
	
	, init: function(cfg) {
		a3d.setup(this, cfg);
		
		this.sv1 = new a3d.Vec3(); this.sv2 = new a3d.Vec3(); this.sv3 = new a3d.Vec3();
		this.svv1 = new a3d.Vec2();
		this.sm41 = new a3d.Mat4(); this.sm42 = new a3d.Mat4(); this.sm43 = new a3d.Mat4();
		this.sm21 = new a3d.Mat2(); this.sm22 = new a3d.Mat2(); this.sm23 = new a3d.Mat2();
	}
	
	// Different subclasses of RendererBase, optimized for different browsers,
	// might need to use a different subclass of SceneNode
	, getSceneNodeClass: function() {
		return a3d.SceneNode;
	}
	
	, viewportResize: function() {
		this.vw = this.viewport.w;
		this.vh = this.viewport.h;
	}
	
	, render: function(scene) {
		this._clear();
		this._render(scene);
		this._flip();
	}
	, _render: function(scene) {
		scene.render(this);
	}
	
	// These functions really should be pure virtual
	, _clear: function() {a3d.trace('_clear');}
	, _flip: function() {a3d.trace(' _flip');}
});

a3d.newCanvas = function(w, h) {
	var cvs = document.createElement('canvas');
	cvs.style.width = '' + w + 'px';
	cvs.style.height = '' + h + 'px';
	cvs.width = w;
	cvs.height = h;
	
	return cvs;
}

a3d.RendererCanvas2dBase = a3d.RendererBase.extend({
	  cvs: null
	, ctx: null
	, rcvs: null
	, rctx: null
	, pixelCount: 0
	, byteCount: 0
	
	, init: function(cfg) {
		this._super(cfg);
		
		if (!this.viewport) return;
		
		var vn = this.viewport.node;
		
		// Made multiple canvas layers for rendering
		var cvss = ['cvs', 'rcvs'];
		for (var k in cvss) {
			var cvsName = cvss[k];
			
			this[cvsName] = a3d.newCanvas(vn.offsetWidth, vn.offsetHeight);
		}
		
		vn.appendChild(this.cvs);
		this.ctx = this.cvs.getContext('2d');
		this.rctx = this.rcvs.getContext('2d');
		
		this.pixelCount = this.cvs.width*this.cvs.height;
		this.byteCount = this.pixelCount << 2;
	}
});

a3d.RendererCanvas2d = a3d.RendererCanvas2dBase.extend({
	  init: function(cfg) {
		this._super(cfg);
	}
	
	, _clear: function() {
		this.ctx.clearRect(0, 0, this.vw, this.vh);
		this.rctx.clearRect(0, 0, this.vw, this.vh);
		this.rctx.save();
		//this.rctx.setTransform(1, 0, 0, 1, 0, 0);
		//this.rctx.moveTo(0, 0);
	}
	
	, _flip: function() {
		this.ctx.drawImage(this.rcvs, 0, 0);
		this.rctx.restore();
	}
	
	, drawPoint: function(pm, col) {
		var screenM = this.sm1;
		//screenM.ident();
		screenM.mulm(this.viewM, pm);
		var tx = screenM._14, ty = screenM._24, tz = screenM._34;
		
		if (tz < 0.0001) return;
		
		var vw = this.vw, vh = this.vh;
		//a3d.trace('tx: ' + tx + ' ty: ' + ty + ' vw: ' + vw + ' vh: ' + vh);
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
	}
	
	, drawLines: function(pm, col) {
		
	}
	
	, drawTriangleTexture: function(stri, img) {
		var tri = stri.tri;
		var uvm = tri.uvm, iuvm = tri.iuvm;
		if (!iuvm) return;
		
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		var rctx = this.rctx;
		
		var v1x = sv1.x, v1y = sv1.y, v2x = sv2.x, v2y = sv2.y, v3x = sv3.x, v3y = sv3.y;
		var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		var winding = d13y*d12x - d13x*d12y;
		if (winding < 0) return;
		
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
		
		rctx.save();
		
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
		
		// Bake the affine transform, including translation
		rctx.transform(aff2d11, aff2d21, aff2d12, aff2d22, scrDX, scrDY);
		//console.log([bx1, by1, bw, bh, dstbx, dstby, dstbw, dstbh]);
		rctx.drawImage(img, bx1, by1, bw, bh, dstbx, dstby, dstbw, dstbh);
		
		rctx.restore();
	}
	
	, drawTriangleColor: function(stri) {
		var tri = stri.tri;
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		var rctx = this.rctx;
		
		var v1x = sv1.x, v1y = sv1.y, v2x = sv2.x, v2y = sv2.y, v3x = sv3.x, v3y = sv3.y;
		var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		var winding = d13y*d12x - d13x*d12y;
		if (winding < 0) return;
		
		rctx.beginPath();
		//rctx.fillStyle = a3d.Blue.str;
		rctx.fillStyle = tri.v1.col.str;
		rctx.moveTo(v1x, v1y);
		rctx.lineTo(v2x, v2y);
		rctx.lineTo(v3x, v3y);
		rctx.closePath();
		rctx.fill();
	}
});

a3d.RendererCanvas2dBlit = a3d.RendererCanvas2dBase.extend({
	  imgData: null
	, pixels: null		// Caching several canvas lookup vars for performance
	, origPixels: null
	
	, init: function(cfg) {
		this._super(cfg);
		
		this.imgData = this.rctx.getImageData(0, 0, this.cvs.width, this.cvs.height);
		//this.origImgData = this.imgData;
		this.origPixels = this.pixels = this.imgData.data;
	}
	
	, _clear: function() {
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
	}
	
	, _flip: function() {
		this.rctx.putImageData(this.imgData, 0, 0);
		this.ctx.drawImage(this.rcvs, 0, 0);
	}
	
	, drawPoint: function(pm, col, colStr) {
		var bc = this.byteCount, ps = this.pixels;
		var m = this.m;
		
		m.mulm(this.viewM, pm);
		var tx = m._14, ty = m._24;
		
		var vw = this.vw, vh = this.vh;
		//a3d.trace('tx: ' + tx + ' ty: ' + ty + ' vw: ' + vw + ' vh: ' + vh);
		if (tx < 0 || tx >= vw || ty < 0 || ty >= vh) return;
		
		var pixOff = ty*vw + tx;
		var byteOff = pixOff << 2;
		//ps[byteOff] = 255;
		//a3d.trace('r: ' + (col >> 16) + ' g: ' + ((col >> 8) & 0xFF) + ' b: ' + (col & 0xFF));
		
		ps[byteOff++] = col.r;
		ps[byteOff++] = col.g;
		ps[byteOff++] = col.b;
		ps[byteOff] = 255;
	}
});

var dummyCounter = 0;

a3d.RendererCss3 = a3d.RendererBase.extend({
	  triFrag: null		// Cache a DOM fragment for triangle proxy node trees
	, $B: 1				// Fake enum for browser-specific logic
	, sqrt: Math.sqrt
	, cos: Math.cos
	, sin: Math.sin
	, acos: Math.acos
	, asin: Math.asin
	, halfPI: Math.PI*0.5
	
	, init: function(cfg) {
		this._super(cfg);
		
		this.triFrag = document.createDocumentFragment();
		var tmpDiv = document.createElement('div');
		tmpDiv.innerHTML = '<div class="a3d-tri" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0; overflow: hidden;">' +
			'<div class="a3d-tri-unrot" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;">' +
			'<div class="a3d-tri-offset" style="position: absolute; width: 1px; height: 1px; left:0; top: 0;">' +
			'<div class="a3d-tri-crop" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0; overflow: hidden;">' +
			//'<div class="a3d-tri-crop" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;">' +
			'<div class="a3d-tri-rot" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;">' +
			//'<img class="a3d-tri-img" style="position: absolute; width: 1px; height: 1px; left: 0; top: 0;" />' +
			'</div></div></div></div></div>';
		this.triFrag.appendChild(tmpDiv.firstChild);
		
		switch (a3d.$B) {
			case 'FF':	this.$B = 1; break;
			case 'Saf':
			case 'Chr':	this.$B = 2; break;
			case 'IE':	this.$B = 3; break;
			default:	this.$B = null; break;
		}
	}
	
	, _clear: function() {
	}
	
	, _flip: function() {
	}
	
	, drawPoint: function(pm, col) {
	}
	
	, drawLines: function(pm, col) {
	}
	
	, drawTriangleTexture: function(stri, img) {
		var tri = stri.tri;
		var uvm = tri.uvm, iuvm = tri.iuvm;
		if (!iuvm) return;
		
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		
		var v1x = sv1.x, v1y = sv1.y, v2x = sv2.x, v2y = sv2.y, v3x = sv3.x, v3y = sv3.y;
		var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		var winding = d13y*d12x - d13x*d12y;
		if (winding < 0) {
			if (stri.node && stri.node.style.display != 'none') {
				stri.node.style.display = 'none';
			}
			return;
		}
		
		var uv1 = tri.uv1, uv2 = tri.uv2, uv3 = tri.uv3;
		
		// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
		// from the texture image to the triangle, not counting translation yet
		var w = img.width, h = img.height;
		
		// Ensure existence of the proxy DOM object
		var node = stri.node, imgNode = stri.imgNode, unrotNode, offsetNode, cropNode, rotNode;
		if (!node || !imgNode || imgNode.tagName != 'IMG') {
			// Cleanup other render types
			if (node) node.parentNode.removeChild(node);
			if (imgNode) imgNode.parentNode.removeChild(imgNode);
			
			var triFrag = this.triFrag.cloneNode(true);
			stri.node = node = this.viewport.node.appendChild(triFrag.firstChild);
			
			stri.unrotNode = unrotNode = node.firstChild;
			stri.offsetNode = offsetNode = unrotNode.firstChild;
			stri.cropNode = cropNode = offsetNode.firstChild;
			stri.rotNode = rotNode = cropNode.firstChild;
			
			stri.imgNode = imgNode = img.cloneNode(false);
			imgNode.className = 'a3d-tri-img';
			imgNode.style.display = 'block';
			imgNode.style.position = 'absolute';
			imgNode.style.left = '0';
			imgNode.style.top = '0';
			rotNode.appendChild(imgNode);
			
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
			} else if (this.$B == 3) { // IE
				m.applyIeFilter(imgNode);
				
				rotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
				unrotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
				
				var cosRot = this.cos(rotRad), sinRot = this.sin(rotRad);
				console.log(cosRot);
				console.log(sinRot);
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
			
			//imgNode.style.left = '' + (-(pp.x + 64)) + 'px';
			imgNode.style.left = '' + (-pp.x) + 'px';
			imgNode.style.top = '' + (-pp.y) + 'px';
			
			/*			
			var img2 = imgNode.cloneNode(false);
			document.body.appendChild(img2);
			//this.viewport.node.appendChild(img2);
			if (this.transProp == 'IE')
				m.applyIeFilter(img2);
			console.log(img2);
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
		
		aff2d.scaleXY(stri.invBw, stri.invBh);
		
		if (this.$B == 1) {	// FF
			node.style.MozTransform = aff2d.toCssString();	
		} else if (this.$B == 2) { // Webkit
			node.style.WebkitTransform = aff2d.toCssString();	
		} else if (this.$B == 3) { // IE
			aff2d.applyIeFilter(node);
			if (dummyCounter++ == 0) a3d.trace(node.outerHTML);
		}
		
		node.style.left = '' + v1x + 'px';
		node.style.top = '' + v1y + 'px';
	}
	
	, drawTriangleColor: function(stri) {
		var tri = stri.tri;
		var uvm = tri.uvm, iuvm = tri.iuvm;
		if (!iuvm) return;
		
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		
		var v1x = sv1.x, v1y = sv1.y, v2x = sv2.x, v2y = sv2.y, v3x = sv3.x, v3y = sv3.y;
		var d12x = v2x - v1x, d12y = v2y - v1y, d13x = v3x - v1x, d13y = v3y - v1y;
		
		var winding = d13y*d12x - d13x*d12y;
		if (winding < 0) {
			if (stri.node && stri.node.style.display != 'none') {
				stri.node.style.display = 'none';
			}
			return;
		}
		
		var uv1 = tri.uv1, uv2 = tri.uv2, uv3 = tri.uv3;
		
		// Multiply inverse UV matrix by affine 2x2 matrix for this triangle to get full transform
		// from the texture image to the triangle, not counting translation yet
		var w = 64, h = 64;
		
		// Ensure existence of the proxy DOM object
		var node = stri.node, imgNode = stri.imgNode, unrotNode, offsetNode, cropNode, rotNode;
		//console.log(imgNode.nodeName);
		if (!node || !imgNode || imgNode.nodeName != 'div') {
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
			imgNode.style.backgroundColor = '#009999';
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
			} else if (this.$B == 3) { // IE
				rotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
				unrotNode.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
				
				var cosRot = this.cos(rotRad), sinRot = this.sin(rotRad);
				console.log(cosRot);
				console.log(sinRot);
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
				unrotNode.style.left = '' + (bw*0.5) + 'px';
				unrotNode.style.top = '' + (bh*0.5) + 'px';
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
		} else if (this.$B == 2) { // Webkit
			node.style.WebkitTransform = aff2d.toCssString();	
		} else if (this.$B == 3) { // IE
			aff2d.applyIeFilter(node);
		}
		
		node.style.left = '' + v1x + 'px';
		node.style.top = '' + v1y + 'px';
	}
});

a3d.RendererSVG = a3d.RendererBase.extend({
	  ns: 'http://www.w3.org/2000/svg'
	, svg: null
	, g: null
	, pt: null
	, tris: []
	, m: null			// Random scratch matrix
	
	, triCount: 0
	  
	, init: function(cfg) {
		this._super(cfg);
		
		if (!this.viewport) return;
		
		this.tris = [];
		this.triCount = 0;
		this.m = new a3d.Mat4();
		
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
	}
	
	, _clear: function() {
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
	}
	
	, _flip: function() {
		
	}
	
	, drawPoint: function(pm, col) {
		var m = this.m;
		
		m.mulm(this.viewM, pm);
		var tx = m._14, ty = m._24, tz = m._34;
		
		if (tz < 0.0001) return;
		
		var vw = this.vw, vh = this.vh;
		//a3d.trace('tx: ' + tx + ' ty: ' + ty + ' vw: ' + vw + ' vh: ' + vh);
		if (tx < 0 || tx >= vw || ty < 0 || ty >= vh) return;
		
		var ns = this.ns;
		var pt = this.pt.cloneNode(false);
		pt.setAttribute('x', tx);
		pt.setAttribute('y', ty);
		//pt.setAttribute('width', 1);
		//pt.setAttribute('height', 1);
		pt.setAttribute('fill', col.str);
		this.g.appendChild(pt);
	}
	
	, drawLines: function(pm, col) {
		
	}
	
	, drawTriangle: function(pm, tri) {
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
	}
});


a3d.Color = Class.extend({
	  num: 0x000000
	, r: 0, g: 0, b: 0
	, str: ''
	
	, init: function(num) {
		this.set(num);
	}
	, set: function(num) {
		num = num & 0xFFFFFF;
		this.num = num;
		this.r = num >> 16; this.g = (num >> 8) & 0xFF; this.b = num & 0xFF;
		//this.str = 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
		this.str = '#' + a3d.padLeft(num.toString(16), 6, '0');
	}
});
a3d.Black = new a3d.Color(0x000000);
a3d.White = new a3d.Color(0xFFFFFF);
a3d.Red = new a3d.Color(0xFF0000);
a3d.Green = new a3d.Color(0x00FF00);
a3d.Blue = new a3d.Color(0x0000FF);
a3d.DarkGray = new a3d.Color(0x333333);
a3d.Gray = new a3d.Color(0x999999);

// Renderable objects
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

a3d.Triangle = a3d.SceneNode.extend({
	  v1: null, v2: null, v3: null
	, vn1: null, vn2: null, vn3: null
	, uv1: null, uv2: null, uv3: null
	, center: null
	, uvm: null			// The texture projection matrix
	, iuvm: null		// The inverse texture projection matrix
	, uuvm: null
	, iuuvm: null
	, originX: 0.0, originY: 0.0	// cache the texture origin calculated from UVs
	
	, img: null			// Source texture reference
	, texture: null		// Transformed texture via UVs
	
	, init: function(v1, v2, v3, uv1, uv2, uv3) {
		this._super();
		
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
	}
	
	, setTexture: function(img) {
		this.img = img;
		this.buildTexture();
	}
	
	// Precalculate UV projection matrix and its inverse
	, buildTexture: function() {
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
	}
	
	, _render: function(r) {
		r.drawTriangle(this.cm, this);
	}
});

a3d.ScreenTriangle = Class.extend({
	  v1: null, v2: null, v3: null
	, center: null
	, tri: null
	
	, init: function(tri) {
		this.tri = tri;
		
		this.v1 = new a3d.Vert(); this.v2 = new a3d.Vert(); this.v3 = new a3d.Vert();
		this.center = new a3d.Vert();
	}
});

// Static class, just call the functions directly without instantiating a MeshLoader
a3d.MeshLoader = {
	  newMesh: function(name, vs, vns, uvs, fs, fns) {
		var md = new a3d.MeshData();
		md.vs = vs; md.vns = vns; md.uvs = uvs; md.fs = fs; md.fns = fns;
		var m = new a3d.Mesh(md);
		m.name = name;
		
		return m;
	}
	, parseOBJ: function(obj) {
		var vs = [], vns = [], uvs = [], fs = [], fns = [];
		
		var lines = obj.split("\n");
		var lineCount = lines.length;
		var dblSpace = /[ ][ ]/g;
		var objs = [];
		
		for (var i = 0; i < lineCount; ++i) {
			var line = lines[i];
			if (line.length == 0) continue;
			if (line[1] == '#') continue;
			
			var l2 = line.substr(0, 2);
			switch (l2) {
				case 'o ': {
					var name = a3d.trim(line.substr(2));
					if (vs.length > 0 && objs.length == 0) {	// Handle data before the first named object
						var m = this.newMesh('[noname]', vs, vns, uvs, fs, fns);
						objs.push(m);
					}
					//vs = []; vns = []; uvs = []; fs = []; fns = [];
					fs = []; fns = [];
					var m = this.newMesh(name, vs, vns, uvs, fs, fns);
					objs.push(m);
					
					break;
				}
				case 'v ': {
					var xyz = a3d.trim(line.substr(2).replace(dblSpace, ' ')).split(' ');
					//var col = new a3d.Color(Math.random()*0xFFFFFF);
					var col = a3d.DarkGray;
					var v = new a3d.Vert(parseFloat(xyz[0]), -parseFloat(xyz[1]), parseFloat(xyz[2]), col);
					vs.push(v);
					break;
				}
				case 'vn': {
					var xyz = a3d.trim(line.substr(3).replace(dblSpace, ' ')).split(' ');
					var vn = new a3d.Vec3(parseFloat(xyz[0]), parseFloat(xyz[1]), parseFloat(xyz[2]));
					vn.norm();
					vns.push(vn);
					break;
				}
				case 'vt': {
					var xy = a3d.trim(line.substr(3).replace(dblSpace, ' ')).split(' ');
					var uv = new a3d.UV(parseFloat(xy[0]), parseFloat(xy[1]));
					uvs.push(uv);
					break;
				}
				case 'f ': {
					var vvv = a3d.trim(line.substr(2).replace(dblSpace, ' ')).split(' ');
					var vvvl = vvv.length;
					
					var fvs = [], fuvs = [], fvns = [];
					for (var j = 0; j < vvvl; ++j) {
						var sub = vvv[j].split('/');
						var subl = sub.length;
						
						fvs.push(vs[parseInt(sub[0]) - 1]);
						if (subl > 1 && sub[1].length) {
							fuvs.push(uvs[parseInt(sub[1]) - 1]);
						}
						if (subl > 2 && sub[2].length) {
							fns.push(vns[parseInt(sub[2]) - 1]);
						}
					}
					//console.log(vvvl);
					if (vvvl == 3) {
						fs.push(new a3d.Triangle(fvs[0], fvs[1], fvs[2], fuvs[0], fuvs[1], fuvs[2]));
					} else {
						fs.push(new a3d.Triangle(fvs[0], fvs[1], fvs[3], fuvs[0], fuvs[1], fuvs[3]));
						fs.push(new a3d.Triangle(fvs[1], fvs[2], fvs[3], fuvs[1], fuvs[2], fuvs[3]));
					}
					break;
				}
			}
		}
		
		if (vs.length > 0 && objs.length == 0) {	// Handle data not in a named object
			var m = this.newMesh('[noname]', vs, vns, uvs, fs, fns);
			objs.push(m);
		}
		
		var objl = objs.length;
		for (var i = 0; i < objl; ++i) {
			//objs[i].data.fs = objs[i].data.fs.slice(9, 10);
			objs[i].build();
		}
		
		return objs;
	}
	
	// Optionally lets you specify your own loadFunc to let jQuery or your favorite lib do the work.
	// Just make sure its params are: url, successFunc, failFunc
	, loadOBJ: function(url, success, fail, loadFunc) {
		if (!loadFunc) loadFunc = a3d.get;
		
		var objData = loadFunc(url, function(data) {
			if (success) success(a3d.MeshLoader.parseOBJ(data));
		}, function() {
			if (fail) fail(null);
		});
	}
};

a3d.MeshData = Class.extend({
	  vs: []	// verts
	, vns: []	// vert normals
	, uvs: []	// UV coords
	, fs: []	// faces
	, fns: []	// face normals
	
	, init: function() {
		this.clear();	// must do this the first time, so that Class variables arent referenced
	}
	, clear: function() {
		this.vs = []; this.vns = []; this.uvs = [];
		this.fs = []; this.fns = [];
	}
});

// TODO: Investigate memory usage effects from keeping references to loaded images
a3d.TextureLib = Class.extend({
	  imgByUrl: {}
	  
	
	, init: function() {
		this.imgByUrl = {};
	}
	
	, get: function(url, callback) {
		var imgs = this.imgByUrl;
		
		if (imgs[url] !== undefined) {
			if (typeof(callback) == 'function') callback(imgs[url]);
		} else {
			var img = new Image();
			img.onload = function() {
				imgs[url] = img;
				if (typeof(callback) == 'function') callback(imgs[url]);
			};
			img.src = url;
		}
	}
});
a3d.$TexLib = new a3d.TextureLib();

a3d.Mesh = a3d.SceneNode.extend({
	  data: null
	, textures: null
	, stris: null
	
	, init: function(data) {
		this._super();
		
		this.data = (data) ? data : null;
		this.textures = [];
		
		if (this.data) this.build();
	}
	
	, build: function() {
		// Save an array for the screen triangles to prevent allocating new ones every frame
		var data = this.data;
		if (!data) return;
		
		var dl = data.fs.length;
		if (dl == 0) return;

		var tris = data.fs;
		this.stris = new Array(dl);
		for (var i = 0; i < dl; ++i) {
			this.stris[i] = new a3d.ScreenTriangle(tris[i]);
		}
		
		this.moveToCenter();
	}
	, addTextureImage: function(img) {
		var tris = this.data.fs;
		var trisl = tris.length;
		for (var i = 0; i < trisl; ++i) {
			var tri = tris[i];
			tri.setTexture(img);
		}
		this.textures.push(img);
	}
	, addTextureUrl: function(url) {
		var self = this;
		a3d.$TexLib.get(url, function(img) {
			var tris = self.data.fs;
			var trisl = tris.length;
			for (var i = 0; i < trisl; ++i) {
				var tri = tris[i];
				tri.setTexture(img);
			}
			self.textures.push(img);
		});
	}
	
	, moveToCenter: function() {
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
	}
	
	//, update: function(r) {
	//	this._super(r);
	//}
	
	, _renderColor: function(r) {
		var tris = this.data.fs;
		var stris = this.stris;
		var trisl = tris.length;
		var camera = r.camera;
		
		for (var i = 0; i < trisl; ++i) {
			var stri = stris[i];
			var tri = stri.tri;
			camera.projectTri(this.cm, tri, stri);
			
			r.drawTriangleColor(stri);
		}
	}
	, _renderTexture: function(r) {
		var tris = this.data.fs;
		var stris = this.stris;
		var trisl = tris.length;
		var img = this.textures[0];
		var camera = r.camera;
		
		for (var i = 0; i < trisl; ++i) {
			var stri = stris[i];
			var tri = stri.tri;
			camera.projectTri(this.cm, tri, stri);
			
			r.drawTriangleTexture(stri, tri.img);
		}
	}
	
	, triCmp: function(tri1, tri2) {
		return (tri2.center.z - tri1.center.z);
	}
	
	, zSort: function() {
		this.stris.sort(this.triCmp);
	}
	
	, _render: function(r) {
		if (!this.data) return;
		
		this.zSort();
		
		if (this.textures.length) {
			this._renderTexture(r);
		} else {
			this._renderColor(r);
		}
	}
	
	, debugUVs: function() {
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
	}
});
