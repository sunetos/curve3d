/**
 * @enum {number}
 */
c3d.TimelineType = {
	  ALL: 1
	, INTERVAL: 2
	, LIST: 3
};

/** 
 * Manages timelines to drive animations by the framerate.
 * 
 * @param {c3d.Viewport} v - the viewport whose framerate drives this timeline manager.
 * 
 * @constructor
 */
c3d.TimelineManager = function(v){
	this.v = v;
	this.tls = [];
};

/**
 * Try to intelligently determine the type of interval based on the input parameters.
 * @param {Object} cfg
 */
c3d.TimelineManager.prototype.create = function(cfg) {
	var t;
	if (cfg['interval']) {
		t = new c3d.IntervalTimeline(cfg);
	} else if (cfg['intervals']) {
		t = new c3d.ListTimeline(cfg);
	} else {
		t = new c3d.AllTimeline(cfg);
	}
	this.tls.push(t);
	return t;
};

c3d.TimelineManager.prototype.tick = function(dt) {
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
c3d.Timeline = function(cfg){
	if (!this.type) this.type = c3d.TimelineType.ALL;
	
	this.frame = -1;
	this.frames = 0;
	this.t = 0;
	this.nextT = 0;
	this.lastT = 0;	// Record the last trigger separate from the framerate
	this.interval = 0;
	this.callback = null;
	
	c3d.setup(this, cfg);
};

c3d.Timeline.prototype.tick = function(dtMs) {
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
c3d.Timeline.prototype.next = function() {
	return 0;
};

/**
 * A timeline that fires the callback every frame.
 * 
 * @constructor
 * @extends {c3d.Timeline}
 */
c3d.AllTimeline = function(cfg) {
	this.type = c3d.TimelineType.ALL;
	
	c3d.Timeline.call(this, cfg);
};
c3d.inherits(c3d.AllTimeline, c3d.Timeline);

c3d.AllTimeline.prototype.next = function() {
	return 0;
};

/**
 * A timeline that fires the callback at a regular millisecond-based interval.
 * 
 * @constructor
 * @extends {c3d.Timeline}
 */
c3d.IntervalTimeline = function(cfg) {
	this.type = c3d.TimelineType.INTERVAL;
	this.interval = 0;
	
	c3d.Timeline.call(this, cfg);
};
c3d.inherits(c3d.IntervalTimeline, c3d.Timeline);

c3d.IntervalTimeline.prototype.next = function() {
	return this.lastT + this.interval;
};

/**
 * A timeline that fires the callback at millisecond-based intervals given in a list.
 * 
 * @constructor
 * @extends {c3d.Timeline}
 */
c3d.ListTimeline = function(cfg) {
	this.type = c3d.TimelineType.LIST;
	this.intervals = [];
	
	c3d.Timeline.call(this, cfg);
	
	this.frames = this.intervals.length;
};
c3d.inherits(c3d.ListTimeline, c3d.Timeline);

c3d.ListTimeline.prototype.next = function() {
	return this.lastT + this.intervals[this.frame];
};
	

