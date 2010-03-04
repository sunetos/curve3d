/**
 * @enum {number}
 */
a3d.TimelineType = {
	  ALL: 1
	, INTERVAL: 2
	, LIST: 3
};

/** 
 * Manages timelines to drive animations by the framerate.
 * 
 * @param {a3d.Viewport} v - the viewport whose framerate drives this timeline manager.
 * 
 * @constructor
 */
a3d.TimelineManager = function(v){
	this.v = v;
	this.tls = [];
};

/**
 * Try to intelligently determine the type of interval based on the input parameters.
 * @param {Object} cfg
 */
a3d.TimelineManager.prototype.create = function(cfg) {
	var t;
	if (cfg['interval']) {
		t = new a3d.IntervalTimeline(cfg);
	} else if (cfg['intervals']) {
		t = new a3d.ListTimeline(cfg);
	} else {
		t = new a3d.AllTimeline(cfg);
	}
	this.tls.push(t);
	return t;
};

a3d.TimelineManager.prototype.tick = function(dt) {
	var tls = this.tls; var ll = this.tls.length;
	for (var i = 0; i < ll; ++i) {
		var tl = tls[i];
		tl.tick(dt);
	}
};

/** 
 * Framerate-driven animation support.
 * 
 * @constructor
 */
a3d.Timeline = function(cfg){
	if (!this.type) this.type = a3d.TimelineType.ALL;
	
	this.frame = -1;
	this.frames = 0;
	this.t = 0;
	this.nextT = 0;
	this.lastT = 0;	// Record the last trigger separate from the framerate
	this.interval = 0;
	this.callback = null;
	
	a3d.setup(this, cfg);
};

a3d.Timeline.prototype.tick = function(dtMs) {
	//var t = this.t += dt;
	if ((this.t += dtMs) >= this.nextT) {
		if (++this.frame >= this.frames) this.frame = 0;
		
		this.lastT = this.nextT;
		this.nextT = this.next();
		
		var cb;
		if (cb = this.callback) cb(this.frame, this);
	}
};

/**
 * This will get automatically set to whatever function corresponds with the given type.
 * The default returns the current time, which means "fire callback every frame."
 */
a3d.Timeline.prototype.next = function() {
	return 0;
};

/**
 * A timeline that fires the callback every frame.
 * 
 * @constructor
 * @extends {a3d.Timeline}
 */
a3d.AllTimeline = function(cfg) {
	this.type = a3d.TimelineType.ALL;
	
	a3d.Timeline.call(this, cfg);
};
a3d.inherits(a3d.AllTimeline, a3d.Timeline);

a3d.AllTimeline.prototype.next = function() {
	return 0;
};

/**
 * A timeline that fires the callback at a regular millisecond-based interval.
 * 
 * @constructor
 * @extends {a3d.Timeline}
 */
a3d.IntervalTimeline = function(cfg) {
	this.type = a3d.TimelineType.INTERVAL;
	this.interval = 0;
	
	a3d.Timeline.call(this, cfg);
};
a3d.inherits(a3d.IntervalTimeline, a3d.Timeline);

a3d.IntervalTimeline.prototype.next = function() {
	return this.lastT + this.interval;
};

/**
 * A timeline that fires the callback at millisecond-based intervals given in a list.
 * 
 * @constructor
 * @extends {a3d.Timeline}
 */
a3d.ListTimeline = function(cfg) {
	this.type = a3d.TimelineType.LIST;
	this.intervals = [];
	
	a3d.Timeline.call(this, cfg);
	
	this.frames = this.intervals.length;
};
a3d.inherits(a3d.ListTimeline, a3d.Timeline);

a3d.ListTimeline.prototype.next = function() {
	return this.lastT + this.intervals[this.frame];
};
	

