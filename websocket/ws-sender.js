var _wire	= require('./wire');
var _frame	= require('./ws-frame');
var sender	= {};

sender.sendToGroups	= function( buffer , groups ){

	var gLength	= groups.length;
	
	for( var i = 0 ; i < gLength ; ++i ) {
		
		sender.sendToGroup( buffer , groups[ i ] );
	
	};

};

sender.sendToGroup = function( buffer , groupID ){
	
	var connections	= GROUPS[ groupID ];

	for ( var ID in connections ) {
		
		try{
				
			sender.singleSend( buffer , connections[ ID ] );
			
		}catch( e ) {};
	
	};

};

sender.singleSend	= function( buffer , connection ){
	
	var wBuffer	= _frame.construct( buffer , 1 ); //TODO : handle binary

	_wire.send( connection.socket , wBuffer );

};

module.exports	= sender;