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

export interface MengerAnimationTest {
  reset(): void;
  getGUI(): GUI;
  draw(): void;
}

export class MengerAnimation extends CanvasAnimation {
  private gui: GUI;

  //floor
  private floor: Floor = new Floor();
  private floorRenderPass: RenderPass;

  private sphere: SphereGeometry = new SphereGeometry();
  private sphereRenderPass: RenderPass;

  /* Global Rendering Info */
  private lightPosition: Vec4 = new Vec4();
  private backgroundColor: Vec4 = new Vec4();

  // TODO: data structures for the floor


  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.gui = new GUI(canvas, this);

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
    this.sphereRenderPass = new RenderPass(this.extVAO, gl, sphereVSText, sphereFSText);
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

    this.floorRenderPass.draw();
    this.sphereRenderPass.draw();
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
