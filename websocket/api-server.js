var CONFIG	= require('./config');

var WServer	= function( options , create ) {
	
	//TODO : lock	
	//TODO : validate options
	
	this.name	= options.name;
	
	var _storage	= this.refreshStorage();
	var wservers		= _storage.wservers;
	
	if ( create ) {
		
		WServer.create( options );
		
		wservers[ this.name ]	= options;
		
		this.storage			= _storage;
		
		this.updateStorage();
	
	};

};

WServer.prototype.send			= function( connectionID , data ){

	WServer.send( this.name , connectionID , data );

};

WServer.prototype.sendToGroup	= function( groupID , data ){

	WServer.sendToGroup( this.name , groupID , data );

};

WServer.prototype.addHost	= function( options ){
	
	return new Host( this , options , true );

};

WServer.prototype.updateStorage	= function(){
	
	//TODO : lock
	
	var _storage	= this.storage;

	storage.WEBSOCKETS	= _storage;

};

WServer.prototype.refreshStorage	= function( options ){
	
	/*
	 * Wakanda Storage returns a copy of the stored data and not a reference on it ( even when dealing with objects )
	 * storage.key1.key11 = 5
	 * will not change the content of storage.key1
	 */
	
	var _storage	= WServer.getStorage(); //Returns at least an empty JSON object
	var wservers		= _storage.wservers || {}; //Returns at least an empty JSON object
	
	if ( wservers[ this.name ] ) {
	
		var hosts	= wservers[ this.name ].hosts || {}; //Returns at least an empty JSON object
		
		wservers[ this.name ].hosts	= hosts;
	
	};
	
	_storage.wservers			= wservers;
	
	this.storage				= _storage;
	
	/*
	 * Event if the storage.WEBSOCKETS key was empty
	 * we will at least endup with an object as such :
	 * { wservers : {} }
	 */
	return _storage;

};

WServer.create	= function( options ){

    WServer.runAction( options.name , 'init' , options , CONFIG.SERVER_CREATION_TIMEOUT );

};

WServer.getStorage	= function(){

	var _storage	= storage.WEBSOCKETS || {};
	
	/*
	 * Event if the storage.WEBSOCKETS key was empty
	 * we will at least endup with an object as such : {}
	 */
	return _storage;

};


WServer.runAction	= function runAction( serverName , action , data , timeout ){
	

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

WServer.send		= function( serverName , connectionID , data ){
	
	//TODO : handle buffers
	var buffer	= data; //( data instanceof Buffer )? data : new Buffer( data.toString() , 'utf8' );
	
	WServer.runAction( serverName , 'single_send' , { ID : connectionID , message : data } , CONFIG.SERVER_SINGLE_SEND_TIMEOUT );

};

WServer.sendToGroup		= function( serverName , groupID , data ){
	
	//TODO : handle buffers
	var buffer	= data; //( data instanceof Buffer )? data : new Buffer( data.toString() , 'utf8' );
	
	WServer.runAction( serverName , 'group_send' , { ID : groupID , message : data } , CONFIG.SERVER_GROUP_SEND_TIMEOUT );

};


var Host	= require( './api-host' );

module.exports	= WServer;
