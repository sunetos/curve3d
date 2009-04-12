/*
* Adamia 3D Engine
* Copyright (c) 2009 Adam R. Smith
* Licensed under the new BSD License:
* http://www.opensource.org/licenses/bsd-license.php
*
* Project home: http://code.google.com/p/adamia-3d/
*/

if (typeof(a3d) == 'undefined') a3d = {};


// Taken from http://ejohn.org/blog/simple-javascript-inheritance/

// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);       
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})();


// Cache references to Math API functions for speed.
// NOTE: I ran a pile of benchmarks comparing these functions against many inline abs hacks with bitwise math, etc.
// Surprisingly, a cached reference to Math.abs was faster than  (x < 0 ? -x : x) and (x ^ (x >> 31)) - (x >> 31)) in all modern browsers.
a3d.MathClass = Class.extend({
	  abs: Math.abs
	, sqrt: Math.sqrt
	, cos: Math.cos
	, sin: Math.sin
	, tan: Math.tan
	, cot: Math.cot
	, PI: Math.PI
});

// Where appropriate, all math operations are applied inline to the left-hand object.
// This requires a little more boilerplate code, but can significantly cut down on object creation
// by allowing manual memory management (such as allocation pools).
//
// NOTE: I ran a pile of benchmarks comparing the use of .xyz properties vs. an array of elements.
// In all modern browsers, the .xyz properties were at least twice as fast.
a3d.Vec3 = a3d.MathClass.extend({
	  x: 0.0
	, y: 0.0
	, z: 0.0
	
	, init: function(x, y, z) {
		this.x = x || 0.0;
		this.y = y || 0.0;
		this.z = z || 0.0;
	}
	
	, ident: function() {
		this.x = 1.0; this.y = 1.0; this.z = 1.0;
		return this;
	}
	, zero: function() {
		this.x = 0.0; this.y = 0.0; this.z = 0.0;
		return this;
	}
	, clone: function() {
		return new a3d.Vec3(this.x, this.y, this.z);
	}
	, set: function(v) {
		this.x = v.x; this.y = v.y; this.z = v.z;
		
		return this;
	}
	
	// Scalar operations
	, mul: function(s) {
		this.x *= s; this.y *= s; this.z *= s;
		return this;
	}
	, div: function(s) {
		s = 1/s;
		this.x *= s; this.y *= s; this.z *= s;
		return this;
	}
	, neg: function() {
		this.x = -this.x; this.y = -this.y; this.z = -this.z;
		return this;
	}
	
	// Vector operations
	, add: function(v) {
		this.x += v.x; this.y += v.y; this.z += v.z;
		return this;
	}
	, sub: function(v) {
		this.x -= v.x; this.y -= v.y; this.z -= v.z;
		return this;
	}
	, dot: function(v) {
		return this.x*v.x + this.y*v.y + this.z*v.z;
	}
	, cross: function(v) {
		this.x = this.y*v.z - this.z*v.y;
		this.y = this.z*v.x - this.x*v.z;
		this.z = this.x*v.y - this.y*v.x;
		return this;
	}
	
	// Miscellaneous
	
	, len: function() {
		return this.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	}
	, len2: function() {
		return this.x*this.x + this.y*this.y + this.z*this.z;
	}
	, norm: function() {
		var l = this.len();
		this.div(l);
		return this;
	}
	
	, eq: function(v) {
		return ((this.abs(this.x - v.x) < 0) && (this.abs(this.y - v.y) < 0) && (this.abs(this.z - v.z) < 0));
	}
	
	, dist: function(v) {
		var dx = v.x - this.x, dy = v.y - this.y, dz = v.z - this.z;
		return this.sqrt(dx*dx + dy*dy + dz*dz);
	}
	, dist2: function(v) {
		var dx = v.x - this.x, dy = v.y - this.y, dz = v.z - this.z;
		return dx*dx + dy*dy + dz*dz;
	}
	, dist2d: function(v) {
		var dx = v.x - this.x, dy = v.y - this.y;
		return this.sqrt(dx*dx + dy*dy);
	}
	, dist2d2: function(v) {
		var dx = v.x - this.x, dy = v.y - this.y;
		return dx*dx + dy*dy;
	}
	
	, trans: function(m, v) {
		var vx = v.x, vy = v.y, vz = v.z;
		
		this.x = m._11*vx + m._12*vy + m._13*vz + m._14;
		this.y = m._21*vx + m._22*vy + m._23*vz + m._24;
		this.z = m._31*vx + m._32*vy + m._33*vz + m._34;
		
		return this;
	}
	
	// Pretty darn slow function, but it should only be used in debugging anyway.
	, toString: function() {
		return 'vec3: (' + this.x + ',' + this.y + ',' + this.z + ')';
	}
});

