/*
 * Global helper functions go in here, like browser detection, ajax, event handlers.
 */

// Based on http://www.thespanner.co.uk/2009/01/29/detecting-browsers-javascript-hacks/
// Had to extend myself to support newer Chromes, and FF3.5 & FF3.6
//FF35=(/a/[-1]&&Object.getPrototypeOf)?true:false
a3d.$B = (Object.getPrototypeOf&&window.netscape)?'FF36':(/a/[-1]&&Object.getPrototypeOf)?'FF35':(function x(){})[-5]=='x'?'FF3':(function x(){})[-6]=='x'?'FF2':/a/[-1]=='a'?'FF':'\v'=='v'?'IE':/a/.__proto__=='//'?'Saf':(/s/.test(/a/.toString)||window.chrome)?'Chr':/^function \(/.test([].sort)?'Op':'Unknown';

// Standardized method of supplying options to constructors
a3d.setup = function(obj, cfg) {
	for (k in cfg) {
		if (obj[k] !== undefined) {
			obj[k] = cfg[k];
		}
	}
};
// Map through a virtual lookup table
a3d.setupMap = function(obj, map, cfg) {
	for (k in cfg) {
		if (obj[k] !== undefined) {
			obj[map[k]] = cfg[k];
		}
	}
};

// Super-simple event handler
a3d.on = function(node, type, handler) {
	if (node.addEventListener) {
		node.addEventListener(type, handler, false);
	} else if (node.attachEvent) {
		node.attachEvent('on' + type, handler);
	}
};
// Solve scope issues with "this" on event handlers, taken from:
// http://stackoverflow.com/questions/183214/javascript-callback-scope
a3d.bind = function(scope, fn) {
	return function () {
		fn.apply(scope, arguments);
	};
};


// Not sure why I felt the need to optimize this to death
a3d.padLeft = function(str, len, ch) {
    if (!ch) ch = ' ';
	
	var diff = len - str.length;
	var pad = '';
	while (diff) {
		if (diff & 1) pad += ch;
		diff >>= 1;
		
		ch += ch;
	};
	
    return pad + str;
}

// From http://flesler.blogspot.com/2008/11/fast-trim-function-for-javascript.html
a3d.trim = function(str) {
	var start = -1, end = str.length;
	while (str.charCodeAt(--end) < 33) {;};
	while (str.charCodeAt(++start) < 33) {;};
	return str.slice(start, end + 1);
};

a3d.trace = function() {
	if (typeof(console) != 'undefined') {
		console.log.apply(console, arguments);
	}
}

a3d.numCmp = function(a, b) {
	return (a - b);
}

a3d.vecCmp = function(v1, v2) {
	//var dx = v1.x - v2.x;
	//return (dx == 0) ? (v1.y - v2.y) : dx;
	//var dy = v1.y - v2.y;
	//return (dy == 0) ? (v1.x - v2.x) : dy;
	return v1.y - v2.y;
}

// Minimalist ajax data fetcher. Only intended for loading models.
// Async is the only support mode, no intention of allowing synchronous in JS.
// Built off of jQuery 1.3.2 source by deleting 90% of the ajax() function.
a3d.get = function(url, success, fail, binary) {
	var xhr = window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest();
	var contentType = 'text/plain';
	var async = true;
	
	var requestDone = false;
	xhr.open('GET', url, async);
	
	try {
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		xhr.setRequestHeader("Accept", contentType);
		if (binary) xhr.overrideMimeType("text/plain; charset=x-user-defined");
	} catch(e){}
	
	var onreadystatechange = function(){
		if (xhr.readyState == 0) {
			if (ival) {
				clearInterval(ival);
				ival = null;
			}
		} else if (!requestDone && xhr && (xhr.readyState == 4)) {
			requestDone = true;
			
			if (ival) {
				clearInterval(ival);
				ival = null;
			}

			var succeeded;
			try {
				succeeded = !xhr.status && location.protocol == "file:" ||
					(xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || xhr.status == 1223;
			} catch(e){
				succeeded = false;
			}
			
			if (succeeded) {
				var data = xhr.responseText;
				if (success) success(data, url);
			} else {
				if (fail) fail(url);
			}
			
			if (async) xhr = null;
		}
	};
	
	if (async) var ival = setInterval(onreadystatechange, 13);
	
	try {
		xhr.send(null);
	} catch(e) {
		if (fail) fail(url);
	}

}

a3d.avoidSelect = function(node) {
	var B = a3d.$B.substr(0, 2);
	if (B == 'IE' || B == 'Op') {
		node.onselectstart = function() { return false; };	// ie
		node.unselectable = 'on';				// non-ie
	} else if (B == 'Sa') {
		node.style.KhtmlUserSelect = 'none';
	} else if (B == 'FF') {
		node.style.MozUserSelect = 'none';
	} else if (B == 'Ch') {
		node.style.WebkitUserSelect = 'none';
	}
	node.style.UserSelect = 'none';
}