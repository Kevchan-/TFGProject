var playerCode = {};

var frame_time = 60/1000; // run the local game at 16ms/ 60hz
if('undefined' != typeof(global)){
 	frame_time = 45; //on server we run at 45ms, 22hz	
	playerCode = require('./player.js').player;
}

function GameCore(gameRoom){
	//if gameRoom is null it means it's not being called from server, rather from client
	this.room = gameRoom;
	this.server = false;	//is this ran by the server or not
	this.players = {};
	this.host = {}; //serverside only, if not the first player added from the browser will be "selfPlayer". host is also in the vector, unlike selfPlayer
	this.selfPlayer = {};	//clientside only, if not called from the client then the first player added from the server will be in the vector
	this.playerCount = 0;
	this.active = false;	//when game starts this turns true

	this.world = {
		width: 720,
		height: 480
	}

	if(this.room){
		this.server = true;	//if there's no room as argument it's bc its not the server
	}
	console.log("Server: "+this.server);

	this.ClientCreateConfiguration = function(){
		this.clientPrediction 	= true;
		this.inputSequence 		= 0;
		this.clientSmoothing 	= true;

		this.netPing 		= 0.001;	//travel time for a packet to the server and back to the client
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
	}

	this.Update = function(time){

		if(this.lastFrameTime){
			this.deltaTime = (time - this.lastFrameTime)/1000.0;
		}
		else{
			this.deltaTime = 0.016;
		}
		this.lastFrameTime = time;

		if(this.active){
			if(this.server){
				this.ServerUpdate();
			}
			else{
				this.selfPlayer.Move(0.1, 0, this.deltaTime);
				this.ClientUpdate();
				Render();
			}
		}
		
		if(this.server){
			this.animationFrame = setImmediate(this.Update.bind(this));
		}else{
			this.animationFrame = requestAnimationFrame(this.Update.bind(this));	//next frame tell browser to render again, and when doing that execute this function, creating the gameloop			
		}			
	}

	this.CreateTimer = function(){
		setInterval(function(){
			this.localDeltaTime = new Date().getTime() - this.previousLocalDeltaTime;
			this.previousLocalDeltaTime = new Date().getTime();
			this.localTime += this.localDeltaTime/1000.0;
		}.bind(this), 4);
	}	

	this.CreatePhysicsSimulation = function(){
		setInterval(function(){
			this.physicsDeltaTime = (new Date().getTime() - this.previousPhysicsDeltaTime)/1000.0;
			this.previousPhysicsDeltaTime = new Date().getTime();
			this.UpdatePhysics();
		}.bind(this), 15);	
	}

	this.UpdatePhysics = function(){
	    if(this.server) {
	    	this.ServerUpdatePhysics();
	    } else {
	    	this.ClientUpdatePhysics();
	    }
	}

	this.ClientUpdatePhysics = function(){

	}

	this.ClientCreatePingTimer = function(){
		setInterval(function(){
			this.lastPingTime = new Date().getTime() -this.fakeLag;
			this.socket.send('p.' + (this.lastPingTime));	//sends the date to the server
		}.bind(this), 1000);
	}

	this.ClientOnConnected = function(data){	//client itself connected
		console.log("Connected");
		this.selfPlayer.state = 'connected';
		this.selfPlayer.online = true;
		this.selfPlayer.id = data.id;
	}


	this.ClientOnPing = function(data){
		var newDate = new Date().getTime();
		var oldDate = parseFloat(data);
		this.netPing = Math.abs(newDate - oldDate);
		this.netLatency = this.netPing/2;
	}

	this.ClientOnHost = function(){
		console.log("You're hosting the game & waiting for a player to join and start the game");

		this.selfPlayer.host = true;
		this.selfPlayer.state = 'hosting & waiting for a player to join';
	}

	this.ClientOnJoin = function(data){	//when selfPlayer player joins
		var ids = data.split(',');
		this.selfPlayer.host = false;
		this.selfPlayer.state = "Joined a game & waiting for the start";
		console.log("Array of "+ids.length+" ids: "+ids);
		for(var i = 0; i < ids.length; i++){
			if(ids[i] !== this.selfPlayer.id){
				this.AddPlayer(null, ids[i]);
			}
		}

		console.log("You joined a game with now "+this.playerCount+" players");
	}

	this.ClientOnOtherJoined = function(data){	//when another player joins (receiving host id on parameter)
		console.log("Another player joined");
		this.AddPlayer(null, data);
	}

	this.ClientOnGameStart = function(data){
		console.log("NOW PLAYING");

		var serverTime = parseFloat(data.replace('-','.'));	//we pass this back to proper date format and then parse it to float
		console.log("Server time: "+serverTime);

		this.active = true;	//IMPORTANT, IT LETS THE GAMELOOP RUN
		this.localTime = serverTime + this.netLatency;

		this.selfPlayer.state = "local_pos";
		if(this.selfPlayer.hosting){
			this.selfPlayer.state = "local_pos(hosting)"
		}
		
		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){
				this.players[playerid].state = "local_pos";
			}
			else{
				continue;
			}
		}
	}

	this.ClientOnMessage = function(data){
		var messageParts = data.split('.');
		var command = messageParts[0];
		var commandData = messageParts[1] || null;	//if theres not command data in the string, set it null
		switch(command){
			case 'p':
				this.ClientOnPing(commandData);
				break;
			case 'h':
				this.ClientOnHost();
				break;
			case 'j':
				this.ClientOnJoin(commandData);
				break;
			case 'o':
				this.ClientOnOtherJoined(commandData);
				break;
			case 's':
				this.ClientOnGameStart(commandData);
		}
	}

	this.ClientOnDisconnected = function(data){	//when other player disconnects
		var id = data;

		console.log("players in the array:"+Object.keys(this.players).length);
		console.log("SOMEONE DISCONNECTED");
		
		//search for the player that disconnected in the 
		if(this.players[id]){
			delete this.players[id];
		}
		this.playerCount--;

		console.log("players in the array:"+Object.keys(this.players).length);
	}

	this.ClientOnServerUpdate = function(data){

		this.serverTime = data.time;
		this.clientTime = this.serverTime - (this.net_offset/1000);

		this.serverUpdates.push(data);

		console.log(data);
		for(var playerid in this.players){
			if(this.players.hasOwnProperty(playerid)){

			}
		}
	}

	this.ClientConnectToServer = function(){
		this.socket = io();	//this is what trigers the connection event on the server and the connect event coming next here

		console.log("socket initialized" );
		//not connected still, rather "in a status that is connecting to the server"
		this.socket.on('connect', function(){
        	this.selfPlayer.state = 'connecting';
        	console.log('Connecting...');
        }.bind(this));

		this.socket.on('onDisconnected', this.ClientOnDisconnected.bind(this));
    	this.socket.on('onServerUpdate', this.ClientOnServerUpdate.bind(this));	
		this.socket.on('onConnected', this.ClientOnConnected.bind(this));
//		this.socket.on('error', );
		this.socket.on('message', this.ClientOnMessage.bind(this));
	}

	this.ClientInputHandler = function(){
		var xDir = 0;
		var yDir = 0;
		var input = [];

		if(this.keyboard.pressed('A')||this.keyboard.pressed('left')){
			xDir = -1;
			input.push('l');
		}
		if(this.keyboard.pressed('D')||this.keyboard.pressed('right')){
			xDir = 1;
			input.push('r');
		}
		if(this.keyboard.pressed('S')||this.keyboard.pressed('down')){
			yDir = -1;
			input.push('d');
		}				
		if(this.keyboard.pressed('W')||this.keyboard.pressed('up')){
			yDir = 1;
			input.push('u');
		}

		if(input.length>0){
			this.selfPlayer.inputs.push({
				inputs 	: input,
				time 	: this.localTime.toFixed(3),
				seq 	: this.inputSequence
			});


			var serverPacket = 'i.';
			serverPacket += input.join('-')+'.';
			serverPacket += this.localTime.toFixed(3).replace('.','-') + '.';
			serverPacket += this.inputSequence;

			this.socket.send(serverPacket);

			console.log("Sent");
		}
	}

	this.ClientUpdatePosition = function(){

	}

	this.ClientUpdateOthersPosition = function(){

	}

	this.ClientRefreshFPS = function(){
		//updates the fps every 10 frames by calculating the average
		this.fps = 1/this.deltaTime;
		this.fpsAverageAccumulator += this.fps
		this.fpsAverageCounter++;

		if(this.fpsAverageCounter >= 10){
			this.fpsAverage = this.fpsAverageAccumulator/10;
			this.fpsAverageCounter = 1;
			this.fpsAverageAccumulator = this.fps;
		}
	}

	this.ClientUpdate = function(){
		this.ClientInputHandler();
		this.ClientUpdatePosition();	//using client prediction
		this.ClientUpdateOthersPosition();
		this.ClientRefreshFPS();
	}

	this.MovementVectorFromDirection = function(x, y){
	    return {
	        x : (x * (this.playerSpeed * 0.015)).toFixed(3),
	        y : (y * (this.playerSpeed * 0.015)).toFixed(3)
	    };
	}

	this.ProcessInput = function(player){
		var xDir = 0;
		var yDir = 0;

		if(player.inputs.length > 0){
			for(var i = 0; i < player.inputs.length; i++){
				if(player.inputs[i].seq <= player.lastInputSeq) continue;

				var input = player.inputs[i].inputs;
				var arrayLength = input.length;

				for(var j = 0; j <= arrayLength; j++){
					var key = input[j];
					switch(key){
						case "l":
							xDir -= 1;
							break;
						case "r":
							xDir += 1;
							break;
						case "d":
							yDir += 1;
							break;
						case "u":
							yDir -= 1;
							break;
						default:
							console.log("Warning: invalid character");
					}
				}
			}
		}

		var	direction = this.MovementVectorFromDirection(xDir, yDir);

		if(player.inputs.length > 0){
			player.lastInputSeq = player.inputs[player.inputs.length-1].sequence;	//time of the last 
			player.lastInputTime = player.inputs[player.inputs.length-1].time;
		}

		return (direction);
	}


	this.SetRoom = function(room){
		this.room = gameRoom;
	}

	this.ServerUpdatePhysics = function(){
		for(playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
				var playerOldPos = this.players[playerId].oldState.pos;
				var playerPos = this.players[playerId].pos;
				playerOldPos.x = playerPos.x;
				playerOldPos.y = playerPos.y;

				var newDir = this.ProcessInput(this.players[playerId]);
				playerPos.x = parseFloat(parseFloat(playerPos.x + newDir.x).toFixed(3));
				playerPos.y = parseFloat(parseFloat(playerPos.y + newDir.y).toFixed(3));

				this.players[playerId].inputs = [];
			}
		}
	}

	this.ServerDeletePlayer = function(newHost, deletedPlayerId){	//deletes the player
		this.playerCount--;

		this.host = newHost;
		if(this.players[deletedPlayerId]){	//if it was a client
			//delete from the client list
			delete this.players[deletedPlayerId];
		}
	}


	this.ServerUpdate = function(){
		this.serverTime = this.localTime;

		var state = {};
		var playerCounter = 1;

		for(var playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
				if(!this.players[playerId].host){
					state["player"+playerCounter.toString()+"Pos"] = this.players[playerId].pos;
					state["player"+playerCounter.toString()+"InputSeq"] = this.players[playerId].lastInputSeq;
				}
				playerCounter++;
			}
		}

		state["hostPos"] = this.host.pos;
		state["hostInputSeq"] = this.host.lastInputSeq;
		state["time"] = this.serverTime;

		this.lastState = state;

		console.log(this.lastState);

		this.host.instance.emit('onServerUpdate', this.lastState);
		
		for(var playerId in this.players){
			if(this.players.hasOwnProperty(playerId)){
				this.players[playerId].instance.emit('onServerUpdate', this.lastState);
			}
		}
		console.log("__________________________________________");
	}

	this.ServerInputHandler = function(client, inputCommands, inputTime, inputSequence){
		var playerClient = null;

		playerClient = this.players[client.userid];

		console.log("Player input id "+playerClient.instance.userid);
		playerClient.inputs.push({
			inputs 	: inputCommands,
			time 	: inputTime,
			seq 	: inputSequence
		});
	}

	this.AddPlayer = function(player, playerId){	//playerId for when player not getting passed (clientside)
		if(this.server){
			this.players[player.userid] = new playerCode(this, player);	
			if(this.playerCount == 0){
				this.host = this.players[player.userid];
				this.players[player.userid].host = true;
			}
		}else{
			console.log("players in array before adding player:"+Object.keys(this.players).length);
			if(this.playerCount == 0){	//creating the self player bc its the first one (will get its id on connection)
				this.selfPlayer = new Player(this, null);
				console.log("Player n"+(this.playerCount+1)+" added");
			}
			else{	//creating rest of players as they join in the players vector
				console.log("added player n"+(this.playerCount+1));
				this.players[playerId] = new Player(this, null);
			}
			console.log("players in array after adding player:"+Object.keys(this.players).length);
		}
		this.playerCount++;
	}

	this.playerSpeed = 120;

	//timers for physics
	this.physicsDeltaTime = 0.0001;
	this.previousPhysicsDeltaTime = new Date().getTime();

	//timers for precision over the net (server and client)
	this.localTime = 0.016; 
	this.localDeltaTime = new Date().getTime();
	this.previousLocalDeltaTime = new Date().getTime();


	this.CreatePhysicsSimulation();
	this.CreateTimer();

	if(this.server){
		this.serverTime = 0;
		this.lastState = {};
	}
	else{
		this.keyboard = new THREEx.KeyboardState();
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