//##############################################//
//############### - One Crowd - ################//
//##############################################//

//================= VARIABLES ==================//

var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var sql = require('sqlite3').verbose();
var dbFile = __dirname + '/' + 'OneCrowd.db';
var db = new sql.Database(dbFile);
db.serialize();


//=============== FIXES AND TWEAKS =============//

// Help for loading resources from server
app.use(express.static(__dirname + '/'))

// Solve the Access-Control-Allow-Origin problem
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//==================== API ====================//

// Search - return all the crowds
app.get('/crowds', function(req, res){
    var callback = function(data){
      res.send(data);
    }
    
    getRowsFromDB("SELECT * FROM crowds_table", callback);   
});

// Crowd - Return the crowd/manager chat
app.get('/crowd/:crowd/:sender', function(req, res){
  var callback = function(data){
      res.send(data);
    }
    var query = "SELECT * FROM " + req.params.sender + "_chat_table WHERE crowd_name = '" + req.params.crowd + "'";
    getRowsFromDB(query, callback);
});

// Crowd - Return media list
app.get('/crowd/:crowd/:sender/:type', function(req, res){
  var callback = function(data){
      res.send(data);
    }
    var query = "SELECT * FROM " + req.params.sender + "_chat_table WHERE crowd_name = '" + req.params.crowd + "' AND type = '" + req.params.type + "'";
    getRowsFromDB(query, callback);
});

//================== SOCKETS ====================//

// Socket testing
app.get('/', function(req, res){
  res.sendfile('test.html');
});

app.get('/2', function(req, res){
  res.sendfile('test2.html');
});

// Sockets handeling
io.on('connection', function(socket){

  // On Handshake 
  console.log('a user connected');

  // Disconnecting
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  // Join room
  socket.on('event', function(data, callback){
    this.join(data.room);
    callback('welcome to ' + data.room + ' room');
  });

  // On Receiving
  socket.on('chat message', function(data){
    
    data.date = getTime();

    if(data.type != "text"){
      var path =  __dirname + "\\Media\\" + data.sendertype + " Media\\" + Date.now().toString() +data.type + getEnding(data.type);
      // convert to file
      SaveFile(path, data.content);
      data.content = path;
    }

    //Save to db
    var query;
    if(data.sendertype == "manager"){
      query = "INSERT INTO manager_chat_table VALUES('" + data.room +"','" + data.content +"','" + data.type +"','" + data.date +"')";
    } else{
      query = "INSERT INTO crowd_chat_table VALUES('" + data.room +"','" + data.sender +"','" + data.content +"','" + data.type +"','" + data.date +"')";
    }
    AddToDb(query)
    io.in(data.room).emit('chat message', data);
    console.log(data)
  }) 
});

// ============= PRIVATE METHODS ==============//

// Get the file type
function getEnding(type){
  switch(type){
    case 'picture':
      return '.jpg';
    case 'video':
      return '.mp4';
    case 'audio':
      return '.mp3';
  }
}

// Read from the db
function getRowsFromDB(query, callback){
        db.all(query, function(err, rows){
        if (err === null) {
            callback(rows);
        } else {
            callback("Oops that was unexpected was it...");
        }
    });
}

// Writing to the db
function AddToDb(query){
    db.run(query, function(err){
        if (err != null) {
            console.log(err);
        }
    });
}

// Save media file 
function SaveFile(path, type, file){
    fs.writeFile(path, file,  function(err) {
      if (err) {
        return console.error(err);
      }
    console.log("Data written successfully!");
    });
}

// Get time
function getTime(){
   var d,h,m;
   d = new Date();
   h = d.getHours();
   m = d.getMinutes();
   if(h<10){h="0"+h}
   if(m<10){m="0"+m}
   return h + ":" + m ; 
}

//=============== START THE SERVER =============//
var port = 80;
http.listen(port, function(){
  console.log(new Date() + '\nOne Crowd server started\nPort: '+ port );
});