var websocket	= {};

websocket.createServer = function( options ) {
	
	return new Server( options , true );
   
};

websocket.get = function( name ) {
	
	return new Server( { "name" : name } );
   
};

var Server	= require( './api-server' );

module.exports = websocket;