#Wakanda WebSocket Module

**License** : MIT

**Target Version** : WAKANDA 10 (No reason not to work on previous Wakanda Versions)

This is an attempt to reimplement the WebSocket protocol from scratch for Wakanda Server.

As stated in the license this code is provided **without any warranty**.

You're welcome to contribute by fixing bugs, adding new features, coding unit tests..

## Index

- [Starting a Websocket Server](#start-server)
- [Authentication Module](#authentication)
- [Message Handlers](#handlers)
- [Server Initiated Messages](#server-to-client)
- [Known limitations](#known-limitations)

#How-To

<a name="start-server"></a>
##Starting a Websocket Server

You can start a Websocket server at any time during the lifetime of your application, including in a bootstrap file.

###Code Example

```javascript
/*********************
 * Websocket Server
 *********************/

//Require the module 
var ws	= require('websocket');

//Create the server given an identifier(name), IP and port
var server	= ws.createServer({
	
	name	: 'ws-server',
	
	IP		: '127.0.0.1',
	
	port	: 8082
	
});

/*
 * Declare a host to which you can attach handlers
 * This way we can have the same pattern but different handlers depending on the recieved "host" header
 */
var host	= server.addHost({

	host : '127.0.0.1:8082', //Host
	
	origins : ['http://127.0.0.1:8081'], //allowed origins
	
	authenticator : 'websocket-authenticator' //module that authenticates every new connection

});

/*
 * Associate a handler to the host "127.0.0.1:8082"
 * received messages are going to be handled by the module "websocket-handler"
 * The third parameter is boolean : if set to true, all connection attempts
 * will pass through the authentication module.
 */
host.addHandler( '^/api/1.0/\\?t=[a-zA-Z\\.0-9_\\-]+$' , 'websocket-handler' , true );
```

<a name="authentication"></a>
##Authentication Module

You can declare an "authenticator" module that can accept or refuse connection attempts.

The authenticator should expose a method called `onmessage` that will receive two parameters :

- `request` representing the WebSocket HandShake Request
- `connectionStorage` representing the current connection's storage.

Each Websocket connection comming from the browser has its own connectionStorage object where you can store and read information.

###Code Example

```javascript
exports.onmessage	= function( request , connectionStorage ){
	
	var uri         = request.URI;
	var HTTPVersion = request.HTTPVersion;
	/*
	 * All header names are in lower-case
	 */
	var headers     = request.headers;
	var host        = request.headers.host;
	var origin      = request.headers.origin;
	var cookie      = request.headers.cookie;
	
	if(host !== "www.wakanda.org"){
		/*
		 * Refuse and Close the connection
		 */
		return false;
	}
	
	/*
	 * Explicitly accept the connection
	 */	
	return {"accepted":true};

};
```

<a name="handlers"></a>
##Handler Module

For each handler there is an associated module to process the received messages.

###Code Example

```javascript
exports.onmessage	= function( message , response , session ){
	
	var parsedMessage;
	
	try {
		parsedMessage		= JSON.parse( message );
	} catch( e ) {
		/*
		 * Close the connection if we receive something other than JSON
		 */
		session.close();
	};
	
	switch(parsedMessage.action){
		
		case "ping":
			return JSON.stringify({
				"status" : "ok",
				"data" : "pong"
			});
			
		case "join":
			session.addToGroups(parsedMessage.data);
			return JSON.stringify({
				"status" : "ok"
			});
			
		default:
			return JSON.stringify({
				"status" : "ko",
				"error" : 404
			});
	}
};
```

A hanlder module should expose an `onmessage` method receiving three parameters :

- `message`
- `response`
- `session` ( maybe should be renamed to connection )

Some details :

- The received `message` is always of type string.
- You can respond to a `message` or not.
- To respond to a received `message` you either give a value to `response.body` or just simply `return "a response"`.
- The `response` body can either be a string or a buffer.

###`session` Object

The session object gives you the possibility of :

- Closing the connection

```javascript
 session.close();
```

- Setting an ID for the connection
```javascript
session.setID( "abc" );
```

- Join broadcast groups
```javascript
session.addToGroups( ["all", "gameFranceVSBrazilNotifications"] );
```

- leave broadcast groups
```javascript
session.removeFromGroups( ["all", "gameFranceVSBrazilNotifications"] );
```

- Store data in the current connection
```javascript
session.storage.fullname = "John Smith";
```

<a name="server-to-client"></a>
##Send messages to users/broadcast groups

**This is reserved for usage outside of message handlers (And the Websocket SharedWorker in general).**

###BroadCast Group

```javascript
var ws     = require("websocket");
var server = ws.get("ws-server"); //server name

/*
 * First parameter is the group ID/name
 * The second one is the message
 */
server.sendToGroup("gameFranceVSBrazilNotifications", "Goaal!"));
```

###Single Send

```javascript
var ws     = require("websocket");
var server = ws.get("ws-server"); //server name

/*
 * First parameter is the connection ID/name
 * The second one is the message
 */
server.send("user12", "You have a new private message!");
```

<a name="known-limitations"></a>
#Known limitations

- Cannot use the HTTP server's port.
- Does not handle compression.
- Does not handle WSS.
- Not heavily tested.
