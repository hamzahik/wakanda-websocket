var CONFIG	= require('./config');

var Server	= function( options , create ) {
	
	//TODO : lock	
	//TODO : validate options
	
	this.name	= options.name;
	
	var _storage	= this.refreshStorage();
	var servers		= _storage.servers;
	
	if ( create ) {
		
		Server.create( options );
		
		servers[ this.name ]	= options;
		
		this.storage			= _storage;
		
		this.updateStorage();
	
	};

};

Server.prototype.send			= function( connectionID , data ){

	Server.send( this.name , connectionID , data );

};

Server.prototype.sendToGroup	= function( groupID , data ){

	Server.sendToGroup( this.name , groupID , data );

};

Server.prototype.addHost	= function( options ){
	
	return new Host( this , options , true );

};

Server.prototype.updateStorage	= function(){
	
	//TODO : lock
	
	var _storage	= this.storage;

	storage.WEBSOCKETS	= _storage;

};

Server.prototype.refreshStorage	= function( options ){
	
	/*
	 * Wakanda Storage returns a copy of the stored data and not a reference on it ( even when dealing with objects )
	 * storage.key1.key11 = 5
	 * will not change the content of storage.key1
	 */
	
	var _storage	= Server.getStorage(); //Returns at least an empty JSON object
	var servers		= _storage.servers || {}; //Returns at least an empty JSON object
	
	if ( servers[ this.name ] ) {
	
		var hosts	= servers[ this.name ].hosts || {}; //Returns at least an empty JSON object
		
		servers[ this.name ].hosts	= hosts;
	
	};
	
	_storage.servers			= servers;
	
	this.storage				= _storage;
	
	/*
	 * Event if the storage.WEBSOCKETS key was empty
	 * we will at least endup with an object as such :
	 * { servers : {} }
	 */
	return _storage;

};

Server.create	= function( options ){

    Server.runAction( options.name , 'init' , options , CONFIG.SERVER_CREATION_TIMEOUT );

};

Server.getStorage	= function(){

	var _storage	= storage.WEBSOCKETS || {};
	
	/*
	 * Event if the storage.WEBSOCKETS key was empty
	 * we will at least endup with an object as such : {}
	 */
	return _storage;

};


Server.runAction	= function runAction( serverName , action , data , timeout ){
	

	var folderPath	= File(module.filename).parent.path;
	var worker		= new SharedWorker( folderPath + 'ws-server-worker.js' , serverName );
    var workerPort	= worker.port;
	var err			= true;
	
    workerPort.onmessage	= function(event) {
    	
        var message	= event.data;

        switch (message.type) {
        	
        	/*
        	 * Event  : The Worker is ready
        	 * Action : We ask the worker to create the socket server for us
        	 */
        	case 'ready':
        		
                workerPort.postMessage({
                	
                	type	: action ,
                	
                	data	: data
                	
                });
                
                break;
            
            /*
        	 * Event  : The Worker responds to our "init" request
        	 * Action : we handle errors, otherwise everything is OK
        	 */
            case action + '_response':
            	
            	err	= false;
        	
        		exitWait();
                
                break;
                
        };
        
    };
    
    wait( timeout );
    
    if ( err ) {
    
    	throw {
					
			"type" : "worker_error",

			"description" : "Couldn't run the action before timeout.",
			
			"data" : {
				
				"action" : action,
				
				"data" : data,
				
				"timeout" : timeout
			
			}
		
		};
    
    };

};

Server.send		= function( serverName , connectionID , data ){
	
	//TODO : handle buffers
	var buffer	= data; //( data instanceof Buffer )? data : new Buffer( data.toString() , 'utf8' );
	
	Server.runAction( serverName , 'single_send' , { ID : connectionID , message : data } , CONFIG.SERVER_SINGLE_SEND_TIMEOUT );

};

Server.sendToGroup		= function( serverName , groupID , data ){
	
	//TODO : handle buffers
	var buffer	= data; //( data instanceof Buffer )? data : new Buffer( data.toString() , 'utf8' );
	
	Server.runAction( serverName , 'group_send' , { ID : groupID , message : data } , CONFIG.SERVER_GROUP_SEND_TIMEOUT );

};


var Host	= require( './api-host' );

module.exports	= Server;
