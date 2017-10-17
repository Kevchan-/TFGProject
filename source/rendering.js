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
//var modelLoader = new THREE.OBJLoader();
renderer.setClearColor (0xffffff, 1);


renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
//renderer.getContext('2d').font = "12px Arial";

var aspect = window.innerWidth / window.innerHeight;
var d = 10;
camera = new THREE.OrthographicCamera( - d * aspect, d * aspect, d, - d, 1, 1000 );
camera.position.set( 20, 20, 20 ); // all components equal
camera.lookAt( scene.position ); // or the origin



//var camera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
//var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
//camera.position.z = 5;

var models = [];
var arrow = {};

function Model(index, mesh, name, color, mixer){
	this.index = index;
	this.mesh = mesh;
	this.name = name;
	this.color = color;
	this.mixer = mixer;
}
var geometry = new THREE.PlaneBufferGeometry( 1000, 1000 );
plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: true } ) );
scene.add( plane );

var basicMaterial = new THREE.MeshLambertMaterial( { color: 0x99ff00  } );
//basicMaterial.overdraw = 0.5;
var directionalLight =  new THREE.PointLight( 0xff0000 );
var lightHelper = new THREE.PointLightHelper(directionalLight, 0.1);

//light.position.set( 50, 50, 50 );
var ambientLight = new THREE.AmbientLight( 0x606060); // soft white light
scene.add(ambientLight);
scene.add(directionalLight);
scene.add(lightHelper);

//axes
var axes = new THREE.AxisHelper(50);
//axes.position.set(0, 0, 0)
scene.add(axes);

var gridXZ = new THREE.GridHelper(100, 100, 0x888888, 0x888888);
//gridXZ.setColors( new THREE.Color(0xFFC0CB), new THREE.Color(0x8f8f8f) );
gridXZ.position.set(0,0,0 );
scene.add(gridXZ);

var modelLoader = new THREE.ObjectLoader();

function Render(deltaTime) {
	renderer.render( scene, camera );
	for(i = 0; i < models.length; i++){
		if(typeof(models[i].mixer) != 'undefined')
			models[i].mixer.update(deltaTime);
		else{
			console.log("beh");
		}
	}
//	if(mixer)
//		mixer.update(deltaTime);
//	THREE.AnimationHandler.update(delta);
}

function SetAnimation(model){
}

function AddModel(path, name, requester, color){	//gets passed a name and optionally color. requester is the player who called and is needed for the asynchronous function to pass them the node
	//create model in the model array and add meshes to scene

	modelLoader.load(path, function(model, materials){
		model.name = name;
		scene.add(model);

		var newMixer = new THREE.AnimationMixer(model);

		models.push(new Model(models.length, model, name, color, newMixer));
//		models[models.length-1].mixer.clipAction(model.animations[0]).play();

		model.traverse( function ( child ) {	//this sets the material
	        if ( child instanceof THREE.Mesh ) {
	        	if(typeof(materials) == 'undefined'){
		            child.material = basicMaterial;
	        	}else{
	        		child.material = materials[0];
	        	}
	        }
	    });
	    model.scale.set(1, 1, 1);
		requester.model = models[models.length-1];	//passing the model to the player who requested it
	}, function(xmlrequest){}, function(){
		console.log("Error loading");
	});

}

function DeleteModel(model){
	models.splice(model.index, 1);
	scene.remove(model.mesh);
}

function MakeSquare(x, y){
	var geometry = new THREE.PlaneBufferGeometry(0.9, 0.9);
	var material = new THREE.MeshBasicMaterial({color: 0x000000});
	var plane = new THREE.Mesh(geometry, material);
	plane.rotation.x = THREE.Math.degToRad(270);
	scene.add(plane);
	plane.position.x = x;
	plane.position.z = y;
	plane.position.y = 0;

	models.push(new Model(plane, "matrix"));
	return(models[models.length-1]);
}