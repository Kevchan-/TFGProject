var playerCode = {};

if('undefined' != typeof global){
	playerCode = require('./player.js').player;
}

function GameCore(gameRoom){
	//if gameRoom is null it means it's not being called from server, rather from client
	this.room = gameRoom;
	this.server = false;	//is this ran by the server or not
	this.players = {};
//	this.host = {}; //serverside only, if not the first player added from the browser will be "self"
	this.self = {};	//clientside only, if not called from the client then the first player added from the server will be in the vector
	this.playerCount = 0;

	if(this.room){
		this.server = true;	//if there's no room as argument it's bc its not the server
	}
	console.log("Server: "+this.server);

	this.ClientCreateConfiguration = function(){
		this.clientPrediction 	= true;
		this.inputSequence 		= 0;
		this.clientSmoothing 	= true;

		this.netPing 		= 0.001;	//travel time for a packet to the server and back tot he client
		this.netLatency		= 0.001;	//latency between client and server (ping/2)
		this.lastPingTime	= 0.001;	//the last time we sent a ping
		this.fakeLag		= 0;		//if were simulating lag, this applies only to the input client. prolly wont use
		this.fakeLagTime	= 0;		

		this.netOffset		= 100;		//100ms latency between server and client interpolation for the rest of clients
		this.bufferSize		= 2;		//size of the server history to keep for rewinding/interpolating
		this.targetTime		= 0.01;		//the time where we want to be in the server timeline
		this.oldestTick 	= 0.01;		//last time tick we have in the buffer

		this.clientTime = 0.01;
		this.serverTime	= 0.01;

		this.deltaTime	= 0.016;
		this.fps		= 0;		//this is (1/this.deltaTime)

		this.lit = 0;
		this.lit = new Date().getTime();
		console.log("Date: "+this.lit);
	}

	this.ClientCreatePingTimer = function(){
		setInterval(function(){
			this.lastPingTime = new Date().getTime() -this.fakeLag;
			this.socket.send('p.' + (this.lastPingTime));	//sends the date to the server
		}.bind(this), 1000);
	}

	this.ClientOnConnected = function(data){
		console.log("Connected");
		this.self.state = 'connected';
		this.self.online = true;
		this.self.id = data.id;
	}

	this.ClientOnPing = function(data){
		var newDate = new Date().getTime();
		var oldDate = parseFloat(data);
		console.log("new Date: "+newDate);
		console.log("ping Date: "+oldDate);
		this.netPing = Math.abs(newDate - oldDate);
		this.netLatency = this.netPing/2;
		console.log("new Ping: "+this.netPing);
	}

	this.ClientOnMessage = function(data){
		var messageParts = data.split('.');
		var command = messageParts[0];
		var commandData = messageParts[1] || null;	//if theres not command data in the string, set it null
		switch(command){
			case 'p':
				this.ClientOnPing(commandData);
				break;
			case 'j':
				break;
			case 'e':
				break;
		}
	}


	this.ClientConnectToServer = function(){
		this.socket = io();	//this is what trigers the connection event on the server and the connect event coming next here

		console.log("socket initialized" );
		//not really connected, rather "in a status that is connecting to the server"
		this.socket.on('connect', function(){
        	this.self.state = 'connecting';
        	console.log('Connecting...');
        }.bind(this));

//		this.socket.on('disconnect', );
//      this.socket.on('onServerUpdate', );	
//		this.socket.on('onServerUpdate', );
		this.socket.on('onConnected', this.ClientOnConnected.bind(this));
//		this.socket.on('error', );
		this.socket.on('message', this.ClientOnMessage.bind(this));
	}



	this.SetRoom = function(room){
		this.room = gameRoom;
	}

	this.AddPlayer = function(player){
		if(this.server){
			this.players[player.userid] = new playerCode(this, player);	
			if(this.playerCount == 0){
				this.players[player.userid].host = true;
			}
			else{
				this.players[player.userid].host = false;
			}
		}else{
			if(this.playerCount == 0){
				this.self = new Player(this, null);
				console.log(this.self);
				console.log("Player n"+(this.playerCount+1)+" added");
			}
			else{
				this.players[player.userid] = new Player(this, null);
			}
		}
		this.playerCount++;
	}

	if(this.server){

	}
	else{
		this.AddPlayer(null);
		this.ClientCreateConfiguration();
		this.serverUpdates = [];
		this.ClientConnectToServer();
		this.ClientCreatePingTimer();
	}


}

if( 'undefined' != typeof global ) {
	module.exports.gameCore = global.GameCore = GameCore;
}