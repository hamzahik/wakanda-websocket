var websocket	= {};

websocket.createServer = function( options ) {
	
	return new WServer( options , true );
   
};

websocket.get = function( name ) {
	
	return new WServer( { "name" : name } );
   
};

var WServer	= require( './api-server' );

module.exports = websocket;