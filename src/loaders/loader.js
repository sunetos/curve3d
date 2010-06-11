/**
 * Lightweight container for the raw data that describes a mesh.
 * 
 * @constructor
 */
c3d.MeshData = function() {
	this.name = '';
	this.sd = null;		// shader data for constructing a shader
	this.clear();	// this should get inlined by the compiler
};

c3d.MeshData.prototype.clear = function() {
	this.vs = []; this.vns = []; this.uvs = [];
	this.fs = []; this.fns = []; this.mats = [];
};

/**
 * @constructor
 */
c3d.ShaderData = function(name, type) {
	this.name = name;
	this.type = type || c3d.ShaderType.WIRE;
	this.urls = [];
	this.shader = null;
};

/**
 * @constructor
 */
c3d.ShaderDataLib = function() {
	this.lib = {};
};

c3d.ShaderDataLib.prototype.get = function(name) {
	var sd = this.lib[name];
	if (sd) return sd;
	
	sd = new c3d.ShaderData(name);
	this.lib[name] = sd;
	return sd;
};

/**
 * Keep separate url parts for base path and filename.
 * This will allow easier building of texture urls.
 * 
 * @constructor
 */
c3d.LoaderBase = function(url, data) {
	var uri = url.split('?')[0];			// chop querystring
	var pieces = uri.split('/');
	
	this.baseUrl = pieces.slice(0, -1).join('/') + '/';
	this.file = pieces.slice(-1)[0];
	this.sds = new c3d.ShaderDataLib;		// shader datas
};
	
c3d.LoaderBase.prototype.buildShaders = function() {
	for (var name in this.sds.lib) {
		var sd = this.sds.lib[name];
		
		if (sd.type == c3d.ShaderType.WIRE) {
			sd.shader = new c3d.WireShader(sd);
		} else if (sd.type == c3d.ShaderType.COLOR) {
			sd.shader = new c3d.ColorShader(sd);
		} else if (sd.type == c3d.ShaderType.TXTUR) {
			sd.shader = new c3d.TextureShader(sd);
			
			for (var j = 0; j < sd.urls.length; ++j) {
				sd.shader.addTextureUrl(sd.urls[j]);
			}
		}
	}
};

/**
 * Static class, just call the functions directly without instantiating a MeshLoader.
 * @namespace
 */
c3d.MeshLoader = {};
	  
