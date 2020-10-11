var fs = require('fs');
var  _ = require('lodash');
var moment = require('moment');
var Q = require('q');
var prompt = require('prompt-sync')({
    history: require('prompt-sync-history')(),
});
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
let key = 'impKey111';
key = crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);


var encrypt = function (buffer)  {
    var iv = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv(algorithm, key, iv);
    var result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
    return result;
};

var decrypt = function (encrypted) {
   var iv = encrypted.slice(0, 16);
   encrypted = encrypted.slice(16);
   var decipher = crypto.createDecipheriv(algorithm, key, iv);
   var result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
   return result;
};

console.log('Welcome to Edge Todo List'); 
var usersInfoDb = [], TodoListData = [];

if(usersInfoDb == undefined || usersInfoDb == null) usersInfoDb = [];
else {
    encryptedUsersInfoDb = require('./db/userEnc.js').userData;
    if(encryptedUsersInfoDb) {
        usersInfoDb = decrypt(JSON.stringify(encryptedUsersInfoDb));
        console.log("usersInfoDb", usersInfoDb[0]);
    }
}

if(TodoListData == undefined || TodoListData == null) TodoListData = [];
else {
    excryptedTodoListData = require('./db/todoEnc.js').todoList;
    if(excryptedTodoListData)
        TodoListData = decrypt(JSON.stringify(excryptedTodoListData));
}

var userDetails = {
    id : null,
    name : '',
    password : ''
};
var journalObj = {
    name :'',
    timestamp: '',
    journalEntries : []
};
var maxEntriesAllowed = 50;
var maxAccountCreation = 10;

function login () {
    console.log('***** Login/Sign Up ****');
    console.log("Press Enter after selecting your choice \n");
    console.log("1.Signup\n");
    console.log("2.Login\n");
    console.log("3.Exit");
    var userInput = prompt('', 1);
    console.log("\n");
    if(Number(userInput) == 1) {
        if(typeof usersInfoDb != 'array' || usersInfoDb.length < maxAccountCreation) {
            userDetails.name = prompt('Enter your Name    ','');
            userDetails.password = prompt('Enter your Password    ', {echo: '', value: '*pwb default*'});
            userDetails.id = getUniqueId();
            if(userDetails && userDetails.name)
                usersInfoDb.push(userDetails);
            writeUserDetailsInFile()
            .then(function(result) {
                console.log('***** User Created Successfully ****\n');
                todoInputLogic(userDetails);
            })
            .catch(function(err) {
                console.log(err, "err");
            })
        } else {
            console.log("!! Reached max limit of 10 users");
            login();
        }
    } else if(Number(userInput) == 2) {
        var currentuser = checkAuthentication();
        if(currentuser && currentuser.authentic) {
            console.log('***** Verfied ****\n');
            journalMenu(currentuser._user);
        } else {
            console.log("!!Wrong Credentials. Try Again\n");
            login();
        }
    } else if(Number(userInput) == 3) {
        process.exit();
    } else {
        login();
    }
}

function todoInputLogic (user) {
    console.clear();
    console.log('***** Journal Details ****\n\n');
    journalObj = {};
    journalObj.name = prompt('Enter Journal Name    ','');
    var journalEntryNumber = Number(prompt('Number of Entries in this journal   ', 1));
    if(!isNaN(journalEntryNumber)) {
        var oldJournals = fetchTodo(user);
        console.log("***** Write Description of Each Journal and press Enter *****\n");
        journalObj.user = user.name;
        journalObj.id = user.id;
        journalObj.journalId = getUniqueId();
        journalObj.timestamp = new Date();
        journalObj.journalEntries = [];
        while(journalEntryNumber > 0) {
            var journalEntryObj = {
                timestamp : new Date(),
                journalEntry : ''
            };
            journalEntryObj.journalEntry= prompt('', 1);
            journalObj.journalEntries.push(journalEntryObj);
            journalEntryNumber --;
        }
        if(oldJournals.length == maxEntriesAllowed && journalObj.journalEntries.length > 0) {
            if(journalObj && journalObj.name) {
                var removedJournal = _.remove(TodoListData, function(_journal){ return _journal.journalId && oldJournals[oldJournals.length -1] && oldJournals[oldJournals.length -1].journalId && _journal.journalId.toString() ==  oldJournals[oldJournals.length -1].journalId.toString()});
            }
            var oldJournals = fetchTodo(user);
        }
        if(journalObj && journalObj.name && journalObj.journalEntries.length > 0)
            TodoListData.push(journalObj);
        writeJournalDetailsInFile(journalObj)
        .then(function(result) {
            console.log("********* Journal Written ******\n");
            console.log("\nEnter Your Choice\n");
            console.log("1.Journal Menu\n");
            console.log("2.Logout\n");
            console.log("3.Exit");

            var userInput = prompt('', 1);
            if(Number(userInput) == 1) {
                journalMenu(user)
            } 
            else if(Number(userInput) == 2) {
                console.log("Loggged Out \n");
                login();
            } else if(Number(userInput) == 3) {
                process.exit();
            } else {
                console.log("!!Wrong Input, as number required.Please Try Again\n");
                journalMenu(user);
            }
        })
        .catch(function(err) {
            console.log("err", err);
        });
    } else {
        console.log("!!Wrong Input, as number required.Please Try Again\n");
        todoInputLogic(user);
    }
}