a3d.X = new a3d.Vec3(1.0, 0.0, 0.0);
a3d.Y = new a3d.Vec3(0.0, 1.0, 0.0);
a3d.Z = new a3d.Vec3(0.0, 0.0, 1.0);

a3d.NX = new a3d.Vec3(-1.0, 0.0, 0.0);
a3d.NY = new a3d.Vec3(0.0, -1.0, 0.0);
a3d.NZ = new a3d.Vec3(0.0, 0.0, -1.0);

a3d.Vec2 = a3d.MathClass.extend({
	  x: 0.0
	, y: 0.0
	
	, init: function(x, y) {
		this.x = x || 0.0;
		this.y = y || 0.0;
	}
	
	, ident: function() {
		this.x = 1.0; this.y = 1.0;
	}
	, zero: function() {
		this.x = 0.0; this.y = 0.0;
	}
	, clone: function() {
		return new a3d.Vec2(this.x, this.y);
	}
	, set: function(v) {
		this.x = v.x; this.y = v.y;
		
		return this;
	}
	
	// Scalar operations
	, mul: function(s) {
		this.x *= s; this.y *= s;
	}
	, div: function(s) {
		s = 1.0/s;
		this.x *= s; this.y *= s;
	}
	
	// Vector operations
	, add: function(v) {
		this.x += v.x; this.y += v.y;
		return this;
	}
	, sub: function(v) {
		this.x -= v.x; this.y -= v.y;
		return this;
	}
	, dot: function(v) {
		return this.x*v.x + this.y*v.y;
	}
	
	, dist: function(v) {
		var dx = v.x - this.x, dy = v.y - this.y;
		return this.sqrt(dx*dx + dy*dy);
	}
	, dist2: function(v) {
		var dx = v.x - this.x, dy = v.y - this.y;
		return dx*dx + dy*dy;
	}
	
	// Miscellaneous
	
	, len: function() {
		return this.sqrt(this.x*this.x + this.y*this.y);
	}
	, len2: function() {
		return this.x*this.x + this.y*this.y;
	}
	, norm: function() {
		var l = this.len();
		this.div(l);
	}
	
	, eq: function(v) {
		return ((this.abs(this.x - v.x) < 0) && (this.abs(this.y - v.y) < 0));
	}
	, trans: function(m, v) {
		var vx = v.x, vy = v.y;
		
		this.x = m._11*vx + m._21*vy + m._13;
		this.y = m._12*vx + m._22*vy + m._23;
		
		return this;
	}
	, trans2: function(m, v) {
		var vx = v.x, vy = v.y;
		
		this.x = m._11*vx + m._21*vy;
		this.y = m._12*vx + m._22*vy;
		
		return this;
	}
	
	// Pretty darn slow function, but it should only be used in debugging anyway.
	, toString: function() {
		return 'vec2: (' + this.x + ',' + this.y + ')';
	}
});

a3d.Quat = a3d.MathClass.extend({
	  x: 0.0
	, y: 0.0
	, z: 0.0
	, w: 1.0
	
	, ident: function() {
		this.x = 0.0; this.y = 0.0; this.z = 0.0; this.w = 1.0;
	}
	, zero: function() {
		this.x = 0.0; this.y = 0.0; this.z = 0.0; this.w = 0.0;
	}
	
	// Rotation about an axis vector v by angle a
	, fromRotAxis: function(v, a) {
		var halfA = a*0.5;
		var cosA = this.cos(halfA), sinA = this.sin(halfA);
   
		this.x = v.x*sinA; this.y = v.y*sinA; this.z = v.z*sinA; this.w = cosA;
		
		this.norm();
	}
	
	, len: function() {
		return this.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
	}
	, len2: function() {
		return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
	}
	, norm: function() {
		var l = this.len();
		l = 1.0/l;
		this.x *= l; this.y *= l; this.z *= l; this.w *= l;
		
		return this;
	}
	
	, mulq: function(q1, q2) {
		var x1 = q1.x, y1 = q1.y, z1 = q1.z, w1 = q1.w;
		var x2 = q2.x, y2 = q2.y, z2 = q2.z, w2 = q2.w;
   
		this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
		this.y = w1*y2 + y1*w2 + z1*x2 - x1*z2;
		this.z = w1*z2 + z1*w2 + x1*y2 - y1*x2;
		this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
	}
	, mul: function(q2) {
		var x1 = this.x, y1 = this.y, z1 = this.z, w1 = this.w;
		var x2 = q2.x, y2 = q2.y, z2 = q2.z, w2 = q2.w;
   
		this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
		this.y = w1*y2 + y1*w2 + z1*x2 - x1*z2;
		this.z = w1*z2 + z1*w2 + x1*y2 - y1*x2;
		this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
	}
})

