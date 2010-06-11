/**
 * Global helper functions go in here, like browser detection, ajax, event handlers.
 */

/**
 *  Based on http://www.thespanner.co.uk/2009/01/29/detecting-browsers-javascript-hacks/
 *  Had to extend myself to support newer Chromes, and FF3.5 & FF3.6, and IE9
 */
//FF35=(/a/[-1]&&Object.getPrototypeOf)?true:false
//a3d.$B = (Object.getPrototypeOf&&window.netscape)?'FF36':(/a/[-1]&&Object.getPrototypeOf)?'FF35':(function x(){})[-5]=='x'?'FF3':(function x(){})[-6]=='x'?'FF2':/a/[-1]=='a'?'FF':'\v'=='v'?'IE':/a/.__proto__=='//'?'Saf':(/s/.test(/a/.toString)||window.chrome)?'Chr':'object'==(typeof /./)?'Op':'Unknown';

// Based on http://www.quirksmode.org/js/detect.html
var BrowserDetect={init:function(){this.browser=this.searchString(this.dataBrowser)||"An unknown browser";this.version=this.searchVersion(navigator.userAgent)||this.searchVersion(navigator.appVersion)||"an unknown version";this.OS=this.searchString(this.dataOS)||"an unknown OS"},searchString:function(b){for(var a=0;a<b.length;a++){var c=b[a].string,d=b[a].prop;this.versionSearchString=b[a].versionSearch||b[a].identity;if(c){if(c.indexOf(b[a].subString)!=-1)return b[a].identity}else if(d)return b[a].identity}}, searchVersion:function(b){var a=b.indexOf(this.versionSearchString);if(a!=-1)return parseFloat(b.substring(a+this.versionSearchString.length+1))},dataBrowser:[{string:navigator.userAgent,subString:"Chrome",identity:"Chrome"},{string:navigator.userAgent,subString:"OmniWeb",versionSearch:"OmniWeb/",identity:"OmniWeb"},{string:navigator.vendor,subString:"Apple",identity:"Safari",versionSearch:"Version"},{prop:window.opera,identity:"Opera"},{string:navigator.vendor,subString:"iCab",identity:"iCab"},{string:navigator.vendor, subString:"KDE",identity:"Konqueror"},{string:navigator.userAgent,subString:"Firefox",identity:"Firefox"},{string:navigator.vendor,subString:"Camino",identity:"Camino"},{string:navigator.userAgent,subString:"Netscape",identity:"Netscape"},{string:navigator.userAgent,subString:"MSIE",identity:"Explorer",versionSearch:"MSIE"},{string:navigator.userAgent,subString:"Gecko",identity:"Mozilla",versionSearch:"rv"},{string:navigator.userAgent,subString:"Mozilla",identity:"Netscape",versionSearch:"Mozilla"}], dataOS:[{string:navigator.platform,subString:"Win",identity:"Windows"},{string:navigator.platform,subString:"Mac",identity:"Mac"},{string:navigator.userAgent,subString:"iPhone",identity:"iPhone/iPod"},{string:navigator.platform,subString:"Linux",identity:"Linux"}]};BrowserDetect.init();
var browserMap={Explorer:"IE"+BrowserDetect.version,Opera:"OP",Firefox:"FF"+BrowserDetect.version,Chrome:"CH",Safari:"SA"};
a3d.$B = browserMap[BrowserDetect.browser];

/** Standardized method of supplying options to constructors */
a3d.setup = function(obj, cfg) {
	for (k in cfg) {
		if (obj[k] !== undefined) {
			obj[k] = cfg[k];
		}
	}
};
/** Map through a virtual lookup table */
a3d.setupMap = function(obj, map, cfg) {
	for (k in cfg) {
		if (obj[k] !== undefined) {
			obj[map[k]] = cfg[k];
		}
	}
};

/** Super-simple event handler */
a3d.on = function(node, type, handler) {
	if (node.addEventListener) {
		node.addEventListener(type, handler, false);
	} else if (node.attachEvent) {
		node.attachEvent('on' + type, handler);
	}
};
/**
 * Solve scope issues with "this" on event handlers, taken from:
 * http://stackoverflow.com/questions/183214/javascript-callback-scope
 * 
 * @param {Object} scope
 * @param {Object} fn
 */  
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

/**
 * Super-efficient string trim, taken from:
 * http://flesler.blogspot.com/2008/11/fast-trim-function-for-javascript.html
 * 
 * @param {Object} str - The string to trim
 */
a3d.trim = function(str) {
	var start = -1, end = str.length;
	while (str.charCodeAt(--end) < 33) {;};
	while (str.charCodeAt(++start) < 33) {;};
	return str.slice(start, end + 1);
};

/**
 * Log to a development console if available, else silently fail.
 * This mainly exists to prevent JS errors in IE and non-firebugged FF.
 */
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

/**
 * Minimalist ajax data fetcher. Only intended for loading models.
 * Async is the only support mode, no intention of allowing synchronous in JS.
 * Built off of jQuery 1.3.2 source by deleting 90% of the ajax() function.
 * 
 * @param {Object} url
 * @param {Object} success
 * @param {Object} fail
 * @param {Object} binary
 */
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

/**
 * Cross-browser method of disabling mouse selection on a DOM element.
 * 
 * @param {Object} node - A DOM element
 */
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
