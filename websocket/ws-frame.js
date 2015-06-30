var util		= require('./util');
var _wire		= require('./wire');
var Session		= require('./ws-session');

var Frame	= function( connection , buffer ){

	this.connection		= connection;
	this.buffer			= buffer;
	this.offset			= 0;
	
	this.FIN			= null;
	this.RSV1			= null;
	this.RSV2			= null;
	this.RSV3			= null;
	this.OPCODE			= null;	
	this.MASKED			= null;
	this.PAYLOAD_LENGTH	= null;
	
};

Frame.prototype.fullLength	= function(){
	
	/*
	 * If the frame is masked it should contain a 4 Bytes masking key
	 */
	return ( this['MASKED'] ) ? this.offset + this['PAYLOAD_LENGTH'] + 4 : this.offset + this['PAYLOAD_LENGTH'];

};

Frame.prototype.handlePayloadLength	= function(){

	switch ( this['PAYLOAD_LENGTH'] ) {
	
		case 126:		
			
			this.readInt( 'PAYLOAD_LENGTH' , 2 );
			
			break;
			
		case 127:		
		
			this.readInt( 'PAYLOAD_LENGTH' , 8 );
			
			if ( this['PAYLOAD_LENGTH'] < 0 ) {
			
				this.valide		= false ;
				
				return;
			
			};
			
			break;
	
	};	

};

Frame.prototype.handle	= function(){

	switch ( this['OPCODE'] ) {
		
		case  1:
			this.DATA		= true;
			this['PAYLOAD']	= this['PAYLOAD'].toString('utf8');
			break;
			
		case 8:
			this.connection.state	= 2;
			util.closeWS( this.connection , true );
			break;
			
		case 2:
			this.DATA	= true;
			break;
	
	};
	
	if ( this.DATA ) {
		
		this.dispatch();
		
	};

};

Frame.prototype.dispatch	= function() {

	/*
	 * TODO: create a separate response module
	 */
	var response	= { body : null , groups : [] };
	var session		= new Session( this.connection );
	
	var message		= this.connection.handler.onmessage( this["PAYLOAD"], response , session ) || response.body;
	
	if ( message ) {
		 
		var opcode	= 1;
		
		if ( message instanceof Buffer ){
		
			opcode	= 2;
		
		} else {
			
			message	= new Buffer( message.toString() , 'utf8' ); //TODO: what is faster ? a typeof response == "string" check or a toString call ?
		
		};
		
		_wire.send( this.connection.socket, Frame.construct( message , opcode ) );
	
	};

};

Frame.prototype.parse	= function(){
	
	/*
	 * At least we should have the two first bytes to parse the whole frame
	 * TODO : Fragmentation
	 */	
	if ( this.buffer.length < 2 ) {		
		return;		
	};
	
	/*
	 * Read and Parse first Byte
	 */
	this.readInt( HEAD1_SCHEMA , 1 );
	/*
	 * Read and Parse second Byte
	 */
	this.readInt( HEAD2_SCHEMA , 1 );
	/*
	 * Handle the payload's length field
	 */
	this.handlePayloadLength();
	
	if ( this.valide === false ) {
	
		return;
	
	};
	/*
	 * Calculate the frame's full length
	 */
	var fullLength	= this.fullLength();
	
	/*
	 * If the buffer does not contain the whole frame we have nothing to do !
	 */
	if ( this.buffer.length <  fullLength ) {
		
		return;
		
	};
	
	/*****************************/
	/** THE FRAME IS COMPLETE ! **/
	/*****************************/
	
	if ( this['MASKED'] ) {
		
		this['KEY']	= this.slice( 4 );
	
	};
				
	this['PAYLOAD']	= this.slice( this['PAYLOAD_LENGTH'] ); //TODO : HANDLE_EXTENSIONS	
	
	this.connection.bBuffering	= this.slice();
	
	if ( this['MASKED'] ) {
		
		reveal( this['PAYLOAD'] , this['KEY'] );
		
	};
	
	this.valide		= true ; //TODO ?
	
	this.complete	= ( this['FIN'] != 0 ) ; //TODO
	
	return this;

};

Frame.prototype.slice	= function( size ) {

	var bTMP	= size ? this.buffer.slice( this.offset , this.offset + size ) : this.buffer.slice( this.offset );
	
	this.offset+= size || bTMP.length;
	
	return bTMP;

};

Frame.prototype.readInt	= function( schema , size ) {

	var bTMP	= new Buffer( size );
	var value	= 0;
	
	this.buffer.copy( bTMP , 0 , this.offset , this.offset + size );
	
	switch( size ) {
	
		case 1:
			value	= bTMP.readUInt8(0);
			break;
		case 2:
			value	= bTMP.readUInt16BE(0);
			break;
		case 3:
			value	= bTMP.readUInt24BE(0);
			break;
		case 4:
			value	= bTMP.readUInt32BE(0);
			break;
		case 8:
			value	= bTMP.readDoubleBE(0);
			break;
		default:
			throw "invalid size";
			break;
	};
	
	if ( schema instanceof Array ) {
	
		for ( var i = 0 ; i < schema.length ; ++i ) {
	
			this[ schema[ i ]['KEY'] ]	= value & schema[ i ]['EXTRACTOR'];
		
		};
	
	} else {
	
		this[ schema ]	= value;
	
	};
	
	
	this.offset	+= size;

};

Frame.construct	= function( buffer , opcode ) {
	
	//TODO : Handle fragmentation

	var bufferLength	= buffer.length;
	var fullLength		= bufferLength + 2; // default : buffer length is considered < 126 
	var offset			= 0;
	var wBuffer			= null;
	var payloadLength1	= bufferLength;
	
	( bufferLength >= 65536 ) && ( payloadLength1 = 127 ) && ( fullLength = bufferLength + 10 ); //8 bytes payload length
	( bufferLength >= 126 ) && ( payloadLength1 = 126 ) && ( fullLength = bufferLength + 4 ); //2 bytes payload length
	
	wBuffer	= new Buffer( fullLength );
	
	wBuffer.writeUInt8( opcode | 128  , offset );
	offset++;
	
	wBuffer.writeUInt8( payloadLength1 , offset );
	offset++;
	
	switch( payloadLength1 ) {
		
		case 126:
			wBuffer.writeUInt16BE( bufferLength , offset );
			offset+=2;
			break;
	
		case 127:
			wBuffer.writeDoubleBE( bufferLength , offset );
			offset+=8;
			break;
	
	};
	
	buffer.copy( wBuffer , offset , 0 );
	
	return wBuffer;	

};

function reveal( bPayload , key ) {

	var p	= 0;
	var k	= 0;
	var l	= bPayload.length;
	
	while ( p < l ) {
	
		bPayload[ p ]	^= key[ k ];
		
		p++;
		k++;
		k%=4; 
	
	}; 

};

var HEAD1_SCHEMA	= [
	{
		'KEY'		: 'FIN',
		'EXTRACTOR'	: 128
	},
	{
		'KEY'		: 'RSV1',
		'EXTRACTOR'	: 64
	},
	{
		'KEY'		: 'RSV2',
		'EXTRACTOR'	: 32
	},
	{
		'KEY'		: 'RSV3',
		'EXTRACTOR'	: 16
	},
	{
		'KEY'		: 'OPCODE',
		'EXTRACTOR'	: 15
	}
];

var HEAD2_SCHEMA	= [
	{
		'KEY'		: 'MASKED',
		'EXTRACTOR'	: 128
	},
	{
		'KEY'		: 'PAYLOAD_LENGTH',
		'EXTRACTOR'	: 127
	}
];

module.exports	= Frame;