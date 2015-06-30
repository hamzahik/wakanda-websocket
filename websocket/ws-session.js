var util		= require('./util');

var Session	= function( connection ) {

	this.connection	= connection;
	
	this.storage	= connection.storage;

};


Session.prototype.close	= function(){
	
	util.closeWS( this.connection );
	
};

Session.prototype.setID	= function( ID ){
		
	delete CLIENTS[ this.connection.ID ];
	
	this.connection.ID = ID;

	CLIENTS[ ID ] = this.connection;
	
	//TODO: groups

};

Session.prototype.addToGroups	= function( groups ){
	
	for ( var i in groups ) {
		
		var groupID	= groups[ i ];
		
		GROUPS[ groupID ]	= GROUPS[ groupID ] || {};				

		GROUPS[ groupID ][ this.connection.ID ]	= this.connection;
		
		this.connection.groups	= this.connection.groups || [];
		
		if ( this.connection.groups.indexOf( groupID ) < 0 ) {	
						
			this.connection.groups.push( groupID );
			
		};

	};

};

Session.prototype.removeFromGroups	= function( groups ){
	
	for ( var i in groups ) {
		
		var groupID	= groups[ i ];
	
		if ( GROUPS[ groupID ] instanceof Object ) {
		
			delete GROUPS[ groupID ][ this.connection.ID ];
			
			this.connection.groups	= this.connection.groups || [];
			
			delete this.connection.groups[ this.connection.groups.indexOf( groupID ) ];
		
		};
	
	};

};

module.exports	= Session;