c3d.MeshLoader.newMesh = function(name, vs, vns, uvs, fs, fns) {
	var md = new c3d.MeshData();
	md.vs = vs; md.vns = vns; md.uvs = uvs; md.fs = fs; md.fns = fns;
	var m = new c3d.Mesh({data: md});
	m.name = name;
	
	return m;
};
c3d.MeshLoader.parseOBJ = function(url, obj) {
	var vs = [], vns = [], uvs = [], fs = [], fns = [];
	
	var lines = obj.split("\n");
	var lineCount = lines.length;
	var dblSpace = /[ ][ ]/g;
	var objs = [];
	
	for (var i = 0; i < lineCount; ++i) {
		var line = lines[i];
		if (line.length == 0) continue;
		if (line[1] == '#') continue;
		
		var l2 = line.substr(0, 2);
		switch (l2) {
			case 'o ': {
				var name = c3d.trim(line.substr(2));
				if (vs.length > 0 && objs.length == 0) {	// Handle data before the first named object
					var m = c3d.MeshLoader.newMesh('[noname]', vs, vns, uvs, fs, fns);
					objs.push(m);
				}
				//vs = []; vns = []; uvs = []; fs = []; fns = [];
				fs = []; fns = [];
				var m = c3d.MeshLoader.newMesh(name, vs, vns, uvs, fs, fns);
				objs.push(m);
				
				break;
			}
			case 'v ': {
				var xyz = c3d.trim(line.substr(2).replace(dblSpace, ' ')).split(' ');
				//var col = new c3d.Color(Math.random()*0xFFFFFF);
				var col = c3d.DarkGray;
				var v = new c3d.Vert(parseFloat(xyz[0]), -parseFloat(xyz[1]), parseFloat(xyz[2]), col);
				vs.push(v);
				break;
			}
			case 'vn': {
				var xyz = c3d.trim(line.substr(3).replace(dblSpace, ' ')).split(' ');
				var vn = new c3d.Vec3(parseFloat(xyz[0]), parseFloat(xyz[1]), parseFloat(xyz[2]));
				vn.norm();
				vns.push(vn);
				break;
			}
			case 'vt': {
				var xy = c3d.trim(line.substr(3).replace(dblSpace, ' ')).split(' ');
				var uv = new c3d.UV(parseFloat(xy[0]), parseFloat(xy[1]));
				uvs.push(uv);
				break;
			}
			case 'f ': {
				var vvv = c3d.trim(line.substr(2).replace(dblSpace, ' ')).split(' ');
				var vvvl = vvv.length;
				
				var fvs = [], fuvs = [], fvns = [];
				for (var j = 0; j < vvvl; ++j) {
					var sub = vvv[j].split('/');
					var subl = sub.length;
					
					fvs.push(vs[parseInt(sub[0]) - 1]);
					if (subl > 1 && sub[1].length) {
						fuvs.push(uvs[parseInt(sub[1]) - 1]);
					}
					if (subl > 2 && sub[2].length) {
						fns.push(vns[parseInt(sub[2]) - 1]);
					}
				}
				//console.log(vvvl);
				if (vvvl == 3) {
					fs.push(new c3d.Triangle(fvs[0], fvs[1], fvs[2], fuvs[0], fuvs[1], fuvs[2]));
				} else {
					fs.push(new c3d.Triangle(fvs[0], fvs[1], fvs[3], fuvs[0], fuvs[1], fuvs[3]));
					fs.push(new c3d.Triangle(fvs[1], fvs[2], fvs[3], fuvs[1], fuvs[2], fuvs[3]));
				}
				break;
			}
		}
	}
	
	if (vs.length > 0 && objs.length == 0) {	// Handle data not in a named object
		var m = c3d.MeshLoader.newMesh('[noname]', vs, vns, uvs, fs, fns);
		m.shader = new c3d.TextureShader();
		objs.push(m);
	}
	
	var objl = objs.length;
	for (var i = 0; i < objl; ++i) {
		//objs[i].data.fs = objs[i].data.fs.slice(0, 50);
		//objs[i].data.fs = objs[i].data.fs.slice(0, 1);
		objs[i].build();
	}
	
	return objs;
};

c3d.MeshLoader.parse3DS = function(url, data) {
	var loader = new c3d.Loader3ds(url, data);
	loader.parse();
	return loader.meshes;
};

/**
 * Optionally lets you specify your own loadFunc to let jQuery or your favorite lib do the work.
 * Just make sure its params are: url, successFunc, failFunc
 * @static
 */
c3d.MeshLoader.loadOBJ = function(url, success, fail, loadFunc) {
	if (!loadFunc) {
		loadFunc = c3d.get;
	}
	
	var objData = loadFunc(url, function(data) {
		if (success) success(c3d.MeshLoader.parseOBJ(url, data));
	}, function() {
		if (fail) fail(null);
	});
};

/**
 * Optionally lets you specify your own loadFunc to let jQuery or your favorite lib do the work.
 * Just make sure its params are: url, successFunc, failFunc
 * @static
 */
c3d.MeshLoader.load3DS = function(url, success, fail, loadFunc) {
	if (!loadFunc) {
		loadFunc = function(u, s, f){
			c3d.get(u, s, f, true);	// load binary
		}
	}
	
	var objData = loadFunc(url, function(data) {
		if (success) success(c3d.MeshLoader.parse3DS(url, data));
	}, function() {
		if (fail) fail(null);
	});
};

