/**
 * Enum for big or little endian.
 * @enum {number}
 */
c3d.Endian = {
	  BIG: 0
	, LITTLE: 1
};

/**
 * Attempt to imitate AS3's ByteArray as very high-performance javascript.
 * I aliased the functions to have shorter names, like ReadUInt32 as well as ReadUnsignedInt.
 * I used some code from http://fhtr.blogspot.com/2009/12/3d-models-and-parsing-binary-data-with.html
 * to kick-start it, but I added optimizations and support both big and little endian.
 * Note that you cannot change the endianness after construction.
 * 
 * @constructor
 */
c3d.ByteArray = function(data, endian) {
	this.data = (data !== undefined) ? data : '';
	this.length = data.length;
	this.endian = (endian !== undefined) ? endian : c3d.Endian.BIG;
	this.pos = 0;
	
	this.pow = Math.pow;
	this.TWOeN23 = this.pow(2, -23);
	this.TWOeN52 = this.pow(2, -52);
	
	// Cache the function pointers based on endianness.
	// This avoids doing an if-statement in every function call.
	var funcExt = (endian == c3d.Endian.BIG) ? 'BE' : 'LE';
	var funcs = ['readInt32', 'readInt16', 'readUInt32', 'readUInt16', 'readFloat32', 'readFloat64'];
	for (var func in funcs) {
		this[funcs[func]] = this[funcs[func] + funcExt];
	}
	
	// Add redundant members that match actionscript for compatibility
	var funcMap = {readUnsignedByte: 'readByte', readUnsignedInt: 'readUInt32',
		readFloat: 'readFloat32', readDouble: 'readFloat64', readShort: 'readInt16',
		readBoolean: 'readBool', readInt: 'readInt32', readUnsignedShort: 'readUInt16'};
	for (var func in funcMap) {
		this[func] = this[funcMap[func]];
	}
};
	
c3d.ByteArray.prototype.readByte = function() {
	return (this.data.charCodeAt(this.pos++) & 0xFF);
};

c3d.ByteArray.prototype.readBool = function() {
	return (this.data.charCodeAt(this.pos++) & 0xFF) ? true : false;
};

c3d.ByteArray.prototype.readUInt32BE = function() {
	var data = this.data, pos = (this.pos += 4) - 4;
	return	((data.charCodeAt(pos)   & 0xFF) << 24) |
			((data.charCodeAt(++pos) & 0xFF) << 16) |
			((data.charCodeAt(++pos) & 0xFF) << 8) |
			 (data.charCodeAt(++pos) & 0xFF);
};
c3d.ByteArray.prototype.readInt32BE = function() {
	var data = this.data, pos = (this.pos += 4) - 4;
	var x =	((data.charCodeAt(pos)   & 0xFF) << 24) |
			((data.charCodeAt(++pos) & 0xFF) << 16) |
			((data.charCodeAt(++pos) & 0xFF) << 8) |
			 (data.charCodeAt(++pos) & 0xFF);
	return (x >= 2147483648) ? x - 4294967296 : x;
};

c3d.ByteArray.prototype.readUInt16BE = function() {
	var data = this.data, pos = (this.pos += 2) - 2;
	return	((data.charCodeAt(pos)   & 0xFF) << 8) |
			 (data.charCodeAt(++pos) & 0xFF);
};
c3d.ByteArray.prototype.readInt16BE = function() {
	var data = this.data, pos = (this.pos += 2) - 2;
	var x =	((data.charCodeAt(pos)   & 0xFF) << 8) |
			 (data.charCodeAt(++pos) & 0xFF);
	return (x >= 32768) ? x - 65536 : x;
};

c3d.ByteArray.prototype.readFloat32BE = function() {
	var data = this.data, pos = (this.pos += 4) - 4;
	var b1 = data.charCodeAt(pos) & 0xFF,
		b2 = data.charCodeAt(++pos) & 0xFF,
		b3 = data.charCodeAt(++pos) & 0xFF,
		b4 = data.charCodeAt(++pos) & 0xFF;
	var sign = 1 - ((b1 >> 7) << 1);                   // sign = bit 0
	var exp = (((b1 << 1) & 0xFF) | (b2 >> 7)) - 127;  // exponent = bits 1..8
	var sig = ((b2 & 0x7F) << 16) | (b3 << 8) | b4;    // significand = bits 9..31
	if (sig == 0 && exp == -127)
		return 0.0;
	return sign*(1 + this.TWOeN23*sig)*this.pow(2, exp);
};

