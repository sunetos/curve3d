// TODO: Figure out the namespace desired and wrap the whole thing in a single closure

/** @namespace */
adamia3d = function() {

	var viewports = {};

	function init(viewportId, rendererClass) {
		//a3d.trace(BrowserDetect.browser);
		var v = viewports[viewportId] = new a3d.Viewport(viewportId, rendererClass);
		
		//v.play();
		
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


/** 
 * Represents a render viewport as well as a block-level page element.
 * 
 * @param {string} viewportId - the id of a DOM node that is in the body of the document and "ready."
 * @param {object} rendererClass - lets you choose the rendering pipeline. If you don't supply one,
 * it will try to choose the best one for the current browser.
 * 
 * @constructor
 */
a3d.Viewport = function(viewportId, rendererClass) {
	this.id = null;
	this.node = null;
	this.renderer = null;
	this.camera = null;
	this.w = 0;
	this.h = 0;
	this.halfW = 0;
	this.halfH = 0;
	this.scene = null;
	this.tickers = [];
	this.timeline = null;
	this.interval = 1000.0/30.0;
	this.intervalId = 0;
	this.startT = 0;
	this.lastT = 0;
	this.simT = 0	// number of seconds based on interval time;
	this.frameCount = 0;
	this.paused = true;
	
	
	this.id = viewportId;
	this.node = document.getElementById(this.id);
	this.tickers = [];
	this.timeline = new a3d.TimelineManager(this);
	
	if (!rendererClass) rendererClass = this.getBestRenderer();
	if (!rendererClass) return;
	
	this.camera = new a3d.Camera({viewport: this});
	if (this.node) this.renderer = new rendererClass({viewport: this, camera: this.camera});
	this.scene = new a3d.Scene();
	this.scene.addChild(this.camera);
	
	// Pause the simulation when the body/tab loses focus
	var playFunc = function() {
		if (this.startT) this.play();	// Ignore first load
	};
	var pauseFunc = this.pause;
	if (a3d.$B == 'IE') {
		a3d.on(document, 'focusin', a3d.bind(this, playFunc));
		a3d.on(document, 'focusout', a3d.bind(this, pauseFunc));
	} else {
		a3d.on(window, 'focus', a3d.bind(this, playFunc));
		a3d.on(window, 'blur', a3d.bind(this, pauseFunc));
	}
	
	if (this.node) {
		a3d.on(this.node, 'resize', this.resize);
		this.resize();
	}
};

a3d.Viewport.prototype.resize = function() {
	this.w = parseInt(this.node.offsetWidth);
	this.h = parseInt(this.node.offsetHeight);
	this.halfW = this.w >> 1;
	this.halfH = this.h >> 1;
	
	this.camera.viewportResize();
	this.renderer.viewportResize();
};
	
// Figure out the current browser and choose the fastest renderer
a3d.Viewport.prototype.getBestRenderer = function() {
	//console.log(a3d.$B);
	switch (a3d.$B) {
		case 'FF':
		case 'FF2':
		case 'FF3':
		case 'OP':
			return a3d.RendererCanvas2d; break;
		case 'FF3.5':
		case 'FF3.6':
			//return a3d.RendererSVG; break;
			//return a3d.RendererCanvas2dBlit; break;
			return a3d.RendererCss3Hybrid; break;
			//return a3d.RendererCss3; break;
		
		case 'SA':
			return a3d.RendererCanvas2d; break;
		case 'CH':
		case 'IE8':
		case 'IE9':
			return a3d.RendererCss3; break;
	}
	return null;
};
	
a3d.Viewport.prototype.play = function() {
	this.paused = false;
	if (this.interval > 0) {
		var self = this;
		this.lastT = (new Date()).getTime();
		this.intervalId = setInterval(function() {
			self.tick();
		}, this.interval);
		
		this.tick();
	}
};
a3d.Viewport.prototype.pause = function() {
	this.paused = true;
	if (this.intervalId > 0) {
		clearInterval(this.intervalId);
		this.intervalId = 0;
	}
};
	
a3d.Viewport.prototype.onTick = function(ticker) {
	this.tickers.push(ticker);
};
a3d.Viewport.prototype.unTick = function(ticker) {
	this.tickers.remove(ticker);
};
	
a3d.Viewport.prototype.tick = function() {
	var dt = 0.0, dtMs = 0;
	var inter = this.interval;
	++this.frameCount;
	
	if (this.startT) {
		var thisT = (new Date()).getTime();
		dtMs = thisT - this.lastT;
		this.simT += inter;		// Watch for floating point error accumuluation here
		
		// Skip frames instead of queueing them up.
		// Let the next frame calculate the new DT that
		// spans both frames
		if (dtMs < inter*0.5) {
			//a3d.trace('skipping a simulation frame');
			return;
		}
		
		this.lastT = thisT;
		
		dt = dtMs*0.001;
	} else {
		this.lastT = this.startT = (new Date()).getTime();
		this.simT += inter;
	}
	
	var tk = this.tickers;
	for (var i = 0; i < tk.length; ++i) {
		tk[i](dt);
	}
	
	// Update animation timelines first
	this.timeline.tick(dtMs);
	
	// TODO: This logic is flawed, and the camera will be a frame behind
	var cam = this.camera;
	//cam.update(dt);
	this.scene.update(cam.invM, dt);				// update geometry
	
	// Skip render frames instead of queueing them up
	//if (dtMs > inter*1.5) {
		//a3d.trace('skipping a render frame');
		//return;
	//}
	if (this.renderer) this.renderer.render(this.scene);	// render to buffer & draw buffer to screen
};

/**
 * A base element in the a3d hierarchy. Has a parent and children.
 * Not necessarily renderable.
 * @constructor
 */
a3d.Entity = function(cfg) {
	this.id = null;
	this.parent = null;
	this.children = [];
	
	a3d.setup(this, cfg);
	this.children = [];
};
	
a3d.Entity.prototype.addChild = function(child, dontSetP) {
	this.children.push(child);
	if (!dontSetP) child.parent = this; 
};
a3d.Entity.prototype.addChildren = function(chs) {
	for (var i = 0; i < chs.length; ++i) {
		this.addChild(chs[i]);
	}
};
a3d.Entity.prototype.removeChild = function(child) {
	var ch = this.children; var chl = ch.length;
	for (var i = 0; i < chl; ++i) {
		if (ch[i] === child) {
			ch.splice(i, 1);
			break;
		}
	}
};

a3d.Entity.prototype.appendTo = function(parent) {
	if (this.parent) this.parent.removeChild(this);
	(this.parent = parent).addChild(this, true);
};

// Recursive update that will update all children first
a3d.Entity.prototype.update = function() {
	var chs = this.children; var chl = chs.length;
	for (var i = 0; i <  chl; ++i) {
		var ch = chs[i];
		
		ch.update();
	}
};

/**
 * A type of Entity that supports geometric transformation.
 * Automatically handles parent/child matrix transformations.
 * Not necessarily renderable.
 * @constructor
 * @extends {a3d.Entity}
 */
a3d.Node = function(cfg) {
	a3d.Entity.call(this, cfg);
	
	this.m = new a3d.Mat4();					// local matrix
	this.cm = new a3d.Mat4();					// concatenated matrix
	this.sm = new a3d.Mat4();					// scratch matrix
	this.q = new a3d.Quat();					// rotation quaternion
	this.sq = new a3d.Quat();					// scratch quaternion
	this.pos = new a3d.Vec3();					// position vector
	this.scale = new a3d.Vec3(1.0, 1.0, 1.0);	// scale vector
	this.dirty = false;
};
a3d.inherits(a3d.Node, a3d.Entity);
	
// Recursive update that will update all children first. 
// pm & dt are passed in even though it's unnecessary, to help speed
a3d.Node.prototype.update = function(pm, dt) {
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
};

a3d.Node.prototype.moveBy = function(x, y, z) {
	var pos = this.pos;
	pos.x += x; pos.y += y; pos.z += z;
	this.dirty = true;
};
a3d.Node.prototype.moveTo = function(x, y, z) {
	var pos = this.pos;
	pos.x = x; pos.y = y; pos.z = z;
	this.dirty = true;
};

// TODO: Optimize the next few functions by baking axis vectors into matrices
a3d.Node.prototype.rot = function(axis, a) {
	axis = axis.clone().norm();
	
	//this.sm.fromRotAxis(axis, a);
	this.sq.fromRotAxis(axis, a);
	this.q.mul(this.sq);
	//this.m.mul3(this.sm);
	
	this.dirty = true;
};

a3d.Node.prototype.rotX = function(a) {
	this.sq.fromRotAxis(a3d.X, a);
	this.q.mul(this.sq);
	
	this.dirty = true;
};
a3d.Node.prototype.rotY = function(a) {
	this.sq.fromRotAxis(a3d.Y, a);
	this.q.mul(this.sq);
	
	this.dirty = true;
};
a3d.Node.prototype.rotZ = function(a) {
	this.sq.fromRotAxis(a3d.Z, a);
	this.q.mul(this.sq);
	
	this.dirty = true;
};
a3d.Node.prototype.scaleBy = function(x, y, z) {
	var sc = this.scale;
	sc.x *= x; sc.y *= y; sc.z *= z;
	
	this.dirty = true;
};
a3d.Node.prototype.scaleTo = function(x, y, z) {
	var sc = this.scale;
	sc.x = x; sc.y = y; sc.z = z;
	
	this.dirty = true;
};
a3d.Node.prototype.remove = function() {;};


/**
 * A renderable Node in a scenegraph.
 * @constructor
 * @extends {a3d.Node}
 */
a3d.SceneNode = function(cfg) {
	this.shader = null;
	this.geom = a3d.Render.Geometry.NONE;
	
	a3d.Node.call(this, cfg);
	
	if (!this.shader) {
		this.shader = a3d.$DefaultShader;
	}
};
a3d.inherits(a3d.SceneNode, a3d.Node);
	
a3d.SceneNode.prototype.collect = function(r) {
	var chs = this.children; var chl = chs.length;
	for (var i = 0; i < chl; ++i) {
		var ch = chs[i];
		
		var collect = ch.collect;
		if (collect) ch.collect(r);
	}
	
	this._collect(r);
};

a3d.SceneNode.prototype._collect = function(r) {;};

/**
 * A basic scenegraph of a3d.SceneNodes.
 * @constructor
 */
a3d.Scene = function() {
	this.root = new a3d.SceneNode();
	this.baseM = new a3d.Mat4();
};
	
a3d.Scene.prototype.addChild = function(child) {
	this.root.addChild(child);
};

a3d.Scene.prototype.removeChild = function(child) {
	this.root.removeChild(child);
};

a3d.Scene.prototype.update = function(baseM, dt) {
	if (!baseM) baseM = this.baseM;
	this.root.update(baseM, dt);
};

a3d.Scene.prototype.collect = function(r) {
	this.root.collect(r);
};

