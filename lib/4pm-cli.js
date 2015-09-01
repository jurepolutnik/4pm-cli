var Nightmare = require('nightmare');
var prompt = require('prompt');
var optimist = require('optimist');
var nconf = require('nconf');
var util = require('util');


///////////////////////////////////////////////////////////////////////////////
// Nightmare.js work-arounds
//
Nightmare.prototype._run = function(callback) {
  var self = this;
  next();

  var noop = function() {};

  function next(err) {
    var item = self.queue.shift();
    if (!item) {
      return (callback || noop)(err, self);
    }
    var method = item[0];
    var args = item[1];
    args.push((next));
    method.apply(self, args);
  }
};

Nightmare.prototype.run = function(callback) {
  var self = this;
  if (!self.page) {
    self.setup(function() {
      self._run(callback);
    });
  } else {
    self._run(callback);
  }
};

Nightmare.prototype.end = function(callback) {
  this.teardownInstance();
};

// Monkey patch for https://github.com/segmentio/nightmare/issues/126
(function() {
  var sockjs = require('nightmare/node_modules/phantom/node_modules/shoe/node_modules/sockjs');
  if (!sockjs._createServerOld) {
    sockjs._createServerOld = sockjs.createServer;
    sockjs.createServer = function(options) {
      if (!options) {
        options = {};
      }
      if (!('heartbeat_delay' in options)) {
        options.heartbeat_delay = 200;
      }
      return sockjs._createServerOld(options);
    };
  }
})();
//
//
/////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////
//
// Helpers
//
var taskId;
var data;

var extractProjects = function() {

  return projects;
};


var extractData = function() {
  var user = document.querySelector('#userProfile').innerText;

  var projects = [];
  var matchProjects = document.querySelectorAll('li.project');
  for (var i = 0; i < matchProjects.length; i++) {
    var tasks = [];
    var projectName = matchProjects[i].querySelector('span').innerText;
    var matchTasks = matchProjects[i].querySelectorAll('li.task');
    for (var j = 0; j < matchTasks.length; j++) {
      var span = matchTasks[j].querySelector('span');
      tasks.push({
        name: span.innerText,
        id: span.id.replace(/:/g, '\\:'),
        value: matchTasks[j].getAttribute('data-value')
      });
    }
    projects.push({
      name: projectName,
      tasks: tasks
    });
  }

  var data = {
    user: user,
    projects: projects
  };

  return data;
};

var handleData = function(_data) {
  data = _data;
  console.log ('* Logged-in as '+data.user);
};

var replaceSpecials = function (props)
{
  var json = JSON.stringify(props);

  var date = new Date();
  json = json.replace(/%today%/g, util.format('%s.%s.%s', date.getDate(), date.getMonth()+1, date.getFullYear()));

  date.setDate(date.getDate()-1);
  json = json.replace(/%yesterday%/g, util.format('%s.%s.%s', date.getDate(), date.getMonth()+1, date.getFullYear()));

  return JSON.parse(json);
};

var printHelp = function() {
  console.log ('All command-line arguments are optional. \nIf present, program will not ask for input.\n');
  console.log ('--conf=[FILE]\t\tPath to configuration file (json).');
  console.log ('--username=USERNAME\t4pm username');
  console.log ('--password=PASS\t\t4pm password');
  console.log ('--website=SITE\t\t4pm website');
  console.log ('');

};

////////////////////////////////////////////////////////////////////////////////
//
// Prompt, conf, ...
//


// Load arguments and config file
nconf.argv();
if (nconf.get('conf')) nconf.file(nconf.get('conf'));

if (nconf.get('help')) {
  printHelp();
  process.exit(0);
}

prompt.override = replaceSpecials(nconf.get());
prompt.message = '[4PM-CLI]'.green;
prompt.delimiter = ' ';
prompt.start();



////////////////////////////////////////////////////////////////////////////////
//
// Nightmare.js scenario
//


var start = function() {
  prompt.get([{
    name: 'website',
    description: 'Enter 4pm url:'.cyan,
    default: 'https://xlab.4pm.si'
  }, {
    name: 'username',
    description: 'Enter your username:'.cyan,
    required: true
  }, {
    name: 'password',
    description: 'Enter your password:'.cyan,
    hidden: true,
  }], function(err, result) {

    login(result, function(nightmare) {
      initData(nightmare, function(nightmare) {
        enterWork(nightmare, function(nightmare) {
          nightmare.teardownInstance();
        });
      });
    });
  });
};


