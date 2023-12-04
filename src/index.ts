import { GUI } from 'dat.gui';
import { mat4, vec3, quat, vec2 } from 'gl-matrix';
import { Camera } from './camera';
import { GLContext } from './gl';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';
import { SphereGeometry } from './geometries/sphere';
import { PointLight } from './lights/lights';

interface GUIProperties {
  albedo: number[];
  coordinate: number[];
  metallic: number;
  roughness: number;
  light_strength: number;
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
   *
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  private _geometry: SphereGeometry;
  private _uniforms: Record<string, UniformType | Texture>;

  private _textureDiffuse: Texture2D<HTMLElement> | null;

  private _camera: Camera;
  private _light: PointLight;

  private _mouseClicked: boolean;
  private _mouseCurrentPosition: { x: number, y: number };

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    this._context = new GLContext(canvas);
    this._camera = new Camera();
    vec3.set(this._camera.position, 0.0, 0.0, 2.0);
    this._light = new PointLight();
    vec3.set(this._light.positionWS, 0.0, 0.0, 2.0);
    this._mouseClicked = false;
    this._mouseCurrentPosition = { x: 0, y: 0 };

    this._geometry = new SphereGeometry();
    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uMaterial.metallic': 0.0,
      'uMaterial.roughness': 0.5,
      'uCamera.position': this._camera.position,
      'uLight.position': this._light.positionWS,
      'uLight.color': vec3.fromValues(1.0, 1.0, 1.0),
      'uLight.intensity': 1.0,
      'uCamera.WsToCs': mat4.create(),
    };

    this._shader = new PBRShader();
    this._textureDiffuse = null;

    this._guiProperties = {
      albedo: [255, 255, 255],
      coordinate: [0, 0, 0],  // position x , y changeable on the fly
      metallic: 0.0,
      roughness: 0.5,
      light_strength: 1.0
    };

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._context.uploadGeometry(this._geometry);
    this._context.compileProgram(this._shader);

    // Example showing how to load a texture and upload it to GPU.
    this._textureDiffuse = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
    );
    if (this._textureDiffuse !== null) {
      this._context.uploadTexture(this._textureDiffuse);
      // You can then use it directly as a uniform:
      //uniforms.myTexture = this._textureExample;
      this._uniforms['uTextureDiffuse'] = this._textureDiffuse;
    }

    // Event handlers (mouse and keyboard)
    canvas.addEventListener('keydown', this.onKeyDown, true);
    canvas.addEventListener('pointerdown', this.onPointerDown, true);
    canvas.addEventListener('pointermove', this.onPointerMove, true);
    canvas.addEventListener('pointerup', this.onPointerUp, true);
    canvas.addEventListener('pointerleave', this.onPointerUp, true);
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    /** Empty. */
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    this._context.clear();
    this._context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    vec3.set(
      this._uniforms['uLight.position'] as vec3,
      (props.coordinate[0] / 255 - 0.5) * 2,
      (props.coordinate[1] / 255 - 0.5) * 2,
      2 // props.coordinate[2] / 255
    );

    // Set the metallic and roughness properties from the GUI.
    this._uniforms['uMaterial.metallic'] = props.metallic;
    this._uniforms['uMaterial.roughness'] = props.roughness;
    this._uniforms['uLight.intensity'] = props.light_strength;

    // Sets the view projection matrix.
    const aspect = this._context.gl.drawingBufferWidth / this._context.gl.drawingBufferHeight;
    let WsToCs = this._uniforms['uCamera.WsToCs'] as mat4;
    mat4.multiply(WsToCs, this._camera.computeProjection(aspect), this._camera.computeView());

    // Set the camera position.
    // this._camera.position[0] = props.coordinate[0];
    // this._camera.position[1] = props.coordinate[1];
    this._uniforms['uCamera.position'] = this._camera.position;


    // Set the light position.
    // this._uniforms['uLight.position'] = this._light.positionWS;
    this._uniforms['uLight.color'] = this._light.color;
    //this._uniforms['uLight.intensity'] = this._light.intensity;

    // **Note**: if you want to modify the position of the geometry, you will
    // need to add a model matrix, corresponding to the mesh's matrix.

    // Draws the object.
    this._context.draw(this._geometry, this._shader, this._uniforms);
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();
    gui.addColor(this._guiProperties, 'albedo');
    gui.addColor(this._guiProperties, 'coordinate');
    gui.add(this._guiProperties, 'metallic', 0.0, 1.0);
    gui.add(this._guiProperties, 'roughness', 0.0, 1.0);
    gui.add(this._guiProperties, 'light_strength', 0.0, 5.0);
    return gui;
  }

  /**
   * Handle keyboard and mouse inputs to translate and rotate camera.
   */
  onKeyDown(event: KeyboardEvent) {
    const speed = 0.2;

    let forwardVec = vec3.fromValues(0.0, 0.0, -speed);
    vec3.transformQuat(forwardVec, forwardVec, app._camera.rotation);
    let rightVec = vec3.fromValues(speed, 0.0, 0.0);
    vec3.transformQuat(rightVec, rightVec, app._camera.rotation);

    if (event.key == 'z' || event.key == 'ArrowUp') {
      vec3.add(app._camera.position, app._camera.position, forwardVec);
    }
    else if (event.key == 's' || event.key == 'ArrowDown') {
      vec3.add(app._camera.position, app._camera.position, vec3.negate(forwardVec, forwardVec));
    }
    else if (event.key == 'd' || event.key == 'ArrowRight') {
      vec3.add(app._camera.position, app._camera.position, rightVec);
    }
    else if (event.key == 'q' || event.key == 'ArrowLeft') {
      vec3.add(app._camera.position, app._camera.position, vec3.negate(rightVec, rightVec));
    }
  }

  onPointerDown(event: MouseEvent) {
    app._mouseCurrentPosition.x = event.clientX;
    app._mouseCurrentPosition.y = event.clientY;
    app._mouseClicked = true;
  }

  onPointerMove(event: MouseEvent) {
    if (!app._mouseClicked) {
      return;
    }

    const dx = event.clientX - app._mouseCurrentPosition.x;
    const dy = event.clientY - app._mouseCurrentPosition.y;
    const angleX = dy * 0.002;
    const angleY = dx * 0.002;
    quat.rotateX(app._camera.rotation, app._camera.rotation, angleX);
    quat.rotateY(app._camera.rotation, app._camera.rotation, angleY);

    app._mouseCurrentPosition.x = event.clientX;
    app._mouseCurrentPosition.y = event.clientY;
  }

  onPointerUp(event: MouseEvent) {
    app._mouseClicked = false;
  }

}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new Application(canvas as HTMLCanvasElement);
app.init();

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
