

var scene = new THREE.Scene();
//var camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 0, 1000 );
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
var models = [];

function Model(meshes, name, color){
	this.meshes = [];
	this.name = name;
	this.color = color;
}

var renderer = new THREE.CanvasRenderer();

var modelLoader = new THREE.OBJLoader();

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
/*var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );*/
var basicMaterial = new THREE.MeshBasicMaterial( { color: 'green' } );
camera.position.z = 10;

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
		requester.model = object;	//passing the model to the player who requested it
		scene.add(object);
	});
}
