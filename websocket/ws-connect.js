//TODO : Handle WebSocket Protocol Versions
//TODO : Ping/Pong
//TODO : send requests from the server

var CONFIG		= require('./config');
var _handshake	= require('./ws-handshake');
var Frame		= require('./ws-frame');
var util		= require('./util');

exports.onConnect = function onConnect( socket ) {
	
	var connection					= {
	
		state : 0,// 0 : Nada , 1 : it's on ! , * : close right away 
		
		bBuffering : new Buffer(0),
		
		storage	: {},
		
		timeouts : {
		
			handshake : setTimeout( timeout , CONFIG.HANDSHAKE_TIMEOUT )
		
		},
		
		socket	: socket		
	
	};
    
//    socket.setNoDelay( true );
    
    function timeout(){
    	
    	debugger;
    
    	util.closeWS( connection );
    
    };
    
    function onData( bData ) {
    	
    	if ( connection.state === 0 || connection.state === 1 ) {
    	
    		connection.bBuffering	= util.joinBuffers( [ connection.bBuffering , bData ] );
    	
    	};
    	
        switch( connection.state ) {
        
        	case 0:       		
        		
        		/*
        		 * Every request is assumed guilty until proven otherwise
        		 */
        		var dangerousRequest	= _handshake.parse( connection );
     			
     			/*
     			 * We have a request worth a look
     			 */
        		if ( dangerousRequest.complete === true && dangerousRequest.valide === true) {
        			
        			var parsedRequest		= dangerousRequest;       			
        		
        			_handshake.handle( connection , parsedRequest );
        			
        			return;
        		
        		};
        		
        		/*
        		 * If the request is not valide, we close the socket
        		 */
        		if ( dangerousRequest.valide === false ) {
        		
        			util.closeWS( connection );
        			
        			return;
        		
        		};
        		
        		return;
        		
        		break;
        		
        	case 1:
        		
        		/*
        		 * Every request is assumed guilty until proven otherwise
        		 */
        		var dangerousFrame	= new Frame( connection , connection.bBuffering );
        		
        		dangerousFrame.parse();
        		
        		/*
     			 * We have a request worth a look
     			 */
        		if ( dangerousFrame.complete === true && dangerousFrame.valide === true) {			
        		
        			dangerousFrame.handle();        			
        			
        			return;
        		
        		};
        		
        		/*
        		 * If the request is not valide, we close the socket
        		 */
        		if ( dangerousFrame.valide === false ) {
        		
        			util.closeWS( connection );
        			
        			return;
        		
        		};
        		
        		break;
        		
        	default:
        	
        		util.closeWS( connection );
        		
        		return;
        		
        		break;
        		
        };
        
    };
    
    function onEnd(){
    	
    	socket.destroy();
    
    };
    
    socket.on( 'data' , onData );
    
    socket.on( 'end' , onEnd );
    
};