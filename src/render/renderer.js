
a3d.Render = {};

/**
 * Enum for render projection (orthographic or perspective).
 * @enum {number}
 */
a3d.Render.Projection = {
	  ORTHO: 0
	, PERSP: 1
};
/**
 * Enum for render detail level (points, wireframe, solid color, textured).
 * @enum {number}
 */
a3d.Render.Detail = {
	  PTS: 0
	, WIRE: 1
	, COLOR: 2
	, TXTUR: 4
};

/** 
 * A special scenegraph Node that represents a camera for a viewport.
 * @constructor
 * @extends {a3d.Node}
 */
a3d.Camera = function(cfg) {
	this.viewport = null;
	this.projection = 0;
	this.detail = 4;
	this.aspRatio = 1.0;
	this.fov = 90.0;
	this.nearZ = 0.01;
	this.farZ = 100.0;
	
	this.vw = 0;
	this.vh = 0;
	
	a3d.setup(this, cfg);
	
	this.viewM = new a3d.Mat4();
	this.invM = new a3d.Mat4();
	
	// scratch vars
	this.sv1 = new a3d.Vec3(); this.sv2 = new a3d.Vec3(); this.sv3 = new a3d.Vec3();
	
	a3d.Node.call(this);
};
a3d.inherits(a3d.Camera, a3d.Node);
	
a3d.Camera.prototype.viewportResize = function() {
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
};

// Project from world coordinates to screen coordinates. Saves result in sv.
a3d.Camera.prototype.projectVert = function(pm, wv, sv) {
	sv.trans(pm, wv);
	sv.trans(this.viewM, sv);
};

// Project from world coordinates to screen coordinates. Saves result in stri.
a3d.Camera.prototype.projectTris = function(pm, stris) {
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
a3d.Camera.prototype.update = function(pm, dt) {
	a3d.Camera._super.update.call(this, pm, dt);
	this.invM.inv3m(this.cm);
};


/**
 * This class would be marked as abstract if that were possible.
 * 
 * @constructor
 */
a3d.RendererBase = function(cfg) {
	this.viewport = null;
	this.camera = null;
	this.detail = 0;
	this.z = 0;				// Track current z-index
	this.stris = [];		// All polys to render this frame
	this.vw = 0;
	this.vh = 0;
	
	a3d.setup(this, cfg);
	
	this.sv1 = new a3d.Vec3(); this.sv2 = new a3d.Vec3(); this.sv3 = new a3d.Vec3();
	this.svv1 = new a3d.Vec2();
	this.sm41 = new a3d.Mat4(); this.sm42 = new a3d.Mat4(); this.sm43 = new a3d.Mat4();
	this.sm21 = new a3d.Mat2(); this.sm22 = new a3d.Mat2(); this.sm23 = new a3d.Mat2();
};
	
// Different subclasses of RendererBase, optimized for different browsers,
// might need to use a different subclass of SceneNode
a3d.RendererBase.prototype.getSceneNodeClass = function() {
	return a3d.SceneNode;
};

a3d.RendererBase.prototype.viewportResize = function() {
	this.vw = this.viewport.w;
	this.vh = this.viewport.h;
};

a3d.RendererBase.prototype.render = function(scene) {
	this._clear();
	this._render(scene);
	this._flip();
};

a3d.RendererBase.prototype.remove = function(stris) {;};

a3d.RendererBase.prototype._render = function(scene) {
	this.z = 0;
	this.stris.length = 0;
	
	scene.render(this);
	this.zSort();
	this.drawTriangles(this.stris);
};

// These functions really should be pure virtual
a3d.RendererBase.prototype._clear = function() {a3d.trace('_clear');};
a3d.RendererBase.prototype._flip = function() {a3d.trace(' _flip');};

a3d.RendererBase.prototype.triCmpZaxis = function(tri1, tri2) {
	return (tri2.center.z - tri1.center.z);	// z-axis sort
};

a3d.RendererBase.prototype.triCmpCamDist = function(tri1, tri2) {
	// This works because camCenter is in camera space
	var tri2z = tri2.tri.camCenter.len2(), tri1z = tri1.tri.camCenter.len2();
	return tri2z - tri1z;
};

a3d.RendererBase.prototype.zSort = function() {
	this.stris.sort(this.triCmpZaxis);
};
