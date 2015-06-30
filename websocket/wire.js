/*
 * Writes the given buffer to the specified socket
 */
exports.send	= function send( socket , buffer ) {

//	var MAX	= 200;
//	
//	var length	= buffer.length;
//	
//	if ( length > MAX ) {
//		
//		var k = 0;
//		
//		while ( !k || b.length ) {
//			
//			var limit	= ( (k+1)*MAX > length )? length : (k+1)*MAX;

//			var b = buffer.slice( k*MAX , limit );
//			
//			socket.write( b );
//			
//			k++;
//			
//		};

//	} else {
		
		socket.write( buffer );
		
//	};

};

//function strToBase64( str ) {

//	return (new Buffer( str, 'utf8' )).toString('base64');

//};