c3d.ByteArray.prototype.readFloat64BE = function() {
	var data = this.data, pos = (this.pos += 8) - 8;
	var b1 = data.charCodeAt(pos) & 0xFF,
		b2 = data.charCodeAt(++pos) & 0xFF,
		b3 = data.charCodeAt(++pos) & 0xFF,
		b4 = data.charCodeAt(++pos) & 0xFF,
		b5 = data.charCodeAt(++pos) & 0xFF,
		b6 = data.charCodeAt(++pos) & 0xFF,
		b7 = data.charCodeAt(++pos) & 0xFF,
		b8 = data.charCodeAt(++pos) & 0xFF;
	var sign = 1 - ((b1 >> 7) << 1);									// sign = bit 0
	var exp = (((b1 << 4) & 0x7FF) | (b2 >> 4)) - 1023;					// exponent = bits 1..11
	
	// This crazy toString() stuff works around the fact that js ints are
	// only 32 bits and signed, giving us 31 bits to work with
	var sig = (((b2 & 0xF) << 16) | (b3 << 8) | b4).toString(2) +
		((b5 >> 7) ? '1' : '0') +
		(((b5&0x7F) << 24) | (b6 << 16) | (b7 << 8) | b8).toString(2);	// significand = bits 12..63
		
	sig = parseInt(sig, 2);
	if (sig == 0 && exp == -1023)
		return 0.0;
	return sign*(1.0 + this.TWOeN52*sig)*this.pow(2, exp);
};

c3d.ByteArray.prototype.readUInt32LE = function() {
	var data = this.data, pos = (this.pos += 4);
	return	((data.charCodeAt(--pos) & 0xFF) << 24) |
			((data.charCodeAt(--pos) & 0xFF) << 16) |
			((data.charCodeAt(--pos) & 0xFF) << 8) |
			 (data.charCodeAt(--pos) & 0xFF);
};
c3d.ByteArray.prototype.readInt32LE = function() {
	var data = this.data, pos = (this.pos += 4);
	var x =	((data.charCodeAt(--pos) & 0xFF) << 24) |
			((data.charCodeAt(--pos) & 0xFF) << 16) |
			((data.charCodeAt(--pos) & 0xFF) << 8) |
			 (data.charCodeAt(--pos) & 0xFF);
	return (x >= 2147483648) ? x - 4294967296 : x;
};

c3d.ByteArray.prototype.readUInt16LE = function() {
	var data = this.data, pos = (this.pos += 2);
	return	((data.charCodeAt(--pos) & 0xFF) << 8) |
			 (data.charCodeAt(--pos) & 0xFF);
};
c3d.ByteArray.prototype.readInt16LE = function() {
	var data = this.data, pos = (this.pos += 2);
	var x =	((data.charCodeAt(--pos) & 0xFF) << 8) |
			 (data.charCodeAt(--pos) & 0xFF);
	return (x >= 32768) ? x - 65536 : x;
};

c3d.ByteArray.prototype.readFloat32LE = function() {
	var data = this.data, pos = (this.pos += 4);
	var b1 = data.charCodeAt(--pos) & 0xFF,
		b2 = data.charCodeAt(--pos) & 0xFF,
		b3 = data.charCodeAt(--pos) & 0xFF,
		b4 = data.charCodeAt(--pos) & 0xFF;
	var sign = 1 - ((b1 >> 7) << 1);                   // sign = bit 0
	var exp = (((b1 << 1) & 0xFF) | (b2 >> 7)) - 127;  // exponent = bits 1..8
	var sig = ((b2 & 0x7F) << 16) | (b3 << 8) | b4;    // significand = bits 9..31
	if (sig == 0 && exp == -127)
		return 0.0;
	return sign*(1 + this.TWOeN23*sig)*this.pow(2, exp);
};

c3d.ByteArray.prototype.readFloat64LE = function() {
	var data = this.data, pos = (this.pos += 8);
	var b1 = data.charCodeAt(--pos) & 0xFF,
		b2 = data.charCodeAt(--pos) & 0xFF,
		b3 = data.charCodeAt(--pos) & 0xFF,
		b4 = data.charCodeAt(--pos) & 0xFF,
		b5 = data.charCodeAt(--pos) & 0xFF,
		b6 = data.charCodeAt(--pos) & 0xFF,
		b7 = data.charCodeAt(--pos) & 0xFF,
		b8 = data.charCodeAt(--pos) & 0xFF;
	var sign = 1 - ((b1 >> 7) << 1);									// sign = bit 0
	var exp = (((b1 << 4) & 0x7FF) | (b2 >> 4)) - 1023;					// exponent = bits 1..11
	
	// This crazy toString() stuff works around the fact that js ints are
	// only 32 bits and signed, giving us 31 bits to work with
	var sig = (((b2 & 0xF) << 16) | (b3 << 8) | b4).toString(2) +
		((b5 >> 7) ? '1' : '0') +
		(((b5&0x7F) << 24) | (b6 << 16) | (b7 << 8) | b8).toString(2);	// significand = bits 12..63
		
	sig = parseInt(sig, 2);
	if (sig == 0 && exp == -1023)
		return 0.0;
	return sign*(1.0 + this.TWOeN52*sig)*this.pow(2, exp);
};

/**
 * Read a null-terminated ASCII string.
 */
c3d.ByteArray.prototype.readCString = function() {
	var data = this.data, pos = this.pos;
	var len = this.length - pos;
	
	var chars = [];
	for (var i = 0; i < len; ++i) {
		var b = this.data.charCodeAt(pos++)&0xFF;
		if (b == 0) break;
		
		chars.push(String.fromCharCode(b));
	}
	this.pos = pos;
	return chars.join('');
};
