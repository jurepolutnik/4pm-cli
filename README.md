4pm-cli
======================================================================

About
---------------------------
Automate your 4pm reports http://www.4pm.si/. 

Using Phantom headless web-browser (http://phantomjs.org/) to simulate user behaviour, from login to entering daily work reports.

This command line utility enables you to enter reports through terminal, or automate whole
process (or part of it) using configuration file (or command line arguments).


Installation
---------------------------
Prerequisite: NPM (https://docs.npmjs.com/getting-started/installing-node)

```
npm install -g 4pm-cli
```

Usage
---------------------------
* There is no senity checks, so if you are stupid, the thing can blow-up your computer. 
* Or at least you can end up with strange reports in 4pm (you have been warned).

To run this utility, simply type (and follow steps)

```
4pm
```

or if you are a bit smarter

```
4pm --username <name> --password <pass>
```

or even better

```
4pm --conf <conf.json>
```

where *conf.json* is

```
{
  "website": "",
  "username": "",
  "password": "",

  "project":"",
  "task":"",
  "start":"",
  "end":"",
  "duration":"",
  "description":"",
  "commit":"",
  "another":"n"
}

```

So to make your life easier (and make your boss proud), you create a cron job

```
crontab -e

30 4 * * * 4pm --conf ~/4pm-conf.json

```

where conf file is  (behold the %today% placeholder)

```
{
  "website": "https://xlab.4pm.si/",
  "username": "<me>",
  "password": "<passing>",

  "project":"0",
  "task":"0",
  "start":"%today%",
  "end":"%today%",
  "duration":"7:30",
  "description":"Working very very hard...",
  "commit":"Y",
  "another":"n"
}

```

License
----------------------------------------------
BEER-WARE

```
/*
----------------------------------------------------------------------------
"THE BEER-WARE LICENSE" (Revision 42):
<jurepolutnik> wrote this thing.  As long as you retain this notice you
 can do whatever you want with this stuff. If we meet some day, and you think
 this stuff is worth it, you can buy me a beer in return.   
 ----------------------------------------------------------------------------
 */
 ```