function checkAuthentication () {
    var user = {};
    user.name = prompt('Enter Your Name    ','');
    console.log("Password    ");
    user.password = prompt({echo: '*'});
    var _user = _.find(usersInfoDb , {name : user.name});
    if(_user) {
        var _password = _.find(usersInfoDb, {password : user.password});
        if(_password) {
            return {authentic : true, _user : _user};
        } else {
            return {authentic : false, _user : null};
        }
    } else {
        return {authentic  : false, _user : null};
    }
}

function fetchTodo (currentuser) {
    var _todoJournal = _.filter(TodoListData , function(_todoList) {
        return _todoList.id == currentuser.id});
    if(_todoJournal)
        return _todoJournal.sort(function(x,y) {var a = x.timestamp, b= y.timestamp;if(a>b) return -1; else if(a<b) return 1;else return 0});
    else return null;
}

function journalMenu (currentuser) {
    console.log('***** Journal Menu ****');
    console.log("Press Enter after selecting your choice \n");
    console.log("1.Creating a new list \n");
    console.log("2.View existing Journals \n");
    console.log("3.Exit");

    var todoInput = prompt('', 1);
    if(Number(todoInput) == 1) {    
        todoInputLogic(currentuser);    
    } else if(Number(todoInput) == 2) {
        var _todoJournal = fetchTodo(currentuser);
        console.log("_todoJournal", _todoJournal.length);
        viewJournal(_todoJournal, currentuser);
    } else if(Number(todoInput) == 3) {
        process.exit();
    }  else {
        console.log("!!Wrong Input. Try Again\n");
        journalMenu(currentuser);
    }
}


function viewJournal (journals, currentuser) {
    console.clear();
    console.log('***** View Journal ****\n\n');
    console.log('Journal Time                  | Description \n');
    console.log('******************************\n\n');    
    journals.sort(function(x,y) {var a = x.timestamp, b= y.timestamp;if(a>b) return -1; else if(a<b) return 1;else return 0});
    journals.forEach(function(journal) {
        journal.journalEntries.forEach(function(entry) {
            console.log(moment(new Date(journal.timestamp)).format('MMMM Do YYYY, h:mm:ss a') ,'-' ,entry.journalEntry,'\n');
        });
    });
    console.log("\nEnter Your Choice\n");
    console.log("1.Journal Menu\n");
    console.log("2.Logout\n");
    console.log("3.Exit");

    var userInput = prompt('', 1);
    if(Number(userInput) == 1) {
        journalMenu(currentuser)
    }
    else if(Number(userInput) == 2) {
        console.log("Loggged Out \n");
        console.clear();
        login();
    } else if(Number(userInput) == 3) {
        process.exit();
    } else {
        console.log("!!Wrong Input. Try Again\n");
        journalMenu(currentuser);
    }
}

var getUniqueId = function() {
    var id = (function () {
        function s4() {
          return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        };
    
        return function () {
            return (s4() + s4() + s4());
        };
    })();
    return id();
}




function writeUserDetailsInFile () {
    var deferred = Q.defer();
      if(userDetails && userDetails.name != '') {
          var encrypted = encrypt(JSON.stringify(usersInfoDb));
          fs.writeFile(__dirname + '/db/userEnc.js', 'exports.userData =' + JSON.stringify(encrypted), function(err) {
              if(err) {
                  console.log("err in file write operation", err);
                  deferred.reject(err);
              } else {
                  deferred.resolve();
              }
          });
      }
      return deferred.promise;
  }
  
  function writeJournalDetailsInFile (journalObj) {
    var deferred = Q.defer();
      if(journalObj && journalObj.name && journalObj.journalEntries && journalObj.journalEntries.length > 0) {
          var encrypted = encrypt(JSON.stringify(TodoListData));
          fs.writeFile(__dirname + '/db/todoEnc.js', 'exports.todoList =' + JSON.stringify(encrypted), function(err) {
              if(err) {
                  console.log("err in file write operation", err);
                  deferred.reject(err);
              } else {
                  deferred.resolve(journalObj);
              }
              journalObj = {};
          });
      }
      return deferred.promise;
  }

login();