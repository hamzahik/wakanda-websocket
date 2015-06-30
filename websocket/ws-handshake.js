var CONFIG	= require('./config');
var _wire	= require('./wire');
var util	= require('./util');

exports.parse	= function parseHandshake( connection ) {

	var request	= {};
	
	request.string	= connection.bBuffering.toString('utf8');
	request.headers	= {};
	
	isComplete( request ) &&
	firstParsePass( request ) && request.valide != false &&
	secondParsePass( request ) && request.valide != false &&
	validateHandshakeFormat( request );

	return request;
	
};

exports.handle	= function handleHandshake( connection , parsedRequest ) {
	
	var valide	= authenticateHandshakeRequest( connection , parsedRequest );
	
	if ( ! valide ) {
	
		/*
		 * We don't shake back, we close right away
		 */
		util.closeWS( connection );
		
		return;
	
	};
	
	/*
	 * Connection Request Accepted
	 */
	var handshakeResponse	= constructHandshakeResponse( parsedRequest.headers['sec-websocket-key'] );
        				
	connection.state		= 1;
	
	connection.bBuffering	= new Buffer(0);
	
	clearTimeout( connection.timeouts.handshake ); //Connection accepted ! We clear the timeout

	_wire.send( connection.socket,   new Buffer( handshakeResponse , 'utf8' ) ); //We shake back

};


function validateHandshakeFormat( request ) {
	
	var headers	= request.headers;

	/*
	 * Headers Validation
	 */
	if ( !(	
	 			headers['upgrade'] &&
	 			headers['upgrade'].toLowerCase() == 'websocket'  && //TODO : more robust verification
	 			headers['connection'] &&
	 			headers['connection'].toLowerCase().indexOf('upgrade') != -1 && //TODO : more robust & strict verification
	 			headers['sec-websocket-key'] &&
	 			headers['host']
	 	  )
	){
	 		
	 	request.valide	= false;
	 	
	 	return request;
	 
	 };
	 
	 /*
	  * Request Format is valide
	  */	 
	 request.valide		= true;
	 
	 return true;

};

function getHandler( host , URI ) {

	for ( var i in host.handlers ) {
	
		if ( ( new RegExp( i ) ).test( URI ) ) {
		
			return host.handlers[ i ] 
		
		};
	
	};
	
	return null;

};

function authenticateHandshakeRequest( connection , parsedRequest ) {

	var server			= storage.WEBSOCKETS.servers[ serverName ];
	var hosts			= server.hosts || null;
	var host			= hosts ? hosts[ parsedRequest.headers.host ] : null;
	var origins			= host ? host.origins : null;
	var handler			= host ? getHandler( host , parsedRequest.URI ) : null;
	var authenticator	= host ? host.authenticator : null;
	var origin			= origins ? origins.indexOf( parsedRequest.headers.origin ) + 1 : null;	
	
	if ( !(	parsedRequest.headers.host &&
			hosts &&
			host &&
			handler &&
			origins &&
			origin ) ){
		
		return false;
	
	};
	
	try {
		
		var aHandler	= authenticator ? require( authenticator ) : null;
		
	} catch( e ) {
	
		throw {
			
			"type" : "config",
			
			"description" : "Specified authenticator module not found.",
			
			"data" : authenticator
			
		};
	
	};
	
	if ( aHandler && handler.authenticate ) {
	
		var aResponse	= aHandler.onmessage( parsedRequest , connection.storage );
		
		if ( ! aResponse || ! aResponse.accepted ) {
			
			return false;
		
		} else {
		
			connection.ID	= aResponse.ID	|| generateUUID();
		
		};
		
	};
	
	try{
		
		var mHandler	= handler ? require( handler.module ) : null;
		
	} catch( e ) {
	
		throw {
			
			"type" : "config",
			
			"description" : "Specified handler module not found.",
			
			"data" : {
			
				"handler" : parsedRequest.URI,
				
				"module" : handler.module
			
			}
			
		};
	
	};
	
	connection.handshake		= parsedRequest;
	connection.handler			= mHandler;
	connection.storage.cookie	= parsedRequest.headers['cookie'];
	
	return true;

};

function constructHandshakeResponse( key ) {
	
	//TODO : better implementation
	var crypto		= require("crypto");
	var sha1		= crypto.createHash("sha1");	
	var signature	= key + CONFIG.GUID;
	var str			= [
		'HTTP/1.1 101 Web Socket Protocol Handshake',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: %signature'
    ].join('\r\n') + '\r\n\r\n';
    
    sha1.update(signature, "utf8");
    
	var digest = sha1.digest("base64");
    
    str	= str.replace('%signature',digest);
    
    return str;

};

/*
 * If the request is not valide the timeout will do the trick
 * FEATURE : Add a black list 
 */
function isComplete( request ) {
	
	var sData	= request.string;
	
	request.complete	= ( sData.indexOf('\r\n\r\n') === sData.length - 4 ) ? true : false;
	
	return request;

};

/*
 * - Extract URI & HTTP Version
 * - Request Validation
 */
function firstParsePass( request ) {
	
	var sData		= request.string;
	var getRegExp	= /^GET[\t ]+(\/[^ \t]*)[\t ]+(HTTP\/[0-9\.]{3})[\t ]*\r\n/i; //TODO : More strict rules
	var result		= getRegExp.exec( sData );
	
	if ( result instanceof Array && result.length === 3 ) {
		
		request.HTTPVersion	= result[ 2 ];
		
		request.URI			= result[ 1 ];
		
		request.string		= sData.substr( result[ 0 ].length );
		
	} else {
	
		request.valide	= false;
		
		return;
	
	};
	
	return request;

};

/*
 * - Extract Headers
 * - Request Validation
 */
function secondParsePass( request ) {
	
	var sData			= request.string;
	var headerRegExp	= /^([a-z0-9\-]+)[\t ]*\:[\t ]*(.*)[\t ]*\r\n/i; //TODO : More strict rules
	var headers			= {};
	var result			= {};
	
	 while( sData && sData.length > 2 ) {
	 
	 	result	= headerRegExp.exec( sData );
	 	
	 	if ( result instanceof Array && result.length === 3 ) {
		
			headers[ result[ 1 ].toLowerCase() ]	= result[ 2 ];
			
			sData									= sData.substr( result[ 0 ].length );
			
		} else {
		
			request.valide	= false;
		
		};
	 
	 };
	 
	 request.string		= sData;	 
	 request.headers	= headers;
	 
	 return request;

};

