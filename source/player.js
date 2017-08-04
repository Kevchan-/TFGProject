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
		AddModel('models/cube.obj', "player", this);
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
	this.oldState = 		{pos:{x : 0, y : 0}};
	this.currentState = 	{pos:{x : 0, y : 0}};
	this.state_time = 	new Date().getTime();

	//log of inputs for network
	this.inputs = [];
	this.lastInputSeq = {};

	this.Move = function(x,y, deltaTime){	//moves by this quantity
		this.pos.x += x;
		this.pos.y += y;
		this.model.position.x = this.pos.x;
		this.model.position.y = this.pos.y;
	}

//	if(playerInstance.)
}

if( 'undefined' !== typeof global ) {
	module.exports.player = Player;
}