function Player(gameCore, playerNet){	//playerNet is the net object that was originally passed by socket.io, if null this is being created by the client
	this.instance = playerNet;
	this.gameCore = gameCore;
	this.host = false;
	this.online = false;
	this.id = "";
	this.model = {}; 	//only assigned if it's clientside

	if(this.instance){
		console.log("Player created in server");
	}else{
		console.log("Player created");
		AddModel("models/player.json", "player", this);
	}

	this.pos = {
		x : 0,
		y : 0
	};
	
	this.size = {
		x : 16,
		y : 16
	};
	
	this.state = 'not-connected';
	this.movement = 'stopped';
	this.oldState = 		{pos:{x : 0, y : 0}};
	this.currentState = 	{pos:{x : 0, y : 0}};
	this.stateTime = 	new Date().getTime();

	//log of inputs for network
	this.inputs = [];
	this.lastInputSeq = {};

	this.SetPos = function(x, y, isSelfPlayer){	//use this function to move every object on the client


		if(!isSelfPlayer){
			this.SetDir(this.pos.x, this.pos.y, x, y);
		}
		else{
			if(this.pos.x == x && this.pos.y == y){
				//console.log("POSITION NOT CHANGED");
			}
		}




		this.pos.x = x;
		this.pos.y = y;
		if(typeof(this.model.mesh.position) != "undefined" ){
			this.model.mesh.position.x = this.pos.x;
			this.model.mesh.position.z = -this.pos.y;
		}else{
			console.log("no model loaded");
		}
//		console.log("pos: "+this.pos.x+", "+this.pos.y);
	}

	this.SetDir = function(previewX, previewY, x, y){
		var moving = false;
		if(x > previewX){
			this.model.mesh.rotation.y = THREE.Math.degToRad(180);
			moving = true;
		}else if(x < previewX){
			this.model.mesh.rotation.y = THREE.Math.degToRad(0);			
			moving = true;
		}else if(y > previewY){
			this.model.mesh.rotation.y = THREE.Math.degToRad(270);
			moving = true;
		}else if(y < previewY){
			this.model.mesh.rotation.y = THREE.Math.degToRad(90);
			moving = true;
		}

		if(moving){
			this.model.mixer.clipAction(this.model.mesh.animations[0]).play();
	//		console.log("PLAYING ANIMATION");
		}else{
			this.model.mixer.clipAction(this.model.mesh.animations[0]).stop();
	//		console.log("STOPPING ANIMATION");
		}
	}

	this.Move = function(x,y, deltaTime){	//moves by this quantity
		this.pos.x += x;
		this.pos.y += y;
		this.model.mesh.position.x = this.pos.x;
		this.model.mesh.position.y = this.pos.y;
	}

}

if( 'undefined' !== typeof global ) {
	module.exports.player = Player;
}