// NOTE: I ran a pile of benchmarks comparing instance scratch variables to local scratch variables to no scratch variables.
// local scratch variables were fastest in all modern browsers.
a3d.Mat4 = a3d.MathClass.extend({
	  _11: 1.0, _12: 0.0, _13: 0.0, _14: 0.0
	, _21: 0.0, _22: 1.0, _23: 0.0, _24: 0.0
	, _31: 0.0, _32: 0.0, _33: 1.0, _34: 0.0
	, _41: 0.0, _42: 0.0, _43: 0.0, _44: 1.0
	
	, els: [this._11, this._12, this._13, this._14,
	        this._21, this._22, this._23, this._24,
			this._31, this._32, this._33, this._34,
			this._41, this._42, this._43, this._44]
	
	// Scratch vars for operations on other matrices
	, m111: 0.0, m112: 0.0, m113: 0.0, m114: 0.0
	, m121: 0.0, m122: 0.0, m123: 0.0, m124: 0.0
	, m131: 0.0, m132: 0.0, m133: 0.0, m144: 0.0
	, m141: 0.0, m142: 0.0, m143: 0.0, m144: 0.0
	
	, m211: 0.0, m212: 0.0, m213: 0.0, m214: 0.0
	, m221: 0.0, m222: 0.0, m223: 0.0, m224: 0.0
	, m231: 0.0, m232: 0.0, m233: 0.0, m244: 0.0
	, m241: 0.0, m242: 0.0, m243: 0.0, m244: 0.0
	
	//, init: function() {
	//}
	
	, ident: function() {
		this._11 = 1.0; this._12 = 0.0; this._13 = 0.0; this._14 = 0.0;
		this._21 = 0.0; this._22 = 1.0; this._23 = 0.0; this._24 = 0.0;
		this._31 = 0.0; this._32 = 0.0; this._33 = 1.0; this._34 = 0.0;
		this._41 = 0.0; this._42 = 0.0; this._43 = 0.0; this._44 = 1.0;
	}
	, zero: function() {
		this._11 = this._12 = this._13 = this._14 =
		this._21 = this._22 = this._23 = this._24 =
		this._31 = this._32 = this._33 = this._34 =
		this._41 = this._42 = this._43 = this._44 = 0.0;
	}
	
	// TODO: This could use some optimization probably
	, fromArray: function(el) {
		a3d.setupMap(this, this.els, el);
	}
	
	, det3: function() {
		var m11 = this._11, m12 = this._12, m13 = this._13,
		    m21 = this._21, m22 = this._22, m23 = this._23,
		    m31 = this._31, m32 = this._32, m33 = this._33;
		
		return (m11*m22 - m21*m12)*m33
		     - (m11*m32 - m31*m12)*m23
		     + (m21*m32 - m31*m22)*m13;
	}
	, det4: function() {
		var m11 = this._11, m12 = this._12, m13 = this._13, m14 = this._14,
		    m21 = this._21, m22 = this._22, m23 = this._23, m24 = this._24,
		    m31 = this._31, m32 = this._32, m33 = this._33, m34 = this._34,
		    m41 = this._41, m42 = this._42, m43 = this._43, m44 = this._44;
		
		return (m11*m22 - m21*m12)*(m33*m44 - m43*m34)
			 - (m11*m32 - m31*m12)*(m23*m44 - m43*m24)
			 + (m11*m42 - m41*m12)*(m23*m34 - m33*m24)
			 + (m21*m32 - m31*m22)*(m13*m44 - m43*m14)
			 - (m21*m42 - m41*m22)*(m13*m34 - m33*m14)
			 + (m31*m42 - m41*m32)*(m13*m24 - m23*m14);
	}
	
	, inv3m: function(m) {
		var d = this.det3();
		if (this.abs(d) < 0.0001) return;
		
		d = 1.0/d;

		var m11 = m._11, m12 = m._12, m13 = m._13, m14 = m._14,
		    m21 = m._21, m22 = m._22, m23 = m._23, m24 = m._24,
		    m31 = m._31, m32 = m._32, m33 = m._33, m34 = m._34;
		
		this._11 =  d*(m22*m33 - m32*m23),
		this._12 = -d*(m12*m33 - m32*m13),
		this._13 =  d*(m12*m23 - m22*m13),
		this._14 = -d*(m12*(m23*m34 - m33*m24) - m22*(m13*m34 - m33*m14) + m32*(m13*m24 - m23*m14)),
		this._21 = -d*(m21*m33 - m31*m23),
		this._22 =  d*(m11*m33 - m31*m13),
		this._23 = -d*(m11*m23 - m21*m13),
		this._24 =  d*(m11*(m23*m34 - m33*m24) - m21 * (m13*m34 - m33*m14) + m31 * (m13*m24 - m23*m14)),
		this._31 =  d*(m21*m32 - m31*m22),
		this._32 = -d*(m11*m32 - m31*m12),
		this._33 =  d*(m11*m22 - m21*m12),
		this._34 = -d*(m11*(m22*m34 - m32*m24) - m21 * (m12*m34 - m32*m14) + m31 * (m12*m24 - m22*m14));
	}
	, inv3: function() {
		this.inv3m(this);
	}
	
	// m1*m2, apply to self
	, mul3m: function(m1, m2) {
		var m111 = m1._11, m112 = m1._12, m113 = m1._13,
		    m121 = m1._21, m122 = m1._22, m123 = m1._23,
		    m131 = m1._31, m132 = m1._32, m133 = m1._33;
		
		var m211 = m2._11, m212 = m2._12, m213 = m2._13,
		    m221 = m2._21, m222 = m2._22, m223 = m2._23,
		    m231 = m2._31, m232 = m2._32, m233 = m2._33;
		
		this._11 = m111*m211 + m112*m221 + m113*m231;
		this._12 = m111*m212 + m112*m222 + m113*m232;
		this._13 = m111*m213 + m112*m223 + m113*m233;

		this._21 = m121*m211 + m122*m221 + m123*m231;
		this._22 = m121*m212 + m122*m222 + m123*m232;
		this._23 = m121*m213 + m122*m223 + m123*m233;

		this._31 = m131*m211 + m132*m221 + m133*m231;
		this._32 = m131*m212 + m132*m222 + m133*m232;
		this._33 = m131*m213 + m132*m223 + m133*m233;
		
		this._41 = m1._41;
		this._42 = m1._42;
		this._43 = m1._43;
	}
	// Times-equals, apply to self
	, mul3: function(m2) {
		var m111 = this._11, m112 = this._12, m113 = this._13,
		    m121 = this._21, m122 = this._22, m123 = this._23,
		    m131 = this._31, m132 = this._22, m133 = this._33;
		
		var m211 = m2._11, m212 = m2._12, m213 = m2._13,
		    m221 = m2._21, m222 = m2._22, m223 = m2._23,
		    m231 = m2._31, m232 = m2._22, m233 = m2._33;
		
		this._11 = m111*m211 + m112*m221 + m113*m231;
		this._12 = m111*m212 + m112*m222 + m113*m232;
		this._13 = m111*m213 + m112*m223 + m113*m233;

		this._21 = m121*m211 + m122*m221 + m123*m231;
		this._22 = m121*m212 + m122*m222 + m123*m232;
		this._23 = m121*m213 + m122*m223 + m123*m233;

		this._31 = m131*m211 + m132*m221 + m133*m231;
		this._32 = m131*m212 + m132*m222 + m133*m232;
		this._33 = m131*m213 + m132*m223 + m133*m233;
	}
	
	, mulm: function(m1, m2) {
		var m111 = m1._11, m112 = m1._12, m113 = m1._13, m114 = m1._14,
		    m121 = m1._21, m122 = m1._22, m123 = m1._23, m124 = m1._24,
		    m131 = m1._31, m132 = m1._32, m133 = m1._33, m134 = m1._34;
		
		var m211 = m2._11, m212 = m2._12, m213 = m2._13, m214 = m2._14,
		    m221 = m2._21, m222 = m2._22, m223 = m2._23, m224 = m2._24,
		    m231 = m2._31, m232 = m2._32, m233 = m2._33, m234 = m2._34;
		
		this._11 = m111*m211 + m112*m221 + m113*m231;
		this._12 = m111*m212 + m112*m222 + m113*m232;
		this._13 = m111*m213 + m112*m223 + m113*m233;
		this._14 = m111*m214 + m112*m224 + m113*m234 + m114;

		this._21 = m121*m211 + m122*m221 + m123*m231;
		this._22 = m121*m212 + m122*m222 + m123*m232;
		this._23 = m121*m213 + m122*m223 + m123*m233;
		this._24 = m121*m214 + m122*m224 + m123*m234 + m124;

		this._31 = m131*m211 + m132*m221 + m133*m231;
		this._32 = m131*m212 + m132*m222 + m133*m232;
		this._33 = m131*m213 + m132*m223 + m133*m233;
		this._34 = m131*m214 + m132*m224 + m133*m234 + m134;
	}
	, mul: function(m2) {
	
	}
	
	, scale: function(sx, sy, sz) {
		if (sx) this._11 *= sx; this._12 *= sx; this._13 *= sx;
		if (sy) this._21 *= sy; this._22 *= sy; this._23 *= sy;
		if (sz) this._31 *= sz; this._32 *= sz; this._33 *= sz;
	}
	, scalev: function(v) {
		var sx = v.x, sy = v.y, sz = v.z;
		this._11 *= sx; this._12 *= sx; this._13 *= sx;
		this._21 *= sy; this._22 *= sy; this._23 *= sy;
		this._31 *= sz; this._32 *= sz; this._33 *= sz;
	}
	
	, moveTo: function(x, y, z) {
		this._14 = x; this._24 = y; this._34 = z;
	}
	, moveBy: function(x, y, z) {
		this._14 += x; this._24 += y; this._34 += z;
	}
	, moveToV: function(v) {
		this._14 = v.x; this._24 = v.y; this._34 = v.z;
	}
	, moveByV: function(v) {
		this._14 += v.x; this._24 += v.y; this._34 += v.z;
	}
	
	, perspective: function(aspRatio, fov, nearZ, farZ) {
		var fovRad = fov*0.5*this.PI/180.0;
		var tanFov = Math.tan(fovRad);
		var invTan = 1.0/tanFov;
		
		var zTot = nearZ + farZ, zDiff = nearZ - farZ;
		var invZDiff = 1.0/zDiff;
		
		this._12 = this._13 = this._14 =
		this._21 = this._23 = this._24 =
		this._31 = this._32 = 
		this._41 = this._42 = this._44 = 0;
		
		this._11 = invTan/aspRatio;
		this._22 = invTan;
		
		this._33 = -zTot*invZDiff;
		this._34 = 2.0*farZ*nearZ*invZDiff;
		this._43 = 1;
	}
	
	// Build a 3x3 rotation matrix, rotate angle a about vector v
	, fromRotAxis: function(v, a) {
		var vx = v.x, vy = v.y, vz = v.z;
		var cosA = this.cos(a), sinA = this.sin(a);
		var cosIA = 1.0 - cosA;
		
		var rxy = vx*vy*cosIA, 
		    ryz = vy*vz*cosIA,
		    rxz = vx*vz*cosIA;
		
		var rx = sinA*vx,
		    ry = sinA*vy,
			rz = sinA*vz;
		
		this._11 = cosA + vx*vx*cosIA;
		this._12 = rxy - rz;
		this._13 = rxz + ry;
		
		this._21 = rxy + rz;
		this._22 = cosA + vy*vy*cosIA;
		this._23 = ryz - rx;
		
		this._31 = rxz - ry;
		this._32 = ryz + rx;
		this._33 = cosA + vz*vz*cosIA;
	}
	
	, fromQuat: function(q) {
		var x = q.x, y = q.y, z = q.z, w = q.w;
		
		var xx = x*x, xy = x*y, xz = x*z, xw = x*w
		            , yy = y*y, yz = y*z, yw = y*w
					          , zz = z*z, zw = z*w;
		
		this._11 = 1.0 - (yy + zz)*2.0;
		this._12 =       (xy - zw)*2.0;
		this._13 =       (xz + yw)*2.0;

		this._21 =       (xy + zw)*2.0;
		this._22 = 1.0 - (xx + zz)*2.0;
		this._23 =       (yz - xw)*2.0;

		this._31 =       (xz - yw)*2.0;
		this._32 =       (yz + xw)*2.0;
		this._33 = 1.0 - (xx + yy)*2.0;
	}
	
	, pos: function() {
		return new a3d.Vec3(this._14, this._24, this._34);
	}
	
	// Pretty darn slow function, but it should only be used in debugging anyway.
	, toString: function() {
		return 'mat4: [' +
		'[' + [this._11, this._12, this._13, this._14].join(',') + '],' +
		'[' + [this._21, this._22, this._23, this._24].join(',') + '],' +
		'[' + [this._31, this._32, this._33, this._34].join(',') + '],' +
		'[' + [this._41, this._42, this._43, this._44].join(',') +
		']]';
	}
});

