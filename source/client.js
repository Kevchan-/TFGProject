var game = {};

window.onload = function(){
	
	console.log("Rendering");
    game = new GameCore();
    game.Update(new Date().getTime());
}


function GameRenderStart(){

}