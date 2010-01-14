/**
 * Away3d Lite 1.0 source code was used as the basis for the first version of this code.
 */

a3d.Chunk3ds = Class.extend({
	  id: 0
	, length: 0
	, bytesRead: 0	
});

a3d.MeshMaterialData = Class.extend({
	  symbol: ''
	, fs: []	// face indices
	
	, init: function() {
		this.fs = [];
	}
});

a3d.Loader3ds = a3d.LoaderBase.extend({
	  ba: null
	, meshes: []
	, meshDatas: []
	
	// Current state vars
	, meshData: null
	, shaderData: null
	
	//----- Color Types --------------------------------------------------------
	
	, AMBIENT: 'ambient'
	, DIFFUSE: 'diffuse'
	, SPECULAR: 'specular'
	
	//----- Main Chunks --------------------------------------------------------
	
	//, PRIMARY: 0x4D4D
	, EDIT3DS: 0x3D3D  // Start of our actual objects
	, KEYF3DS: 0xB000  // Start of the keyframe information
	
	//----- General Chunks -----------------------------------------------------
	
	//, VERSION: 0x0002
	//, MESH_VERSION: 0x3D3E
	//, KFVERSION: 0x0005
	, COLOR_F: 0x0010
	, COLOR_RGB: 0x0011
	//, LIN_COLOR_24: 0x0012
	//, LIN_COLOR_F: 0x0013
	//, INT_PERCENTAGE: 0x0030
	//, FLOAT_PERC: 0x0031
	//, MASTER_SCALE: 0x0100
	//, IMAGE_FILE: 0x1100
	//, AMBIENT_LIGHT: 0X2100
	
	//----- Object Chunks -----------------------------------------------------
	
	, MESH: 0x4000
	, MESH_OBJECT: 0x4100
	, MESH_VERTICES: 0x4110
	//, VERTEX_FLAGS: 0x4111
	, MESH_FACES: 0x4120
	, MESH_MATER: 0x4130
	, MESH_TEX_VERT: 0x4140
	//, MESH_XFMATRIX: 0x4160
	//, MESH_COLOR_IND: 0x4165
	//, MESH_TEX_INFO: 0x4170
	//, HEIRARCHY: 0x4F00
	
	//----- Material Chunks ---------------------------------------------------
	
	, MATERIAL: 0xAFFF
	, MAT_NAME: 0xA000
	, MAT_AMBIENT: 0xA010
	, MAT_DIFFUSE: 0xA020
	, MAT_SPECULAR: 0xA030
	//, MAT_SHININESS: 0xA040
	//, MAT_FALLOFF: 0xA052
	//, MAT_EMISSIVE: 0xA080
	//, MAT_SHADER: 0xA100
	, MAT_TEXMAP: 0xA200
	, MAT_TEXFLNM: 0xA300
	//, OBJ_LIGHT: 0x4600
	//, OBJ_CAMERA: 0x4700
	
	//----- KeyFrames Chunks --------------------------------------------------
	
	//, ANIM_HEADER: 0xB00A
	//, ANIM_OBJ: 0xB002
	//, ANIM_NAME: 0xB010
	//, ANIM_POS: 0xB020
	//, ANIM_ROT: 0xB021
	//, ANIM_SCALE: 0xB022
	
	, init: function(url, data) {
		this._super(url, data);
		
		this.ba = new a3d.ByteArray(data, a3d.Endian.LITTLE);
		this.meshes = [];
		this.meshDatas = [];
	}
	
	, parse: function() {
		//first chunk is always the primary, so we simply read it and parse it
		var chunk = new a3d.Chunk3ds();
		this.readChunk(chunk);
		this.parse3DS(chunk);
		
		this.buildShaders();
		this.buildMeshes();
	}
	
	/**
	 * Read id and length of 3ds chunk
	 * @param {a3d.Chunk3ds} chunk
	 */		
	, readChunk: function(chunk) {
		chunk.id = this.ba.readUnsignedShort();
		chunk.length = this.ba.readUnsignedInt();
		chunk.bytesRead = 6;
	}
	
	/**
	 * Skips past a chunk. If we don't understand the meaning of a chunk id,
	 * we just skip past it.
	 * @param {a3d.Chunk3ds} chunk
	 */	
	, skipChunk: function(chunk) {
		this.ba.pos += chunk.length - chunk.bytesRead;
		chunk.bytesRead = chunk.length;
	}

	/**
	 * Read the base 3DS object.
	 * @param {a3d.Chunk3ds} chunk
	 */		
	, parse3DS: function(chunk) {
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
	}
	
	/**
	 * Read the Edit chunk
	 * @param {a3d.Chunk3ds} chunk
	 */
	, parseEdit3DS: function(chunk) {
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
	}
	
	, parseMaterial: function(chunk) {
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
	}
	
	, readMaterialName: function(chunk) {
		this.shaderData = this.sds.get(this.ba.readCString());
		chunk.bytesRead = chunk.length;
	}
	
	, readColor: function(type) {
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
	}
	
	// TODO: This does not need to be a for loop; unroll it
	, readColorRGB: function(chunk) {
		var value = 0;
		
		for (var i = 0; i < 3; ++i) {
			var c = this.ba.readUnsignedByte();
			value += c << ((2 - i) << 3);	// c*Math.pow(0x100, 2 - i);
		}
		chunk.bytesRead += 3;
		
		return value;
	}
	
	, readTextureFileName: function(chunk) {
		this.shaderData.type = a3d.ShaderType.TXTUR;
		
		var file = this.ba.readCString();
		var url = (this.baseUrl + file).replace('..', '');
		this.shaderData.urls.push(url);
		
		chunk.bytesRead = chunk.length;
	}
	
	, parseMesh: function(chunk) {
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
	}
	
	, readMeshName: function(chunk) {
		this.meshData.name = this.ba.readCString();
		chunk.bytesRead += this.meshData.name.length + 1;
	}
	
	, readMeshVertices: function(chunk) {
		var vs = this.meshData.vs, ba = this.ba;
		
		var numVerts = ba.readUnsignedShort();
		chunk.bytesRead += 2;
		
		var scale = 1.0;
		for (var i = 0; i < numVerts; ++i) {
			var v = new a3d.Vert(ba.readFloat()*scale, -ba.readFloat()*scale, -ba.readFloat()*scale);
			vs.push(v);
		}
		chunk.bytesRead += 12*numVerts;
	}
	
	, readMeshFaces: function(chunk) {
		var fs = this.meshData.fs, ba = this.ba;
		
		var numFaces = ba.readUnsignedShort();
		chunk.bytesRead += 2;
		
		for (var i = 0; i < numFaces; ++i) {
			var fvis = [ba.readUnsignedShort(), ba.readUnsignedShort(), ba.readUnsignedShort()];
			this.ba.readUnsignedShort();
			fs.push(fvis);
		}
		chunk.bytesRead += 8*numFaces;
	}
	
	/**
	 * Read the Mesh Material chunk
	 * @param {a3d.Chunk3ds} chunk
	 */
	, readMeshMaterial: function(chunk) {
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
	}
	
	, readMeshTexVert: function(chunk) {
		var uvs = this.meshData.uvs, ba = this.ba;
		
		var numUVs = this.ba.readUnsignedShort();
		chunk.bytesRead += 2;
		
		for (var i = 0; i < numUVs; ++i) {
			var uv = new a3d.UV(ba.readFloat(), ba.readFloat());
			uvs.push(uv);
		}
		chunk.bytesRead += 8*numUVs;
	}
	
	, buildMeshes: function() {
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
	}


});
