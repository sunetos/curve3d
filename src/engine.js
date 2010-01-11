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
 * @extends Class
 */
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
	, simT: 0	// number of seconds based on interval time
	, frameCount: 0
	, paused: true

	/** @constructor
	 * 
	 * @param {string} viewportId - the id of a DOM node that is in the body of the document and "ready."
	 * @param {function} rendererClass - lets you choose the rendering pipeline. If you don't supply one,
	 * it will try to choose the best one for the current browser.
	 */
	, init: function(viewportId, rendererClass) {
		this.id = viewportId;
		this.node = document.getElementById(this.id);
		this.tickers = [];
		
		if (!rendererClass) rendererClass = this.getBestRenderer();
		if (!rendererClass) return;
		
		this.camera = new a3d.Camera({viewport: this});
		this.renderer = new rendererClass({viewport: this, camera: this.camera});
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
			case 'FF':
			case 'FF2':
			case 'FF3':
			case 'Op':
				return a3d.RendererCanvas2d; break;
			case 'FF35':
			case 'FF36':
				//return a3d.RendererSVG; break;
				//return a3d.RendererCanvas2dBlit; break;
				return a3d.RendererCanvas2d; break;
				//return a3d.RendererCss3; break;
			
			case 'Saf':
				return a3d.RendererCanvas2d; break;
			case 'Chr':
			case 'IE':
				return a3d.RendererCss3; break;
		}
		return null;
	}
	
	, play: function() {
		this.paused = false;
		if (this.interval > 0) {
			var self = this;
			this.lastT = (new Date()).getTime();
			this.intervalId = setInterval(function() {
				self.tick();
			}, this.interval);
			
			this.tick();
		}
	}
	, pause: function() {
		this.paused = true;
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
		var inter = this.interval;
		++this.frameCount;
		
		if (this.startT) {
			var thisT = (new Date()).getTime();
			var dtMs = thisT - this.lastT;
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
		
		// TODO: This logic is flawed, and the camera will be a frame behind
		var cam = this.camera;
		//cam.update(dt);
		this.scene.update(cam.invM, dt);				// update geometry
		
		// Skip render frames instead of queueing them up
		if (dtMs > inter*1.5) {
			//a3d.trace('skipping a render frame');
			//return;
		}
		this.renderer.render(this.scene);	// render to buffer & draw buffer to screen
	}
});

/**
 * A base element in the a3d hierarchy. Has a parent and children.
 * Not necessarily renderable.
 * @extends Class
 */
a3d.Entity = Class.extend({
	  id: null
	, parent: null
	, children: []

	/** @constructor */
	, init: function(cfg) {
		a3d.setup(this, cfg);
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
		var ch = this.children; var chl = ch.length;
		for (var i = 0; i < chl; ++i) {
			if (ch[i] === child) {
				ch.splice(i, 1);
				break;
			}
		}
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

/**
 * A type of Entity that supports geometric transformation.
 * Automatically handles parent/child matrix transformations.
 * Not necessarily renderable.
 * @extends a3d.Entity
 */
a3d.Node = a3d.Entity.extend({
	  m: null		// local matrix
	, cm: null		// concatenated matrix
	, sm: null		// scratch matrix
	, q: null		// rotation quaternion
	, sq: null		// scratch quaternion
	, pos: null		// position vector
	, scale: null	// scale vector
	, dirty: false
	
	/** @constructor */
	, init: function(cfg) {
		this._super(cfg);
		
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
	, remove: function() {;}
});

/**
 * A renderable Node in a scenegraph.
 * @extends a3d.Node
 */
a3d.SceneNode = a3d.Node.extend({
	  shader: null
	
	/** @constructor */
	, init: function(cfg) {
		this._super(cfg);
		
		if (!this.shader) {
			this.shader = a3d.$DefaultShader;
		}
	}
	
	, render: function(r) {
		var chs = this.children; var chl = chs.length;
		for (var i = 0; i < chl; ++i) {
			var ch = chs[i];
			
			var render = ch.render;
			if (render) ch.render(r);
		}
		
		this._render(r);
	}
	
	, _render: function(r) {;}
});

/**
 * A basic scenegraph of a3d.SceneNodes.
 * @extends Class
 */
a3d.Scene = Class.extend({
	  root: null
	, baseM: null
	
	/** @constructor */
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

