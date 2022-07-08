import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'dat.gui'
import { AxesHelper, BoxHelper, BufferAttribute, BufferGeometry, Camera, DirectionalLight, Float32BufferAttribute, Fog, Loader, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, Object3D, ObjectLoader, Points, PointsMaterial, Raycaster, Sphere, SpotLight, SpotLightHelper, Texture, TextureLoader, Vector2, Vector3 } from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { stat } from 'fs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { dir } from 'console'

//classes

//water ripple class
class AnimatedCircle {
    Timer: number;
    Circle: THREE.Mesh;
    StartingTimer: number;
    Active: boolean;

    constructor(circle: THREE.Mesh)
    {
        this.Timer = 0;
        this.StartingTimer = 0;
        this.Circle = circle;
        this.Circle.visible = false;
        this.Active = false;
        this.Circle.rotation.setFromVector3(new Vector3(-Math.PI / 2, 0, 0))
    }

    Initialize(timer: number) 
    {
        this.Timer = timer;
        this.StartingTimer = timer;
        this.Circle.visible = true;
        this.Active = true;
        this.Circle.scale.set(0, 0, 0);
    }

    Update()
    {
        this.Timer -= (1 / 60);
        if (this.Timer <= 0) {
            this.Circle.visible = false;
            this.Active = false;
            AnimatedDropRipples.splice(AnimatedDropRipples.indexOf(this), 1);
            this.Circle.scale.set(0, 0, 0)
        }
        else {

            var ran = Math.random() * 1 + 0.1;
            var temp = (this.StartingTimer - this.Timer) * ran * 3;
            this.Circle.scale.set(temp, temp, temp)
            if (this.Timer / this.StartingTimer < 0.2) {

            }
        }
    }

    Remove() {
        AnimatedDropRipples.splice(AnimatedDropRipples.indexOf(this));
        DropRipples.splice(DropRipples.indexOf(this));
        scene.remove(this.Circle)
    }
}

class RainDropClass {

    RainDropD: THREE.Mesh;
    Acceleration: number;
    StartingPosition: Vector3;
    constructor(rainDropD: THREE.Mesh) {
        this.RainDropD = rainDropD;
        this.RainDropD.scale.set(
            Math.random() * 1.5,
            Math.random() * 1.5,
            Math.random() * 1.5
        )
        this.Acceleration = 0;
        var vec = new Vector3(
            Math.random() * 34 - 17,
            Math.random() * 35,
            Math.random() * 34 - 17)
        this.RainDropD.position.set(vec.x, vec.y, vec.z);
        this.StartingPosition = vec;
    }

    Update() {
        this.Acceleration += (RainCountAndGravityAndFogIntensity.y / 60);
        this.RainDropD.position.add(new Vector3(windStrength.x / 60, this.Acceleration / 60, windStrength.y / 60))
    }

    ResetRainDrop() {
        this.Acceleration = 0;
        this.RainDropD.position.set(this.StartingPosition.x - windStrength.x, 35, this.StartingPosition.z - windStrength.y);
    }

    Remove() {
        scene.remove(this.RainDropD);
    }
}

//init scene
const scene = new THREE.Scene()

//variables
var windStrength = new Vector2(2, 2);
var RainCountAndGravityAndFogIntensity = new Vector3(500, -9.8, 0.01);
var DownVector: Vector3 = new Vector3(0, -1, 0)
var sceneMeshes: THREE.Mesh[] = [];
var ray = new Raycaster;
var intersects: THREE.Intersection[] = []

//camera stuff
const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.set(10, 6, -10)

//renderer
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
new OrbitControls(camera, renderer.domElement)
var ambient = new THREE.AmbientLight(0x555555, 0.5);
scene.add(ambient);

var lightOne = new THREE.SpotLight(0x9CD5F1, 5, 35, Math.PI / 3, 0.1);
var helpOne = new SpotLightHelper(lightOne);
var targetOne = new THREE.Object3D();
var targetHelperOne = new AxesHelper(2);
lightOne.add(helpOne)
lightOne.target = targetOne;
// targetOne.add(targetHelperOne)
scene.add(lightOne)
scene.add(targetOne);
lightOne.position.set(-0.9, 12.5, -1.5)
targetOne.position.set(-2, 0, -4)

var lightTwo = new THREE.SpotLight(0x9CD5F1, 5, 35, Math.PI / 3, 0.1);
var helpTwo = new SpotLightHelper(lightTwo);
var targetTwo = new THREE.Object3D();
var targetHelperTwo = new AxesHelper(2);
lightTwo.add(helpTwo)
lightTwo.target = targetTwo;
// targetTwo.add(targetHelperTwo)
scene.add(lightTwo)
scene.add(targetTwo);
lightTwo.position.set(2, 12.5, 0.9)
targetTwo.position.set(3, 0, 2)

//rain stuff
var dropGeo = new THREE.SphereGeometry(0.05)
var dropMat = new MeshBasicMaterial({ color: 0xc9ddff });
const RainDrops: RainDropClass[] = []