a3d.Mat3 = a3d.MathClass.extend({
	  _11: 1.0, _12: 0.0, _13: 0.0
	, _21: 0.0, _22: 1.0, _23: 0.0
	, _31: 0.0, _32: 0.0, _33: 1.0
	
	, els: [this._11, this._12, this._13,
	        this._21, this._22, this._23,
			this._31, this._32, this._33]
	
	//, init: function() {
	//}
	
	, ident: function() {
		this._11 = 1.0; this._12 = 0.0; this._13 = 0.0;
		this._21 = 0.0; this._22 = 1.0; this._23 = 0.0;
		this._31 = 0.0; this._32 = 0.0; this._33 = 1.0;
	}
	, zero: function() {
		this._11 = this._12 = this._13 =
		this._21 = this._22 = this._23 =
		this._31 = this._32 = this._33 = 0.0;
	}
	
	// TODO: This could use some optimization probably
	, fromArray: function(el) {
		a3d.setupMap(this, this.els, el);
	}
	, fromVec3Rows: function(v1, v2, v3) {
		this._11 = v1.x; this._12 = v1.y; this._13 = v1.z;
		this._21 = v2.x; this._22 = v2.y; this._23 = v2.z;
		this._31 = v3.x; this._32 = v3.y; this._33 = v3.z;
	}
	, fromVec3Cols: function(v1, v2, v3) {
		this._11 = v1.x; this._12 = v2.x; this._13 = v3.x;
		this._21 = v1.y; this._22 = v2.y; this._23 = v3.y;
		this._31 = v1.z; this._32 = v2.z; this._33 = v3.z;
	}
	
	, det: function() {
		var m11 = this._11, m12 = this._12, m13 = this._13,
		    m21 = this._21, m22 = this._22, m23 = this._23,
		    m31 = this._31, m32 = this._32, m33 = this._33;
		
		return m11*(m22*m33 - m23*m32)
		     + m12*(m23*m31 - m21*m33)
			 + m13*(m21*m32 - m22*m31)
	}
	// TODO: Optimize this by avoiding the det() call: dont duplicate multiplies
	, invm: function(m) {
		var d = m.det();
		if (this.abs(d) < 0.0001) return null;
		
		d = 1.0/d;

		var m11 = m._11, m12 = m._12, m13 = m._13,
		    m21 = m._21, m22 = m._22, m23 = m._23,
		    m31 = m._31, m32 = m._32, m33 = m._33;
		
		this._11 = d*(m22*m33 - m23*m32);
		this._12 = d*(m32*m13 - m12*m33);
		this._13 = d*(m12*m23 - m22*m13);
		this._21 = d*(m23*m31 - m21*m33);
		this._22 = d*(m11*m33 - m31*m13);
		this._23 = d*(m21*m13 - m11*m23);
		this._31 = d*(m21*m32 - m22*m31);
		this._32 = d*(m31*m12 - m11*m32);
		this._33 = d*(m11*m22 - m21*m12);
		
		return this;
	}
	, inv: function() {
		return this.invm(this);
	}
	
	// m1*m2, apply to self
	, mul2m: function(m1, m2) {
		var m111 = m1._11, m112 = m1._12,
		    m121 = m1._21, m122 = m1._22;
		
		var m211 = m2._11, m212 = m2._12,
		    m221 = m2._21, m222 = m2._22;
		
		this._11 = m111*m211 + m112*m221;
		this._12 = m111*m212 + m112*m222;
		this._13 = m1._13;

		this._21 = m121*m211 + m122*m221;
		this._22 = m121*m212 + m122*m222;
		this._23 = m1._23;
	}
	// Times-equals, apply to self
	, mul2: function(m2) {
		var m111 = this._11, m112 = this._12,
		    m121 = this._21, m122 = this._22;
		
		var m211 = m2._11, m212 = m2._12,
		    m221 = m2._21, m222 = m2._22;
		
		this._11 = m111*m211 + m112*m221;
		this._12 = m111*m212 + m112*m222;

		this._21 = m121*m211 + m122*m221;
		this._22 = m121*m212 + m122*m222;
	}
	
	// m1*m2, apply to self
	, mulm: function(m1, m2) {
		var m111 = m1._11, m112 = m1._12, m113 = m1._13,
		    m121 = m1._21, m122 = m1._22, m123 = m1._23,
		    m131 = m1._31, m132 = m1._32, m133 = m1._33;
		
		var m211 = m2._11, m212 = m2._12, m213 = m2._13,
		    m221 = m2._21, m222 = m2._22, m223 = m2._23,
		    m231 = m2._31, m232 = m2._32, m233 = m2._33;
		
		this._11 = m111*m211 + m112*m221 + m113*m231;
		this._12 = m111*m212 + m112*m222 + m113*m232;
		this._13 = m111*m213 + m112*m223 + m113*m233;

		this._21 = m121*m211 + m122*m221 + m123*m231;
		this._22 = m121*m212 + m122*m222 + m123*m232;
		this._23 = m121*m213 + m122*m223 + m123*m233;

		this._31 = m131*m211 + m132*m221 + m133*m231;
		this._32 = m131*m212 + m132*m222 + m133*m232;
		this._33 = m131*m213 + m132*m223 + m133*m233;
	}
	// Times-equals, apply to self
	, mul: function(m2) {
		var m111 = this._11, m112 = this._12, m113 = this._13,
		    m121 = this._21, m122 = this._22, m123 = this._23,
		    m131 = this._31, m132 = this._22, m133 = this._33;
		
		var m211 = m2._11, m212 = m2._12, m213 = m2._13,
		    m221 = m2._21, m222 = m2._22, m223 = m2._23,
		    m231 = m2._31, m232 = m2._22, m233 = m2._33;
		
		this._11 = m111*m211 + m112*m221 + m113*m231;
		this._12 = m111*m212 + m112*m222 + m113*m232;
		this._13 = m111*m213 + m112*m223 + m113*m233;

		this._21 = m121*m211 + m122*m221 + m123*m231;
		this._22 = m121*m212 + m122*m222 + m123*m232;
		this._23 = m121*m213 + m122*m223 + m123*m233;

		this._31 = m131*m211 + m132*m221 + m133*m231;
		this._32 = m131*m212 + m132*m222 + m133*m232;
		this._33 = m131*m213 + m132*m223 + m133*m233;
	}
	
	, scale: function(s) {
		this._11 *= s; this._12 *= s;
		this._21 *= s; this._22 *= s;
		return this;
	}
	, scaleXY: function(sx, sy) {
		this._11 *= sx; this._12 *= sx;
		this._21 *= sy; this._22 *= sy;
		
		return this;
	}
	
	, moveTo: function(x, y) {
		this._13 = x; this._23 = y;
	}
	, moveBy: function(x, y) {
		this._13 += x; this._23 += y;
	}
	
	, clone: function() {
		var c = new a3d.Mat3();
		c._11 = this._11; c._12 = this._12; c._13 = this._13;
		c._21 = this._21; c._22 = this._22; c._23 = this._23;
		c._31 = this._31; c._32 = this._32; c._33 = this._33;
		
		return c;
	}
	
	// Pretty darn slow function, but it should only be used in debugging anyway.
	, toString: function() {
		return 'mat3: [' +
		'[' + [this._11, this._12, this._13].join(',') + '],' +
		'[' + [this._21, this._22, this._23].join(',') + '],' +
		'[' + [this._31, this._32, this._33].join(',') +
		']]';
	}
	, toCssString: function() {
		return 'matrix(' + [this._11, this._12, this._21, this._22, this._13, this._23].join(',') + ')';
		//return 'matrix(' + [this._11, this._21, this._12, this._22, this._13, this._23].join(',') + ')';
	}
	, applyIeFilter: function(node) {
		if (!node.filters['DXImageTransform.Microsoft.Matrix']) {
			node.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(SizingMethod="auto expand")';
		}
		var f = node.filters['DXImageTransform.Microsoft.Matrix'];
		if (!f) {
			throw new Exception('Something failed with IE matrix.');
		}
		f.M11 = this._11; f.M12 = this._21;
		f.M21 = this._12; f.M22 = this._22;
	}
});

