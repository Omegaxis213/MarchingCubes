import { Debugger } from "../lib/webglutils/Debugging.js";
import {
	CanvasAnimation,
	WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { GUI } from "./Gui.js";
import { Floor } from "../lib/webglutils/Floor.js"
import {
	defaultFSText,
	defaultVSText,
	floorFSText,
	floorVSText,
	sphereFSText,
	sphereVSText,
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { SphereGeometry } from "./SphereGeometry.js";
import { MarchingCube } from "./MarchingCube.js";
import { PerlinNoise } from "./PerlinNoise.js";

export interface MengerAnimationTest {
	reset(): void;
	getGUI(): GUI;
	draw(): void;
}

export class MengerAnimation extends CanvasAnimation {
	private gui: GUI;

	private time: number;

	//floor
	private floor: Floor = new Floor();
	private floorRenderPass: RenderPass;

	private sphere: SphereGeometry = new SphereGeometry();
	private sphereRenderPass: RenderPass;

	private cube: MarchingCube[];
	private cubeRenderPass: RenderPass[];

	/* Global Rendering Info */
	private lightPosition: Vec4 = new Vec4();
	private backgroundColor: Vec4 = new Vec4();

	private curChunkX: number;
	private curChunkZ: number;

	private sizeX: number;
	private sizeY: number;
	private sizeZ: number;
	private offsetY: number;
	private width: number;
	private numChunk: number;

	constructor(canvas: HTMLCanvasElement) {
		super(canvas);
		this.gui = new GUI(canvas, this);
		this.time = 0;

		this.ctx = Debugger.makeDebugContext(this.ctx);
		let gl = this.ctx;

		this.sizeX = 20;
		this.sizeY = 50;
		this.sizeZ = 20;
		this.offsetY = 15;
		this.width = 1;
		this.numChunk = 3;
		var cameraChunkX = Math.floor(this.gui.getCameraPos().x / this.sizeX);
		var cameraChunkZ = Math.floor(this.gui.getCameraPos().z / this.sizeZ);
		
		this.cube = new Array((this.numChunk * 2 + 1) * (this.numChunk * 2 + 1));
		this.cubeRenderPass = new Array((this.numChunk * 2 + 1) * (this.numChunk * 2 + 1));
		this.curChunkX = cameraChunkX;
		this.curChunkZ = cameraChunkZ;
		var time = performance.now();
		for (var a = -this.numChunk; a <= this.numChunk; a++)
		{
			for(var b = -this.numChunk; b <= this.numChunk; b++)
			{
				this.cubeRenderPass[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk] = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);

				let grid = new Array(Math.ceil(this.sizeX / this.width) + 3);
				var posI = 0;
				for (var i = 0; i < this.sizeX + this.width * 3; i += this.width) // x coord
				{
					let arrTwo = new Array(Math.ceil((this.sizeY - this.offsetY - 15) / this.width));
					var posJ = 0;
					for (var j = 0; j < this.sizeY - this.offsetY - 15; j += this.width) // y coord
					{
						let arrOne = new Array(Math.ceil(this.sizeZ / this.width) + 3);
						var posK = 0;
						for (var k = 0; k < this.sizeZ + this.width * 3; k += this.width) // z coord
						{
							var posX = i + (cameraChunkX + a) * this.sizeX;
							var posY = j;
							var posZ = k + (cameraChunkZ + b) * this.sizeZ;
							arrOne[posK] = j - PerlinNoise.octavePerlin(posX / 40, posY / 10, posZ / 40, 6, .5) * this.sizeY + this.offsetY;
							posK++;
						}
						arrTwo[posJ] = arrOne;
						posJ++;
					}
					grid[posI] = arrTwo;
					posI++;
				}

				this.cube[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk] = new MarchingCube(grid, this.width, (cameraChunkX + a) * this.sizeX, (cameraChunkZ + b) * this.sizeZ);

				this.initCube((a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk);
			}
		}
		var newTime = performance.now();
		console.log("Finished generating terrain: " + (newTime - time) + " milliseconds");
		

		this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
		this.sphereRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
//		this.cubeRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
		/* Setup Animation */
		this.reset();
	}

	/**
	 * Setup the animation. This can be called again to reset the animation.
	 */
	public reset(): void {

		/* debugger; */
		this.lightPosition = new Vec4([-10.0, 100.0, -10.0, 1.0]);
		this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

		this.initFloor();
		this.initSphere();

		this.gui.reset();

	}

	/**
 * Sets up the floor and floor drawing
 */
	public initFloor(): void {
		this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
		this.floorRenderPass.addAttribute("aVertPos",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.floor.positionsFlat()
		);

		this.floorRenderPass.addUniform("uLightPos",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.lightPosition.xyzw);
		});
		this.floorRenderPass.addUniform("uWorld",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
		});
		this.floorRenderPass.addUniform("uProj",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.floorRenderPass.addUniform("uView",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.floorRenderPass.addUniform("uProjInv",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
		});
		this.floorRenderPass.addUniform("uViewInv",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
		});

		this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
		this.floorRenderPass.setup();
	}

	/**
 * Sets up the sphere and sphere drawing
 */
	public initSphere(): void {
		this.sphereRenderPass.setIndexBufferData(this.sphere.indicesFlat());
		this.sphereRenderPass.addAttribute("aVertPos",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.sphere.positionsFlat()
		);

		this.sphereRenderPass.addAttribute("aNorm",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.sphere.normsFlat()
		);

		this.sphereRenderPass.addUniform("uLightPos",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.lightPosition.xyzw);
		});
		this.sphereRenderPass.addUniform("uWorld",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
		});
		this.sphereRenderPass.addUniform("uProj",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.sphereRenderPass.addUniform("uView",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.sphereRenderPass.addUniform("uProjInv",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
		});
		this.sphereRenderPass.addUniform("uViewInv",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
		});

		this.sphereRenderPass.setDrawData(this.ctx.TRIANGLES, this.sphere.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
		this.sphereRenderPass.setup();
	}

	/**
 * Sets up the cube and cube drawing
 */
	public initCube(index: number): void {
		this.cubeRenderPass[index].setIndexBufferData(this.cube[index].indicesFlat());
		this.cubeRenderPass[index].addAttribute("aVertPos",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.cube[index].positionsFlat()
		);

		this.cubeRenderPass[index].addAttribute("aNorm",
			4,
			this.ctx.FLOAT,
			false,
			4 * Float32Array.BYTES_PER_ELEMENT,
			0,
			undefined,
			this.cube[index].normsFlat()
		);

		this.cubeRenderPass[index].addUniform("uLightPos",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniform4fv(loc, this.lightPosition.xyzw);
		});
		this.cubeRenderPass[index].addUniform("uWorld",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
		});
		this.cubeRenderPass[index].addUniform("uProj",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
		});
		this.cubeRenderPass[index].addUniform("uView",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
		});
		this.cubeRenderPass[index].addUniform("uProjInv",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
		});
		this.cubeRenderPass[index].addUniform("uViewInv",
			(gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
			gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
		});

		this.cubeRenderPass[index].setDrawData(this.ctx.TRIANGLES, this.cube[index].indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
		this.cubeRenderPass[index].setup();
	}

	/**
	 * Draws a single frame
	 */
	public draw(): void {

		const gl: WebGLRenderingContext = this.ctx;

		/* Clear canvas */
		const bg: Vec4 = this.backgroundColor;
		gl.clearColor(bg.r, bg.g, bg.b, bg.a);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		gl.frontFace(gl.CCW);
//		gl.cullFace(gl.BACK);

		//inefficient way of updating chunks

		
		var cameraChunkX = Math.floor(this.gui.getCameraPos().x / this.sizeX);
		var cameraChunkZ = Math.floor(this.gui.getCameraPos().z / this.sizeZ);
		
		if (cameraChunkX != this.curChunkX || cameraChunkZ != this.curChunkZ)
		{
			//keep old chunks
			var tempCube = new Array((this.numChunk * 2 + 1) * (this.numChunk * 2 + 1));
			var tempCubeRenderPass = new Array((this.numChunk * 2 + 1) * (this.numChunk * 2 + 1));
			var hasOldChunk = new Array((this.numChunk * 2 + 1) * (this.numChunk * 2 + 1));
			for (var a = -this.numChunk; a <= this.numChunk; a++)
			{
				for(var b = -this.numChunk; b <= this.numChunk; b++)
				{
					var newPosX = a + this.curChunkX - cameraChunkX;
					var newPosZ = b + this.curChunkZ - cameraChunkZ;
					if(newPosX >= -this.numChunk && newPosX <= this.numChunk && newPosZ >= -this.numChunk && newPosZ <= this.numChunk)
					{
						tempCube[(newPosX + this.numChunk) * (this.numChunk * 2 + 1) + newPosZ + this.numChunk] = this.cube[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk];
						tempCubeRenderPass[(newPosX + this.numChunk) * (this.numChunk * 2 + 1) + newPosZ + this.numChunk] = this.cubeRenderPass[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk];
						hasOldChunk[(newPosX + this.numChunk) * (this.numChunk * 2 + 1) + newPosZ + this.numChunk] = true;
					}
					else
						hasOldChunk[(newPosX + this.numChunk) * (this.numChunk * 2 + 1) + newPosZ + this.numChunk] = false;
				}
			}

			//generate new chunks
			this.cube = tempCube;
			this.cubeRenderPass = tempCubeRenderPass;
			this.curChunkX = cameraChunkX;
			this.curChunkZ = cameraChunkZ;
			var time = performance.now();
			for (var a = -this.numChunk; a <= this.numChunk; a++)
			{
				for(var b = -this.numChunk; b <= this.numChunk; b++)
				{
					if(hasOldChunk[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk]) continue;
					this.cubeRenderPass[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk] = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);

					let grid = new Array(Math.ceil(this.sizeX / this.width) + 3);
					var posI = 0;
					for (var i = 0; i < this.sizeX + this.width * 3; i += this.width) // x coord
					{
						let arrTwo = new Array(Math.ceil((this.sizeY - this.offsetY - 15) / this.width));
						var posJ = 0;
						for (var j = 0; j < this.sizeY - this.offsetY - 15; j += this.width) // y coord
						{
							let arrOne = new Array(Math.ceil(this.sizeZ / this.width) + 3);
							var posK = 0;
							for (var k = 0; k < this.sizeZ + this.width * 3; k += this.width) // z coord
							{
								var posX = i + (cameraChunkX + a) * this.sizeX;
								var posY = j;
								var posZ = k + (cameraChunkZ + b) * this.sizeZ;
								arrOne[posK] = j - PerlinNoise.octavePerlin(posX / 40, posY / 10, posZ / 40, 6, .5) * this.sizeY + this.offsetY;
								posK++;
							}
							arrTwo[posJ] = arrOne;
							posJ++;
						}
						grid[posI] = arrTwo;
						posI++;
					}

					this.cube[(a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk] = new MarchingCube(grid, this.width, (cameraChunkX + a) * this.sizeX, (cameraChunkZ + b) * this.sizeZ);

					this.initCube((a + this.numChunk) * (this.numChunk * 2 + 1) + b + this.numChunk);
				}
			}
			var newTime = performance.now();
			console.log("Finished generating terrain: " + (newTime - time) + " milliseconds");
		}

		this.floorRenderPass.draw();
//		this.sphereRenderPass.draw();
		for (var i = 0; i < this.cubeRenderPass.length; i++)
			this.cubeRenderPass[i].draw();
	}


	public getGUI(): GUI {
		return this.gui;
	}
}

export function initializeCanvas(): void {
	const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
	/* Start drawing */
	const canvasAnimation: MengerAnimation = new MengerAnimation(canvas);
	canvasAnimation.start();
}
