import { Vec3 } from "../lib/TSM.js";

//Taken and modified from the three.js library

export class MarchingCube{

	positionArr: Float32Array;
	indexArr: Uint32Array;
	normalArr: Float32Array;

	constructor() {

		// buffers

		const indices = [];
		const vertices = [];
		const normals = [];


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