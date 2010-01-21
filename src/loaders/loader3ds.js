/**
 * Away3d Lite 1.0 source code was used as the basis for the first version of this code.
 */

/**
 * @constructor
 */
a3d.Chunk3ds = function() {
	this.id = 0;
	this.length = 0;
	this.bytesRead = 0;
};

/**
 * @constructor
 */
a3d.MeshMaterialData = function() {
	this.symbol = '';
	this.fs = [];
};

/**
 * @constructor
 * @extends {a3d.LoaderBase}
 */
a3d.Loader3ds = function(url, data) {
	a3d.LoaderBase.call(this, url, data);
	
	this.ba = new a3d.ByteArray(data, a3d.Endian.LITTLE);
	this.meshes = [];
	this.meshDatas = [];
	
	// Current state vars
	this.meshData = null;
	this.shaderData = null;
	
	// Enums
	
	//----- Color Types --------------------------------------------------------
	
	this.AMBIENT = 'ambient';
	this.DIFFUSE = 'diffuse';
	this.SPECULAR = 'specular';
	
	//----- Main Chunks --------------------------------------------------------
	
	//this.PRIMARY = 0x4D4D
	this.EDIT3DS = 0x3D3D;  // Start of our actual objects
	this.KEYF3DS = 0xB000;  // Start of the keyframe information
	
	//----- General Chunks -----------------------------------------------------
	
	//this.VERSION = 0x0002;
	//this.MESH_VERSION = 0x3D3E;
	//this.KFVERSION = 0x0005;
	this.COLOR_F = 0x0010;
	this.COLOR_RGB = 0x0011;
	//this.LIN_COLOR_24 = 0x0012;
	//this.LIN_COLOR_F = 0x0013;
	//this.INT_PERCENTAGE = 0x0030;
	//this.FLOAT_PERC = 0x0031;
	//this.MASTER_SCALE = 0x0100;
	//this.IMAGE_FILE = 0x1100;
	//this.AMBIENT_LIGHT = 0X2100;
	
	//----- Object Chunks -----------------------------------------------------
	
	this.MESH = 0x4000;
	this.MESH_OBJECT = 0x4100;
	this.MESH_VERTICES = 0x4110;
	//this.VERTEX_FLAGS = 0x4111;
	this.MESH_FACES = 0x4120;
	this.MESH_MATER = 0x4130;
	this.MESH_TEX_VERT = 0x4140;
	//this.MESH_XFMATRIX = 0x4160;
	//this.MESH_COLOR_IND = 0x4165;
	//this.MESH_TEX_INFO = 0x4170;
	//this.HEIRARCHY = 0x4F00;
	
	//----- Material Chunks ---------------------------------------------------
	
	this.MATERIAL = 0xAFFF;
	this.MAT_NAME = 0xA000;
	this.MAT_AMBIENT = 0xA010;
	this.MAT_DIFFUSE = 0xA020;
	this.MAT_SPECULAR = 0xA030;
	//this.MAT_SHININESS = 0xA040;
	//this.MAT_FALLOFF = 0xA052;
	//this.MAT_EMISSIVE = 0xA080;
	//this.MAT_SHADER = 0xA100;
	this.MAT_TEXMAP = 0xA200;
	this.MAT_TEXFLNM = 0xA300;
	//this.OBJ_LIGHT = 0x4600;
	//this.OBJ_CAMERA = 0x4700;
	
	//----- KeyFrames Chunks --------------------------------------------------
	
	//this.ANIM_HEADER = 0xB00A;
	//this.ANIM_OBJ = 0xB002;
	//this.ANIM_NAME = 0xB010;
	//this.ANIM_POS = 0xB020;
	//this.ANIM_ROT = 0xB021;
	//this.ANIM_SCALE = 0xB022;
};
a3d.inherits(a3d.Loader3ds, a3d.LoaderBase);

a3d.Loader3ds.prototype.parse = function() {
	//first chunk is always the primary, so we simply read it and parse it
	var chunk = new a3d.Chunk3ds();
	this.readChunk(chunk);
	this.parse3DS(chunk);
	
	this.buildShaders();
	this.buildMeshes();
};

/**
 * Read id and length of 3ds chunk
 * @param {a3d.Chunk3ds} chunk
 */		