var login = function(auth, cb) {
  new Nightmare()
    .viewport(1024, 800)
    .goto(auth.website)
    .type('#login-form\\:username', auth.username)
    .type('#login-form\\:password', auth.password)
    .click('#login-form\\:login-button')
    .wait()
    .run(function(err, nightmare) {
      if(err) process.exit(0);
      cb(nightmare);
    });
};

var initData = function(nightmare, cb) {
  nightmare
    .click('#sidebarMenu_my4pm_myWork>a')
    .wait()
    .click('.selector>.selector-choice')
    .evaluate(extractData, handleData)
    .run(function(err, nightmare) {
      if(err) process.exit(0);
      cb(nightmare);
    });
};

var enterWork = function(nightmare, cb) {
  selectTask(function(task) {
    taskId = task.value;

    enterTaskDetails(function(details) {

      details.taskName = task.name;
      details.taskValue = task.value;

      console.log('\n');
      console.log(details);

      prompt.get([{
        name: 'commit',
        description: 'Commit data (Y/n):'.cyan,
        default: 'Y'
      }], function(err, result) {

        if (result.commit == 'Y') {
          doEnterWork(nightmare, details, function() {
            enterAnotherWork(nightmare, cb);
          });
        }
        else {
          enterAnotherWork(nightmare, cb);
        }
      });
    });
  });
};


var enterAnotherWork = function(nightmare, cb) {
  prompt.get([{
    name: 'another',
    description: 'Enter another?:'.cyan,
    default: 'Y'
  }], function(err, result) {
    if (result.another == 'Y') {
      enterWork(nightmare, cb);
    } else {
      cb(nightmare);
    }
  });
};

var selectTask = function(cb) {
  console.log('\n');

  var projects = data.projects;
  for (var i = 0; i < projects.length; i++) {
    console.log(i + ') ' + projects[i].name);
  }

  prompt.get([{
    name: 'project',
    description: 'Choose project:'.cyan,
  }], function(err, result) {

    console.log('\n');
    var idx = parseInt(result.project);
    for (var i = 0; i < projects[idx].tasks.length; i++) {
      console.log(i + ') ' + projects[idx].tasks[i].name);
    }
    prompt.get([{
      name: 'task',
      description: 'Choose task:'.cyan,
    }], function(err, result) {
      var taskIdx = parseInt(result.task);

      cb(projects[idx].tasks[taskIdx]);
    });
  });
};

var enterTaskDetails = function(cb) {
  var date = new Date();
  var defaultDate = date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();
  prompt.get([{
    name: 'start',
    description: 'Start date (dd.mm.yy):'.cyan,
    default: defaultDate
  }, {
    name: 'end',
    description: 'End date (dd.mm.yy):'.cyan,
    default: defaultDate
  }, {
    name: 'duration',
    description: 'Duration (hh:mm):'.cyan,
    default: '7:30'
  }, {
    name: 'description',
    description: 'Description:'.cyan,
    default: 'Worked hard...'
  }], function(err, result) {
    var d = result.duration.split(':');
    result.hours = d[0];
    result.minutes = d[1];

    return cb(result);
  });
};

var doEnterWork = function(nightmare, details, cb) {
  nightmare
    .click('.selector>.selector-choice')
    .click('li.task[data-value="' + taskId + '"]')
    // Dates
    .type('#addprojectWorkForm\\:workDateStart', details.start)
    .type('#addprojectWorkForm\\:workDateEnd', details.end)
    .click('button.ui-datepicker-close') // Close datepicker

  // Hours
  .type('#addprojectWorkForm\\:workHoursHours', details.hours)
    .type('#addprojectWorkForm\\:workHoursMinutes', details.minutes)

  //Description
  .type('#addprojectWorkForm\\:description', details.description)
    .click('#addprojectWorkForm\\:insertWork')
    .wait(200)
    .click('#sidebarMenu_my4pm_myWork>a')
    .run(function(err, nightmare) {

      cb(nightmare);
    });
};

start();
