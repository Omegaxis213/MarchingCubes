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

  private cube: MarchingCube;
  private cubeRenderPass: RenderPass;

  /* Global Rendering Info */
  private lightPosition: Vec4 = new Vec4();
  private backgroundColor: Vec4 = new Vec4();


  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.gui = new GUI(canvas, this);
    this.time = 0;

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    
    let grid = [];
    var size = 30;
    var width = .5;

    for (var i = 0; i < size; i += width) // x coord
    {
      let arrTwo = [];
      for (var j = 0; j < size; j += width) // y coord
      {
        let arrOne = [];
        for (var k = 0; k < size; k += width) // z coord
        {
//          arrOne.push(10 - j);
//          arrOne.push((i - size / 2) * (i - size / 2) + (j - size / 2) * (j - size / 2) + (k - size / 2) * (k - size / 2) - 25 + Math.random() * 2);
          var posX = i - size / 2;
          var posY = j - size / 2;
          var posZ = k - size / 2;
          arrOne.push((posX * posX + posY * posY + posZ * posZ + 25 - 12) * (posX * posX + posY * posY + posZ * posZ + 25 - 12) - 4 * 25 * (posX * posX + posY * posY));
//          arrOne.push(Math.sin(i) + Math.sin(j) + Math.sin(k));
        }
        arrTwo.push(arrOne);
      }
      grid.push(arrTwo);
    }

    this.cube = new MarchingCube(grid, size, width);
    
//    this.cube = new MarchingCube([], 0);

    this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
    this.sphereRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
    this.cubeRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
    /* Setup Animation */
    this.reset();
  }

  /**
   * Setup the animation. This can be called again to reset the animation.
   */
  public reset(): void {

    /* debugger; */
    this.lightPosition = new Vec4([-10.0, 10.0, -10.0, 1.0]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

    this.initFloor();
    this.initSphere();
    this.initCube();

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
  public initCube(): void {
    this.cubeRenderPass.setIndexBufferData(this.cube.indicesFlat());
    this.cubeRenderPass.addAttribute("aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cube.positionsFlat()
    );

    this.cubeRenderPass.addAttribute("aNorm",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cube.normsFlat()
    );

    this.cubeRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
    });
    this.cubeRenderPass.addUniform("uWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
    });
    this.cubeRenderPass.addUniform("uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.cubeRenderPass.addUniform("uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });
    this.cubeRenderPass.addUniform("uProjInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
    });
    this.cubeRenderPass.addUniform("uViewInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
    });

    this.cubeRenderPass.setDrawData(this.ctx.TRIANGLES, this.cube.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
    this.cubeRenderPass.setup();
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
    //gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    //gl.cullFace(gl.BACK);

    /* inefficient? way of updating a chunk
    this.cubeRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
    let grid = [];
    var size = 20;

    for (var i = 0; i < size; i++) // x coord
    {
      let arrTwo = [];
      for (var j = 0; j < size; j++) // y coord
      {
        let arrOne = [];
        for (var k = 0; k < size; k++) // z coord
        {
          arrOne.push(Math.sin(i + this.time) + Math.sin(j + this.time) + Math.sin(k + this.time));
        }
        arrTwo.push(arrOne);
      }
      grid.push(arrTwo);
    }

    this.cube = new MarchingCube(grid, size);

    this.time += .01;
    this.initCube();
    */

    this.floorRenderPass.draw();
    this.sphereRenderPass.draw();
    this.cubeRenderPass.draw();
  }


  public getGUI(): GUI {
    return this.gui;
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: MengerAnimation = new MengerAnimation(canvas);
  // mengerTests.registerDeps(canvasAnimation);
  // mengerTests.registerDeps(canvasAnimation);
  canvasAnimation.start();
}
