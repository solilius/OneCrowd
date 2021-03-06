//##############################################//
//############### - One Crowd - ################//
//##############################################//

//================= VARIABLES ==================//

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var sql = require('sqlite3').verbose();
var dbFile = __dirname + '/' + 'OneCrowd.db';
var db = new sql.Database(dbFile);
var base64 = require('file-base64');

//=============== FIXES AND TWEAKS =============//

// Help for loading resources from server
app.use(express.static(__dirname + '/'))
// Solve the Access-Control-Allow-Origin problem
app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'accept, content-type, x-parse-application-id, x-parse-rest-api-key, x-parse-session-token');
     // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
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

// Manager - Return media files
app.get('/manager/:crowd/:type', function(req, res){
  fs.readdir(__dirname + '/Media/Crowds/' + req.params.crowd + '/manager-media/'+  req.params.type, function (err, files) { 
    if (typeof files !== 'undefined' && files !== null){
    res.send(getmMediaList(files, req.params.crowd, req.params.type)); 
} else {
    res.send()
}
  });
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
      var path =  "/Media/Crowds/" + data.room + "/" + data.sendertype + "-Media/" + data.type + "/";
      var fileName =  Date.now().toString() + getEnding(data.type);
      ConvertBase64(__dirname + path + fileName, data.content);
      data.content = path + fileName;
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

// Get list of files and return path
function getmMediaList(files, crowd, type){
  var list =[];
  
  switch (type) {
    case 'picture':
        for (var i = 0, len = files.length; i < len; i++) {
           list.push('/Media/Crowds/' + crowd + '/manager-media/' + type + '/' + files[i]);
          } 
      break;
  
    case 'audio':
          for (var i = 0, len = files.length; i < len; i++) { 

            var item = new Object();     
            item.url = '/Media/Crowds/' + crowd + '/Manager-Media/Audio/' + files[i];
            //item.url = '/Media/' + files[i];
            item.title = files[i].replace('.mp3', '');
            list.push(item);
          } 

      break;
  }
  return list;
}

// Convert base 64 to file and save to local path
function ConvertBase64(path, content) {
    base64.decode(content, path, function(err, output) {
      console.log("success");
    })
}

// Make directories
function MakeDirs(path){
}

// Save media file 
function SaveFile(path, file){
    fs.writeFile(path, file,  function(err) {
      if (err) {
        return console.error(err);
      }
    console.log("Data written successfully!");
    });
}

// Get the file type
function getEnding(type){
  switch(type){
    case 'picture':
      return '.jpeg';
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
app.set('port', (process.env.PORT || 80));

http.listen(app.get('port'), function(){
  console.log(new Date() + '\nOne Crowd server started\nPort: '+ app.get('port') );
});