//circle ripples
const circle = new THREE.CircleGeometry(1)
var circleMat = new MeshBasicMaterial({ color: 0xc9ddff, transparent: true, opacity: 0.5 });
const DropRipples: AnimatedCircle[] = []
const AnimatedDropRipples: AnimatedCircle[] = []

var streetObject: THREE.Group = new THREE.Group();
const loader = new GLTFLoader()
loader.load(
    'models/StreetModel.glb',
    function (gltf) {
        gltf.scene.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                const m = (child as THREE.Mesh)
                m.receiveShadow = true
                m.castShadow = true
            }
        })
        streetObject = gltf.scene;
        scene.add(gltf.scene)
        gltf.scene.position.y = -2
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    (error) => {
        console.log(error)
    }
)

var matty = new MeshBasicMaterial({ color: 0xFF0000, side: THREE.DoubleSide, visible: false })
var objLoader = new OBJLoader()
objLoader.load(
    'models/GroundColliders.obj',
    (ebj) => {
        ebj.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = matty;
            }
        })
        var temp = sceneMeshes.push(ebj.children[0] as THREE.Mesh)
        scene.add(ebj)
        ebj.position.y = -2
    }
)

objLoader.load(
    'models/GroundColliders2.obj',
    (ebj) => {
        ebj.traverse(function (child) {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = matty;
            }
        })
        var temp = sceneMeshes.push(ebj.children[0] as THREE.Mesh)
        scene.add(ebj)
        ebj.position.y = -2
    }
)

//misc stuff
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}
const stats = Stats()
document.body.appendChild(stats.dom)

//gui stuff
var gui = new GUI();
const WindStrengthFolder = gui.addFolder('WindStrength')
WindStrengthFolder.open()
WindStrengthFolder.add(windStrength, "x", -25, 25)
WindStrengthFolder.add(windStrength, "y", -25, 25)

const RainAmountFolder = gui.addFolder('RainAmount');
RainAmountFolder.open()
RainAmountFolder.add(RainCountAndGravityAndFogIntensity, "x", 250, 2000).onFinishChange(CreateRainMesh)

const GravityFolder = gui.addFolder('Gravity')
GravityFolder.open()
GravityFolder.add(RainCountAndGravityAndFogIntensity, "y", -9.8, 1)

const FogFolder = gui.addFolder('FogIntensity');
FogFolder.open()
FogFolder.add(RainCountAndGravityAndFogIntensity, "z", 0, 0.05).onChange(CreateFog)

const LightOneFolder = gui.addFolder('LightOneIntensity');
LightOneFolder.open()
LightOneFolder.add(lightOne, "intensity", 0, 15)

const LightTwoFolder = gui.addFolder('LightTwoIntensity');
LightTwoFolder.open()
LightTwoFolder.add(lightTwo, "intensity", 0, 15)

CreateFog();
CreateRainMesh();
animate()


var tempVec = new Vector3()

function animate() {
    requestAnimationFrame(animate)

    for (let i = 0; i < RainDrops.length; i++) {
        RainDrops[i].Update();
        if (RainDrops[i].RainDropD.position.y <= 0) {

            tempVec = RainDrops[i].RainDropD.position;
            tempVec.y += 2;
            ray.set(tempVec, DownVector)
            intersects = ray.intersectObjects(sceneMeshes, false);
            if (intersects.length > 0) {

                FetchAnimatedCircle(RainDrops[i].RainDropD.position.x, intersects[0].point.y + 0.1, RainDrops[i].RainDropD.position.z);
            }
            RainDrops[i].ResetRainDrop();
        }
    }

    for (let i = 0; i < AnimatedDropRipples.length; i++) {
        AnimatedDropRipples[i].Update();
    }

    render()
    stats.update()
}

function render() {
    renderer.render(scene, camera)
}

function CreateFog() {
    scene.fog = new THREE.FogExp2(0x11111f, RainCountAndGravityAndFogIntensity.z);
}

function FetchAnimatedCircle(x :number, y:number, z: number) {

    for (let i = 0; i < DropRipples.length; i++) {
        if (DropRipples[i].Active) {
            continue;
        }
        else {
            AnimatedDropRipples.push(DropRipples[i]);
            DropRipples[i].Initialize(0.2);
            DropRipples[i].Circle.position.set(x,y,z);
        }
    }
}

function CreateRainMesh() {
    while (RainDrops.length > 0) {
        var temp = RainDrops.shift();
        temp?.Remove()
    }

    while (DropRipples.length > 0) {
        var circleTemp = AnimatedDropRipples.shift()
        circleTemp?.Remove();
    }

    for (let i = 0; i < RainCountAndGravityAndFogIntensity.x; i++) {

        var pointD = new THREE.Mesh(dropGeo, dropMat);
        RainDrops[i] = new RainDropClass(pointD);
        scene.add(pointD)
    }

    CreateRipple(RainCountAndGravityAndFogIntensity.x * 2)
}

function CreateRipple(amount: number) {
    for (let i = 0; i < amount; i++) {
        var circleD = new THREE.Mesh(circle, circleMat)
        scene.add(circleD)
        DropRipples[i] = new AnimatedCircle(circleD);
    }
}