a3d.Loader3ds.prototype.readChunk = function(chunk) {
	chunk.id = this.ba.readUnsignedShort();
	chunk.length = this.ba.readUnsignedInt();
	chunk.bytesRead = 6;
};

/**
 * Skips past a chunk. If we don't understand the meaning of a chunk id,
 * we just skip past it.
 * @param {a3d.Chunk3ds} chunk
 */	
a3d.Loader3ds.prototype.skipChunk = function(chunk) {
	this.ba.pos += chunk.length - chunk.bytesRead;
	chunk.bytesRead = chunk.length;
};

/**
 * Read the base 3DS object.
 * @param {a3d.Chunk3ds} chunk
 */		
a3d.Loader3ds.prototype.parse3DS = function(chunk) {
	while (chunk.bytesRead < chunk.length) {
		var subChunk = new a3d.Chunk3ds();
		this.readChunk(subChunk);
		if (subChunk.id == this.EDIT3DS) {
			this.parseEdit3DS(subChunk);
		} else if (subChunk.id == this.KEYF3DS) {
			this.skipChunk(subChunk);
		} else {
			this.skipChunk(subChunk);
		}
		chunk.bytesRead += subChunk.length;
	}
};

/**
 * Read the Edit chunk
 * @param {a3d.Chunk3ds} chunk
 */
a3d.Loader3ds.prototype.parseEdit3DS = function(chunk) {
	while (chunk.bytesRead < chunk.length) {
		var subChunk = new a3d.Chunk3ds();
		this.readChunk(subChunk);
		
		if (subChunk.id == this.MATERIAL) {
			this.parseMaterial(subChunk);
		} else if (subChunk.id == this.MESH) {
			this.meshData = new a3d.MeshData();
			this.meshData.sd = this.shaderData;
			this.readMeshName(subChunk);
			this.parseMesh(subChunk);
			this.meshDatas.push(this.meshData);
		} else {
			this.skipChunk(subChunk);
		}
		chunk.bytesRead += subChunk.length;
	}
};

a3d.Loader3ds.prototype.parseMaterial = function(chunk) {
	while (chunk.bytesRead < chunk.length) {
		var subChunk = new a3d.Chunk3ds();
		this.readChunk(subChunk);
		
		if (subChunk.id == this.MAT_NAME) {
			this.readMaterialName(subChunk);
		} else if (subChunk.id == this.MAT_AMBIENT) {
			this.readColor(this.AMBIENT);
		} else if (subChunk.id == this.MAT_DIFFUSE) {
			this.readColor(this.DIFFUSE);
		} else if (subChunk.id == this.MAT_SPECULAR) {
			this.readColor(this.SPECULAR);
		} else if (subChunk.id == this.MAT_TEXMAP) {
			this.parseMaterial(subChunk);
		} else if (subChunk.id == this.MAT_TEXFLNM) {
			this.readTextureFileName(subChunk);
		} else {
			this.skipChunk(subChunk);
		}
		chunk.bytesRead += subChunk.length;
	}
};

a3d.Loader3ds.prototype.readMaterialName = function(chunk) {
	this.shaderData = this.sds.get(this.ba.readCString());
	chunk.bytesRead = chunk.length;
};

a3d.Loader3ds.prototype.readColor = function(type) {
	this.shaderData.type = a3d.ShaderType.COLOR;
	
	var color = null;
	var chunk = new a3d.Chunk3ds();
	this.readChunk(chunk);
	if (chunk.id == this.COLOR_RGB) {
		color = new a3d.Color(this.readColorRGB(chunk));
	} else if (chunk.id == this.COLOR_F) {
		this.skipChunk(chunk);
	} else {
		this.skipChunk(chunk);
	}
	
	// The property will get auto-copied into the final shader,
	// since type is one of: 'ambient', 'diffuse', 'specular'
	this.shaderData[type] = color;
};

// TODO: This does not need to be a for loop; unroll it
a3d.Loader3ds.prototype.readColorRGB = function(chunk) {
	var value = 0;
	
	for (var i = 0; i < 3; ++i) {
		var c = this.ba.readUnsignedByte();
		value += c << ((2 - i) << 3);	// c*Math.pow(0x100, 2 - i);
	}
	chunk.bytesRead += 3;
	
	return value;
};

