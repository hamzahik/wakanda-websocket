var Host	= function( server , options , create ) {
	
	//TODO : lock
	
	//TODO : validate options
	
	this.name	= options.host;
	this.server	= server;
	
	if ( create ) {
		
		var _storage	= this.server.refreshStorage();
		var hosts		= this.getHosts( _storage );
	
		hosts[ this.name ]			= options;
		
		hosts[ this.name ].handlers	= hosts[ this.name ].handlers || {}; 
		
		this.server.updateStorage();
	
	};

};

/*
 * Help to read all attached server's hosts info from storage
 */
Host.prototype.getHosts		= function( storage ){

	var host	= storage.servers[ this.server.name ].hosts;
	
	return host;

};

/*
 * Help to read current host info from storage
 */
Host.prototype.get			= function( storage ){

	var host	= storage.servers[ this.server.name ].hosts[ this.name ];
	
	return host;

};

/*
 * Add a new handler to the current host object
 */
Host.prototype.addHandler	= function( path , module , authenticate ){

	//TODO : lock
	
	var _storage	= this.server.refreshStorage();
	var host		= this.get( _storage );
	
	host.handlers[ path ] = {
	
		path			: path,
		
		module			: module,
		
		authenticate	: authenticate
	
	};
	
	this.server.updateStorage();

};

module.exports	= Host;