
c3d.Render = {};

/**
 * Enum for render projection (orthographic or perspective).
 * @enum {number}
 */
c3d.Render.Projection = {
	  ORTHO: 1
	, PERSP: 2
};
/**
 * Enum for render detail level (points, wireframe, solid color, textured).
 * @enum {number}
 */
c3d.Render.Detail = {
	  PTS: 1
	, WIRE: 2
	, COLOR: 4
	, TXTUR: 8
};
/**
 * Enum for render element required (polygons, sprites).
 * @enum {number}
 */
c3d.Render.Geometry = {
	  NONE: 1
	, POLY: 2
	, SPRITE: 4
};

/** 
 * A special scenegraph Node that represents a camera for a viewport.
 * @constructor
 * @extends {c3d.Node}
 */
c3d.Camera = function(cfg) {
	this.viewport = null;
	this.projection = c3d.Render.Projection.ORTHO;
	this.detail = c3d.Render.Detail.TXTUR;
	this.aspRatio = 1.0;
	this.fov = 90.0;
	this.nearZ = 0.01;
	this.farZ = 10000.0;
	
	this.vw = 0;
	this.vh = 0;
	
	c3d.setup(this, cfg);
	
	this.viewM = new c3d.Mat4();
	this.invM = new c3d.Mat4();
	
	// scratch vars
	this.sv1 = new c3d.Vec3(); this.sv2 = new c3d.Vec3(); this.sv3 = new c3d.Vec3();
	
	c3d.Node.call(this);
};
c3d.inherits(c3d.Camera, c3d.Node);
	
c3d.Camera.prototype.viewportResize = function() {
	this.vw = this.viewport.w;
	this.vh = this.viewport.h;
	this.aspRatio = this.vw/this.vh;
	
	var m = this.viewM;
	
	if (this.projection == c3d.Render.Projection.ORTHO) {
		m.ident();
	} else {
		m.perspective(this.aspRatio, this.fov, this.nearZ, this.farZ);
	}
	
	m._14 = this.viewport.halfW;
	m._24 = this.viewport.halfH;
	//m._33 = 0.0;
};

// Project from world coordinates to screen coordinates. Saves result in sv.
c3d.Camera.prototype.projectVert = function(pm, wv, sv) {
	sv.trans(pm, wv);
	sv.trans(this.viewM, sv);
};

// Project from world coordinates to screen coordinates. Saves result in stri.
c3d.Camera.prototype.projectTris = function(pm, stris) {
	var screenM = this.viewM;
	var trisl = stris.length;
	
	for (var i = 0; i < trisl; ++i) {
		var stri = stris[i];
		var wtri = stri.tri;
		
		var v1 = wtri.v1, v2 = wtri.v2, v3 = wtri.v3;
		var sv1 = stri.v1, sv2 = stri.v2, sv3 = stri.v3;
		
		// The world-and-camera-transformed verts
		sv1.trans(pm, v1); sv2.trans(pm, v2); sv3.trans(pm, v3);
		wtri.camCenter.set(sv1).add(sv2).add(sv3);	// Don't bother dividing by 3
		
		// The screen-transformed verts
		sv1.trans(screenM, sv1); sv2.trans(screenM, sv2); sv3.trans(screenM, sv3);
		
		stri.center.set(sv1).add(sv2).add(sv3);		// Don't bother dividing by 3
	}
};
//, _update: update
c3d.Camera.prototype.update = function(pm, dt) {
	c3d.Camera._super.update.call(this, pm, dt);
	this.invM.inv3m(this.cm);
};


/**
 * This class would be marked as abstract if that were possible.
 * 
 * @constructor
 */
c3d.RendererBase = function(cfg) {
	this.viewport = null;
	this.camera = null;
	this.detail = 0;
	this.z = 0;				// Track current z-index
	this.objs = [];			// All renderable objects to draw this frame
	this.vw = 0;
	this.vh = 0;
	
	c3d.setup(this, cfg);
	
	this.sv1 = new c3d.Vec3(); this.sv2 = new c3d.Vec3(); this.sv3 = new c3d.Vec3();
	this.svv1 = new c3d.Vec2();
	this.sm41 = new c3d.Mat4(); this.sm42 = new c3d.Mat4(); this.sm43 = new c3d.Mat4();
	this.sm21 = new c3d.Mat2(); this.sm22 = new c3d.Mat2(); this.sm23 = new c3d.Mat2();
};
	
// Different subclasses of RendererBase, optimized for different browsers,
// might need to use a different subclass of SceneNode
c3d.RendererBase.prototype.getSceneNodeClass = function() {
	return c3d.SceneNode;
};

c3d.RendererBase.prototype.viewportResize = function() {
	this.vw = this.viewport.w;
	this.vh = this.viewport.h;
};

c3d.RendererBase.prototype.render = function(scene) {
	this._clear();
	this._render(scene);
	this._flip();
};

c3d.RendererBase.prototype.remove = function(objs) {;};

c3d.RendererBase.prototype._render = function(scene) {
	this.z = 0;
	var objs = this.objs;
	objs.length = 0;
	
	scene.collect(this);
	this.zSort();
	
	// Render different object types in state-sorted batches.
	//c3d.trace('------ start -------');
	
	objs.push({geom: -1});	// sentinel for simpler loop logic
	var gPoly = c3d.Render.Geometry.POLY, gSprite = c3d.Render.Geometry.SPRITE;
	var start = 0, geom = -1;
	var objsl = objs.length, last = objs.length - 1;
	for (var i = 0; i < objsl; ++i) {
		var obj = objs[i];
		var g = obj.geom;
		
		// State switch, render what we have so far
		if (g != geom || i == last) {
			if (i > start) {
				var batch = objs.slice(start, i);
				if (geom == gPoly) {
					//c3d.trace('poly');
					this.drawTriangles(batch);
				} else if (geom == gSprite) {
					//c3d.trace('sprite');
					this.drawSprites(batch);
				}
			}
			start = i;
			geom = g;
		}
	}
};

// These functions really should be pure virtual
c3d.RendererBase.prototype._clear = function() {c3d.trace('_clear');};
c3d.RendererBase.prototype._flip = function() {c3d.trace(' _flip');};

c3d.RendererBase.prototype.cmpZaxis = function(obj1, obj2) {
	return (obj2.center.z - obj1.center.z);	// z-axis sort
};

c3d.RendererBase.prototype.cmpCamDist = function(tri1, tri2) {
	// This works because camCenter is in camera space
	var tri2z = tri2.tri.camCenter.len2(), tri1z = tri1.tri.camCenter.len2();
	return tri2z - tri1z;
};

c3d.RendererBase.prototype.zSort = function() {
	this.objs.sort(this.cmpZaxis);
};
