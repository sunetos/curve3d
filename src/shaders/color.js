/**
 * Convenient wrapper for getting hex colors as CSS strings and the like.
 * @constructor
 */
c3d.Color = function(num) {
	this.set(num);
};
c3d.Color.prototype.set = function(num) {
	num = num & 0xFFFFFF;
	this.num = num;
	this.r = num >> 16; this.g = (num >> 8) & 0xFF; this.b = num & 0xFF;
	//this.str = 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
	this.str = '#' + c3d.padLeft(num.toString(16), 6, '0');
};

/** @const */ c3d.Black = new c3d.Color(0x000000);
/** @const */ c3d.White = new c3d.Color(0xFFFFFF);
/** @const */ c3d.Red = new c3d.Color(0xFF0000);
/** @const */ c3d.Green = new c3d.Color(0x00FF00);
/** @const */ c3d.Blue = new c3d.Color(0x0000FF);
/** @const */ c3d.DarkGray = new c3d.Color(0x333333);
/** @const */ c3d.Gray = new c3d.Color(0x999999);
