import { Vec3 } from "../lib/TSM.js";

//Taken and modified from the three.js library

export class SphereGeometry{

	positionArr: Float32Array;
	indexArr: Uint32Array;
	normalArr: Float32Array;

	constructor( radius = 1, center = new Vec3([0, 0, 0]), widthSegments = 12, heightSegments = 10, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI ) {

		widthSegments = Math.max( 3, Math.floor( widthSegments ) );
		heightSegments = Math.max( 2, Math.floor( heightSegments ) );

		const thetaEnd = Math.min( thetaStart + thetaLength, Math.PI );

		let index = 0;
		const grid = [];

		const vertex = new Vec3();
		const normal = new Vec3();

		// buffers

		const indices = [];
		const vertices = [];
		const normals = [];
		const uvs = [];

		// generate vertices, normals and uvs

		for ( let iy = 0; iy <= heightSegments; iy ++ ) {

			const verticesRow = [];

			const v = iy / heightSegments;

			// special case for the poles

			let uOffset = 0;

			if ( iy == 0 && thetaStart == 0 ) {

				uOffset = 0.5 / widthSegments;

			} else if ( iy == heightSegments && thetaEnd == Math.PI ) {

				uOffset = - 0.5 / widthSegments;

			}

			for ( let ix = 0; ix <= widthSegments; ix ++ ) {

				const u = ix / widthSegments;

				// vertex

				vertex.x = - radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
				vertex.y = radius * Math.cos( thetaStart + v * thetaLength );
				vertex.z = radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );

				vertices.push( vertex.x + center.x, vertex.y + center.y, vertex.z + center.z, 1);

				// normal

				vertex.copy( normal ).normalize();
				normals.push( normal.x, normal.y, normal.z, 0);

				// uv

				uvs.push( u + uOffset, 1 - v );

				verticesRow.push( index ++ );

			}

			grid.push( verticesRow );

		}

		// indices

		for ( let iy = 0; iy < heightSegments; iy ++ ) {

			for ( let ix = 0; ix < widthSegments; ix ++ ) {

				const a = grid[ iy ][ ix + 1 ];
				const b = grid[ iy ][ ix ];
				const c = grid[ iy + 1 ][ ix ];
				const d = grid[ iy + 1 ][ ix + 1 ];

				if ( iy !== 0 || thetaStart > 0 ) indices.push( a, b, d );
				if ( iy !== heightSegments - 1 || thetaEnd < Math.PI ) indices.push( b, c, d );

			}

		}

		// build geometry
		this.positionArr = new Float32Array(vertices);
		this.normalArr = new Float32Array(normals);
		this.indexArr = new Uint32Array(indices);
	}

	public indicesFlat(): Uint32Array
	{
		return this.indexArr;
	}

	public positionsFlat(): Float32Array
	{
		return this.positionArr;
	}

	public normsFlat(): Float32Array
	{
		return this.normalArr;
	}
}