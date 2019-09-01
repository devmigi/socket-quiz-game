var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var allGames = {};
var waitingGameId = null;
var activeUserGame = {};
var questions = [
  {
    "question" : "Capital of India?",
    "options" : [
      "Mumbai", 
      "Chennai",
      "New Delhi",
      "Kolkata"
    ],
    "answer" : [
      "New Delhi"
    ]
  },
  {
    "question" : "Currency of India?",
    "options" : [
      "INR", 
      "USD",
      "GBP",
      "ARB"
    ],
    "answer" : [
      "INR"
    ]
  },
  {
    "question" : "Number of continents?",
    "options" : [
      "3", 
      "13",
      "7",
      "5"
    ],
    "answer" : [
      "7"
    ]
  },

]

io.on('connection', function(socket){
  if(!waitingGameId){
    waitingGameId = "game-" + new Date().getTime() +"-" + Math.floor(Math.random() * 100);
    allGames[waitingGameId] = {
      "player1" : null,
      "player2" : null,
      "stats" : null,
      "stage" : 0,
      "currentStageStatus" : 0 // 0: answer awating, 1: one player has answered, 2: both has answered
    }
  }
  
  socket.on('new player', function(userId){
    socket.join(waitingGameId); // add player to game room
    activeUserGame[userId] = waitingGameId; // set active game of user 

    if(!allGames[waitingGameId].player1){
      allGames[waitingGameId].player1 = userId;
    }
    else{
      allGames[waitingGameId].player2 = userId;
      
      io.to(waitingGameId).emit('game ready', waitingGameId, allGames[waitingGameId]);
      askNextQuestion(waitingGameId);

      waitingGameId = null;
    }
    // console.log(allGames);
  });

  socket.on('answered', function(userId, questionId, ans){ 
    var correct = questions[questionId].answer.includes(ans);
    var gameId = activeUserGame[userId];

    io.to(gameId).emit('check answer', {
      'userId' : userId,
      'questionId' : questionId,
      'correct' : correct
    });

    updateGameStatus(gameId, userId, questionId, correct);
    askNextQuestion(gameId);
  });


  socket.on('answer timeout', function(userId, questionId){ 
    var gameId = activeUserGame[userId];

    io.to(gameId).emit('check answer', {
      'userId' : userId,
      'questionId' : questionId,
      'correct' : false
    });

    updateGameStatus(gameId, userId, questionId);
    askNextQuestion(gameId);
  });


  function updateGameStatus(gameId, userId, questionId, correct){
    if(typeof correct == 'undefined'){
      correct = false;
    }

    allGames[gameId].currentStageStatus++;
    if(allGames[gameId].currentStageStatus == 2){
      allGames[gameId].currentStageStatus = 0
    }
    
    console.log(allGames[gameId]);
  }

  function askNextQuestion(gameId){
    if(allGames[gameId].stage < 5){
      if(allGames[gameId].currentStageStatus == 0){
        console.log("Asking new ");
        
        allGames[gameId].stage = allGames[gameId].stage++;
       
        io.to(gameId).emit('new question', getRandomQuestion());
      }
    }
    else{
      io.to(gameId).emit('game over', allGames[gameId]);
    }
  }


});



http.listen(3000, function(){
  console.log('listening on *:3000');
});

function getRandomQuestion(){
  var questionId = randomIntFromInterval(0, questions.length - 1);
  var question = questions[questionId];
  
  return {
    'id' : questionId,
    'question' : question.question,
    'options' : question.options,
  };
}

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}


