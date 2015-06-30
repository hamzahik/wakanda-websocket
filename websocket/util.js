/*
 *  Given an array of Buffer objects, it returns a Buffer that is the concatenation of all the elements of the array
 */
exports.joinBuffers	= function( bArr ) {

	var totalLength	= 0;
	
	for ( var i = 0 ; i < bArr.length ; ++i ) {
	
		totalLength += bArr[ i ].length;
	
	};
	
	var bTMP	= new Buffer( totalLength ); // ? MAX_LENGTH 
    var offset	= 0;
    
    for ( var i = 0 ; i < bArr.length ; ++i ) {
	
		bArr[ i ].copy( bTMP , offset , 0 );
		
		offset	+= bArr[ i ].length;
	
	};
	
	return bTMP;

};

exports.closeWS	= function closeWS( connection , graceful ) {
	
	//TODO : handle graceful closing
	
	 function removeFromGroups( groups ){
	 	
	 	if ( !groups ){
	 	
	 		return;
	 	
	 	};
			
		for ( var i in groups ) {
			
			var groupID	= groups[ i ];
		
			if ( GROUPS[ groupID ] instanceof Object ) {
			
				delete GROUPS[ groupID ][ connection.ID ];
				
				connection.groups	= connection.groups || [];
				
				delete connection.groups[ connection.groups.indexOf( groupID ) ];
			
			};
		
		};
	
	};
	
	removeFromGroups( connection.groups );

	connection.socket.end();

};