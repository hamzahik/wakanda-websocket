var server		= null;
var serverName	= null;
var CLIENTS		= {};
var GROUPS		= {};
var SENDER		= require('./ws-sender');

onconnect	= function( cEvent ){
	
	var port	= cEvent.ports[ 0 ];
	
	port.onmessage	= function( mEvent ){
	
		var message		= mEvent.data;
		var response	= {};
		
		response.type	= message.type + '_response';
		
		switch( message.type ){
		
			case 'init':
				
				try{
							
					init( message.data );
					
				} catch ( e ) {
					
				
					throw {
					
						"type" : "socket",
			
						"description" : "Couldn't start the server.",
						
						"data" : e
					
					};
				
				};				
				
				break;
				
			case 'single_send':
			
				try{
					
					var buffer	= new Buffer( message.data.message.toString() , 'utf8' );
					
					SENDER.singleSend( buffer , CLIENTS[ message.data.ID ] );
					
				} catch ( e ) {
				
					response.error	= e;
				
				};
				
				break;
				
			case 'group_send':
			
				try{
					
					var buffer	= new Buffer( message.data.message.toString() , 'utf8' );
					
					SENDER.sendToGroup( buffer , message.data.ID );
					
				} catch ( e ) {
				
					response.error	= e;
				
				};
				
				break;
		
		};
		
		port.postMessage( response );
	
	};
	
	port.postMessage({
                	
    	type	: 'ready'
    	
    });

};

function init( options ){

	var net			= require('net');
	var _connect	= require('./ws-connect');
	
	serverName	= options.name;
	server		= net.createServer( _connect.onConnect );

	return server.listen( options.port , options.IP );

};

