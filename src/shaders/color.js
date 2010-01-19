/**
 * Convenient wrapper for getting hex colors as CSS strings and the like.
 * @constructor
 */
a3d.Color = function(num) {
	this.set(num);
};
a3d.Color.prototype.set = function(num) {
	num = num & 0xFFFFFF;
	this.num = num;
	this.r = num >> 16; this.g = (num >> 8) & 0xFF; this.b = num & 0xFF;
	//this.str = 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
	this.str = '#' + a3d.padLeft(num.toString(16), 6, '0');
};

/** @const */ a3d.Black = new a3d.Color(0x000000);
/** @const */ a3d.White = new a3d.Color(0xFFFFFF);
/** @const */ a3d.Red = new a3d.Color(0xFF0000);
/** @const */ a3d.Green = new a3d.Color(0x00FF00);
/** @const */ a3d.Blue = new a3d.Color(0x0000FF);
/** @const */ a3d.DarkGray = new a3d.Color(0x333333);
/** @const */ a3d.Gray = new a3d.Color(0x999999);