a3d.Mat2 = a3d.MathClass.extend({
	  _11: 1.0, _12: 0.0
	, _21: 0.0, _22: 1.0
	
	, els: [this._11, this._12,
	        this._21, this._22]
	
	//, init: function() {
	//}
	
	, ident: function() {
		this._11 = 1.0; this._12 = 0.0;
		this._21 = 0.0; this._22 = 1.0;
	}
	, zero: function() {
		this._11 = this._12 = this._21 = this._22 = 0.0;
	}
	
	// TODO: This could use some optimization probably
	, fromArray: function(el) {
		a3d.setupMap(this, this.els, el);
	}
	
	, det: function() {
		return this._11*this._22 - this._12*this._21;
	}
	// TODO: Optimize this by avoiding the det() call: dont duplicate multiplies
	, inv: function() {
		var d = this.det();
		if (d < 0.0001 && d > -0.0001) return null;
		
		d = 1.0/d;
		
		this._11 =  d*this._22; this._12 = -d*this._12;
		this._21 = -d*this._21; this._22 =  d*this._11;
		
		return this;
	}
	
	, invm: function(m) {
		var d = m.det();
		if (d < 0.0001 && d > -0.0001) return null;
		
		d = 1.0/d;
		
		this._11 =  d*m._22; this._12 = -d*m._12;
		this._21 = -d*m._21; this._22 =  d*m._11;
		
		return this;
	}
	
	// m1*m2, apply to self
	, mulm: function(m1, m2) {
		var m111 = m1._11, m112 = m1._12,
		    m121 = m1._21, m122 = m1._22;
		
		var m211 = m2._11, m212 = m2._12,
		    m221 = m2._21, m222 = m2._22;
		
		this._11 = m111*m211 + m112*m221;
		this._12 = m111*m212 + m112*m222;

		this._21 = m121*m211 + m122*m221;
		this._22 = m121*m212 + m122*m222;
	}
	
	, mul: function(m2) {
		var m111 = this._11, m112 = this._12,
		    m121 = this._21, m122 = this._22;
		
		var m211 = m2._11, m212 = m2._12,
		    m221 = m2._21, m222 = m2._22;
		
		this._11 = m111*m211 + m112*m221;
		this._12 = m111*m212 + m112*m222;

		this._21 = m121*m211 + m122*m221;
		this._22 = m121*m212 + m122*m222;
	}
	
	, scale: function(s) {
		this._11 *= s; this._12 *= s;
		this._21 *= s; this._22 *= s;
		
		return this;
	}
	, scaleXY: function(sx, sy) {
		this._11 *= sx; this._12 *= sx;
		this._21 *= sy; this._22 *= sy;
		
		return this;
	}
	
	, clone: function() {
		var c = new a3d.Mat2();
		c._11 = this._11; c._12 = this._12;
		c._21 = this._21; c._22 = this._22;
		
		return c;
	}
	
	// Pretty darn slow function, but it should only be used in debugging anyway.
	, toString: function() {
		return 'mat2: [' +
		'[' + [this._11, this._12].join(',') + '],' +
		'[' + [this._21, this._22].join(',') +
		']]';
	}
	, toCssString: function() {
		return 'matrix(' + [this._11, this._12, this._21, this._22, 0, 0].join(',') + ')';
		//return 'matrix(' + [this._11, this._21, this._12, this._22, 0, 0].join(',') + ')';
	}
	, applyIeFilter: function(node) {
		if (!node.filters['DXImageTransform.Microsoft.Matrix']) {
			node.style.filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand")';
		}
		var f = node.filters['DXImageTransform.Microsoft.Matrix'];
		if (!f) {
			throw new Exception('Something failed with IE matrix.');
		}
		f.M11 = this._11; f.M12 = this._21;
		f.M21 = this._12; f.M22 = this._22;
	}
});

// Identity matrices
a3d.M4 = new a3d.Mat4();
a3d.M3 = new a3d.Mat3();
a3d.M2 = new a3d.Mat2();