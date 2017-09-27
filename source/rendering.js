/*
where width and height are the width and height 
of the camera's cuboid-shaped frustum measured in world-space units.

near and far are the world-space distances to the near and 
far planes of the frustum. Both near and far should be greater than zero.

To prevent distortion, you will typically want the aspect ratio of the orthographic 
camera ( width / height ) to match the aspect ratio of the render's canvas. 

It is unfortunate that many of the three.js examples pass 
window.innerWidth and window.innerHeight as args to this constructor. Doing so 
only makes sense if the orthographic camera is used for rendering to a texture, 
 if the world units for your orthographic scene are in pixels.*/


var scene = new THREE.Scene();
var renderer = new THREE.CanvasRenderer();
var modelLoader = new THREE.OBJLoader();


renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
renderer.getContext('2d').font = "12px Arial";

var aspect = window.innerWidth / window.innerHeight;
var d = 20;
camera = new THREE.OrthographicCamera( - d * aspect, d * aspect, d, - d, 1, 1000 );
camera.position.set( -20, -20, 20 ); // all components equal
camera.lookAt( scene.position ); // or the origin



//var camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
//var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
//camera.position.z = 5;

var models = [];
var arrow = {};

function Model(meshes, name, color){
	this.meshes = [];
	this.name = name;
	this.color = color;
}

var basicMaterial = new THREE.MeshBasicMaterial( { color: 'blue' } );

/*
// controls
var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.addEventListener( 'change', Render );
controls.enableZoom = false;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2;


// grid
var geometry = new THREE.PlaneBufferGeometry( 100, 100, 10, 10 );
var material = new THREE.MeshBasicMaterial( { wireframe: true, opacity: 0.5, transparent: true } );
var grid = new THREE.Mesh( geometry, material );
grid.rotation.order = 'YXZ';
grid.rotation.y = - Math.PI / 2;
grid.rotation.x = - Math.PI / 2;
scene.add( grid );
*/

//axes
scene.add(new THREE.AxisHelper( 40 ) );

function Render() {
	renderer.render( scene, camera );
}

function AddModel(path, name, requester, color){	//gets passed a name and optionally color. requester is the player who called and is needed for the asynchronous function to pass them the node
	//create model in the model array and add meshes to scene

	modelLoader.load(path, function(object){
		object.name = name;
		models.push(new Model({object}, name, color));
		console.log(models[0].name);

		object.traverse( function ( child ) {	//this sets the material
	        if ( child instanceof THREE.Mesh ) {
	            child.material = basicMaterial;
	        }
	    });
	    object.scale.set(1, 1, 1);
		requester.model = object;	//passing the model to the player who requested it
		scene.add(object);
	});
}