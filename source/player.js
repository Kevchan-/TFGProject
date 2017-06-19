function Player(gameCore, playerNet){	//playerNet is the net object that was originally passed by socket.io, if null this is being created by the client
	this.instance = playerNet;
	this.gameCore = gameCore;
	this.host = false;
	this.online = false;
	this.id = "";

	if(this.instance){
		console.log("Player created in server");
	}else{
		console.log("Player created");
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
	this.id = '';

	this.oldPos = 		{x : 0, y : 0};
	this.currentPos = 	{x : 0, y : 0};
	this.state_time = 	new Date().getTime();

	//log of inputs for network
	this.inputs = [];

//	if(playerInstance.)
}

if( 'undefined' !== typeof global ) {
	module.exports.player = Player;
}