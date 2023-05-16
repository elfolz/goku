import * as THREE from './three.module.js'
import { GLTFLoader } from './gltfLoader.module.js'
import { FBXLoader } from './fbxLoader.module.js'
import { OrbitControls } from './orbitControls.js'

if (location.protocol.startsWith('https')) {
	navigator.serviceWorker.register('service-worker.js')
	navigator.serviceWorker.onmessage = m => {
		console.info('Update found!')
		if (m?.data == 'update') location.reload(true)
	}
}

const audio = new Audio('./audio/oi.mp3')
const clock = new THREE.Clock()
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true})
const camera = new THREE.PerspectiveCamera(75, window.innerWidth /window.innerHeight, 0.1, 1000)
const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x000000, 0.25)
const dirLight1 = new THREE.DirectionalLight(0xFFFFFF, 2)
const dirLight2 = new THREE.DirectionalLight(0xFFFFFF, 2)
const dirLight3 = new THREE.DirectionalLight(0xFFFFFF, 2)
const gltfLoader = new GLTFLoader()
const fbxLoader = new FBXLoader()
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, renderer.domElement)
const fpsLimit = 1 / 60
const reader = new FileReader()
const animationModels = ['dancing', 'dismissing', 'fighting', 'fistPump', 'idle', 'pointing', 'salute', 'shakeFist', 'talking', 'thumbsUp', 'walking', 'waving']

const progress = new Proxy({}, {
	set: function(target, key, value) {
		target[key] = value
		let values = Object.values(target).slice()
		let progressbar = document.querySelector('progress')
		let total = values.reduce((a, b) => a + b, 0)
		total = total / 1
		if (progressbar) progressbar.value = parseInt(total || 0)
		if (total >= 100) setTimeout(() => initGame(), 500)
		return true
	}
})

scene.background = null
renderer.outputEncoding = THREE.sRGBEncoding
renderer.physicallyCorrectLights = true
renderer.sortObjects = false
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setClearColor(0x000000, 0)
scene.add(hemisphereLight)
controls.screenSpacePanning = true
controls.enableZoom = false
dirLight1.position.set(0, 0, 0)
dirLight2.position.set(100, -50, 0)
dirLight3.position.set(-100, -50, 0)
scene.add(dirLight1)
scene.add(dirLight2)
scene.add(dirLight3)

var audioPlayied = false
var clockDelta = 0
var gameStarted = false
var goku
var mixer
var photo
var animations = []
var lastAction

reader.onload = e => {
	photo.src = e.target.result
}

function loadModel() {
	gltfLoader.load('./models/goku.glb',
		gltf => {
			goku = gltf.scene
			goku.encoding = THREE.sRGBEncoding
			goku.position.y = -30
			mixer = new THREE.AnimationMixer(goku)
			mixer.clipAction(gltf.animations[0]).play()
			dirLight1.target = goku
			dirLight2.target = goku
			dirLight3.target = goku
			scene.add(goku)
			loadAnimations()
		}, xhr => {
			console.log(xhr)
			progress['goku'] = parseInt((xhr.loaded / xhr.total) * 100)
		}, error => {
			console.error(error)
		}
	)
}

function loadAnimations() {
	animationModels.forEach(el => {
		fbxLoader.load(`./models/${el}.fbx`, fbx => {
			animations[el] = mixer.clipAction(fbx.animations[0])
			animations[el].name = el
			if (el == 'idle') {
				lastAction = animations[el]
				animations[el].play()
			}
		}, xhr => {
			progress[el] = parseInt((xhr.loaded / xhr.total) * 100)
		}, error => {
			console.error(error)
		})
	})
}

function initGame() {
	if (gameStarted) return
	gameStarted = true
	document.body.classList.add('loaded')
	document.body.removeChild(document.querySelector('figure'))
	document.querySelector('footer').style.removeProperty('display')
	document.onclick = () => {
		if (audioPlayied) return
		audio.play()
		audioPlayied = true
	}
	resizeScene()
	animate()
}

function resizeScene() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	if (window.innerWidth < 390) camera.position.z = 70
	else if (window.innerWidth <= 800) camera.position.z = 80
	else camera.position.z = 70
	camera.position.y = 20
}

function animate() {
	requestAnimationFrame(animate)
	if (document.hidden) return
	clockDelta += clock.getDelta()
	if (fpsLimit && clockDelta < fpsLimit) return
	renderer.render(scene, camera)
	controls.update()
	mixer?.update(clockDelta)
	clockDelta = fpsLimit ? clockDelta % fpsLimit : clockDelta
}

function executeCrossFade(newAction) {
	if (lastAction == newAction) return
	newAction.enabled = true
	newAction.setEffectiveTimeScale(1)
	newAction.setEffectiveWeight(1)
	newAction.loop = 'repeat'
	lastAction.crossFadeTo(newAction, 0.25, true)
	lastAction = newAction
	newAction.play()
}

window.onresize = () => resizeScene()
window.oncontextmenu = e => {e.preventDefault(); return false}

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	loadModel()
	document.querySelector('button').onclick = () => {
		const i = animationModels.findIndex(el => el == lastAction.name)
		const index = i < (animationModels.length-1) ? i+1 : 0
		executeCrossFade(animations[animationModels[index]])
	}
}
document.body.appendChild(renderer.domElement)