a3d.Loader3ds.prototype.readTextureFileName = function(chunk) {
	this.shaderData.type = a3d.ShaderType.TXTUR;
	
	var file = this.ba.readCString();
	var url = (this.baseUrl + file).replace('..', '');
	this.shaderData.urls.push(url);
	
	chunk.bytesRead = chunk.length;
};

a3d.Loader3ds.prototype.parseMesh = function(chunk) {
	while (chunk.bytesRead < chunk.length) {
		var subChunk = new a3d.Chunk3ds();
		this.readChunk(subChunk);
		
		if (subChunk.id == this.MESH_OBJECT) {
			this.parseMesh(subChunk);
		} else if (subChunk.id == this.MESH_VERTICES) {
			this.readMeshVertices(subChunk);
		} else if (subChunk.id == this.MESH_FACES) {
			this.readMeshFaces(subChunk);
			this.parseMesh(subChunk);
		} else if (subChunk.id == this.MESH_MATER) {
			this.readMeshMaterial(subChunk);
		} else if (subChunk.id == this.MESH_TEX_VERT) {
			this.readMeshTexVert(subChunk);
		} else {
			this.skipChunk(subChunk);
		}
		chunk.bytesRead += subChunk.length;
	}
};

a3d.Loader3ds.prototype.readMeshName = function(chunk) {
	this.meshData.name = this.ba.readCString();
	chunk.bytesRead += this.meshData.name.length + 1;
};

a3d.Loader3ds.prototype.readMeshVertices = function(chunk) {
	var vs = this.meshData.vs, ba = this.ba;
	
	var numVerts = ba.readUnsignedShort();
	chunk.bytesRead += 2;
	
	var scale = 1.0;
	for (var i = 0; i < numVerts; ++i) {
		var v = new a3d.Vert(ba.readFloat()*scale, -ba.readFloat()*scale, -ba.readFloat()*scale);
		vs.push(v);
	}
	chunk.bytesRead += 12*numVerts;
};

a3d.Loader3ds.prototype.readMeshFaces = function(chunk) {
	var fs = this.meshData.fs, ba = this.ba;
	
	var numFaces = ba.readUnsignedShort();
	chunk.bytesRead += 2;
	
	for (var i = 0; i < numFaces; ++i) {
		var fvis = [ba.readUnsignedShort(), ba.readUnsignedShort(), ba.readUnsignedShort()];
		this.ba.readUnsignedShort();
		fs.push(fvis);
	}
	chunk.bytesRead += 8*numFaces;
};

/**
 * Read the Mesh Material chunk
 * @param {a3d.Chunk3ds} chunk
 */
a3d.Loader3ds.prototype.readMeshMaterial = function(chunk) {
	var meshMat = new a3d.MeshMaterialData();
	meshMat.symbol = this.ba.readCString();
	chunk.bytesRead += meshMat.symbol.length + 1;
	
	var numFaces = this.ba.readUnsignedShort();
	chunk.bytesRead += 2;
	for (var i = 0; i < numFaces; ++i) {
		meshMat.fs.push(this.ba.readUnsignedShort());
	}
	chunk.bytesRead += 2*numFaces;
	
	this.meshData.mats.push(meshMat);
};

a3d.Loader3ds.prototype.readMeshTexVert = function(chunk) {
	var uvs = this.meshData.uvs, ba = this.ba;
	
	var numUVs = this.ba.readUnsignedShort();
	chunk.bytesRead += 2;
	
	for (var i = 0; i < numUVs; ++i) {
		var uv = new a3d.UV(ba.readFloat(), ba.readFloat());
		uvs.push(uv);
	}
	chunk.bytesRead += 8*numUVs;
};

a3d.Loader3ds.prototype.buildMeshes = function() {
	var mds = this.meshDatas;
	for (var i = 0; i < mds.length; ++i) {
		var md = mds[i];
		
		// Build triangles from the indices
		var fs = md.fs, vs = md.vs, uvs = md.uvs;
		for (var j = 0; j < fs.length; ++j) {
			var fvis = fs[j];
			var tri = new a3d.Triangle(vs[fvis[0]], vs[fvis[1]], vs[fvis[2]], uvs[fvis[0]], uvs[fvis[1]], uvs[fvis[2]]);
			fs[j] = tri;
		}
		
		// Create Mesh object
		var mesh = new a3d.Mesh({name: md.name, data: md, shader: md.sd.shader});
		this.meshes.push(mesh);
	}
};

