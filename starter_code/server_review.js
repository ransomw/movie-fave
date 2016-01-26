/****
 * Overall comments: the original submission demonstrates a fairly
 * good understanding of the express api and node environment.
 * Generally applicable suggestions include:
 *
 * - Using a syntax-highlighting text editor such as
 *   > atom http://atom.io
 *   > sublime http://sublimetext.com
 *   > vim http://vim.org
 *   > emacs http://www.gnu.org/software/emacs/
 *   and/or a lint tool such as
 *   > jslint http://jslint.com
 *   > jshint http://jshint.com
 *   > standard http://standardjs.com
 *   will find and report some of the things mentioned here
 *   in an almost as user-friendly, readable way.
 *   While there is no "right" way code, most people eventually find
 *   it helpful to write in a way that's consistent througout
 *   any given project.
 *
 * - Using the filesystem for storage is a great way to get started
 *   b/c it emphasizes first principles.  Depending on the use-case
 *   for this application, fundamental concepts that may appear are
 *   those of (1) concurrency, which is the preferred term for, "doing
 *   a lot of things at once," among programmers and (2) state, lingo
 *   for, "stuff that things get done to or with."  Dijkstra was one
 *   of the first people to start thinking about concurrency
 *   and stateful programming. (Wikipedia!)
 *
 *   These concepts could occur in in this or a similar project when
 *   two movies are favorited at the same time.
 *
 *   Some HTTP servers might handle one request at a time, picking one
 *   to go first -- reading the file into memory, updating the data
 *   in memory and then writing it back to a file -- and then doing
 *   the same for the other.  However, if there are a lot of requests
 *   at more or less the same time, then the requests that go first
 *   complete a lot faster than the ones that are handled later,
 *   so some other HTTP servers handle requests concurrently.
 *
 *   So what could happen here is that while one request, say reqA,
 *   is pushing "I like Starwars!" into data in the application's memory,
 *   another, reqB, is reading data from the file system.  Then
 *   reqA saves its memory to the file while reqB is pushes "me too!"
 *   onto the in-memory data.  At this point, the file says
 *   "I like starwars!" but not "me too!, and reqB's memory says
 *   "me too!" but not "I like starwars!".  So when reqB writes its
 *   memory to the file, "I like starwars!" is forgotten.
 *
 *   Even for web servers that don't handle concurrent requests,
 *   it's common to run several instances of an application
 *   behind a server called a "reverse proxy" that concurrently delegates
 *   requests to application instances.  So lots, probably most, web
 *   applications use a database of some sort, because databases
 *   address these issues of state and concurrency.
 *   All implementation choices depend on the use case, of course,
 *   and these are merely things to be aware of.
 *
 */


var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
/* define bodyParser variable.  editors and linters will warn about
 * undefined variables.  be aware that the node environment defines
 * a few variables (e.g. 'require' and '__dirname') that are not
 * part part of the lanaguage standard, so development environments
 * (which can editors and linters, among other tools) sometimes need
 * special configuration for these.
 */
var bodyParser = require('body-parser');

/* if something like a number or a string (technically, a "literal")
 * occurs in more than one place, it can be helpful
 * to store it in a variable.  that way, if making changes doesn't take
 * as much typing.  in javascript, this could have the downside
 * of the variable getting changed when in shouldn't be.
 *
 * i'm lazy, though, so i like using variables where possible.
 * i've put the variable names in CAPS here with the hope that it'll
 * help me remember not to inadvertanty change them.
 */
var PATH_DATA_FILE = path.join(__dirname, 'data.json');
/* port 3000 is occupied on my development machine,
 * so if the environment variable 'PORT' is defined
 * (like, if i run `PORT=5000 node server_review.js`
 *  on a linux command line) run the server on that value
 * and run it on port 3000 otherwise
 *
 * although this edit is for my use case and isn't super important
 * to pay attention to, it does demonstrate a very common idiom:
 * boolean operators don't necessarily evaluate to boolean values.
 * && and || evaluate to one of their operator arguments, depending
 * on the "truthiness" (the opposite of the result returned by !val).
 *
 * so maybe_something || definitely_something is an idiom that
 * occurs in several javascript projects.
 */
var PORT = process.env.PORT || 3000;
var FAVES_ENDPOINT = '/favorites';

app.use(express.static(path.join(__dirname, '/public')));
/* jslint suggests using semicolons after every js statement,
 * standardjs suggests not. since semicolons are mostly used elsewhere
 * in this project, i've added one here for consistency.
 */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* added closing parenthesis.
 * a good text editor will show mismatched parens
 * (i.e. parentheses, brackets, curly brackets, etc.)
 * via syntax-highlighting, etc.
 *
 * another strategy is to experiment with indentation,
 * which i've done here for the sake of demonstation, even though
 * this indentation is not consistent with the rest of the project.
 * in practice, i would putting the following statement on one line.
 */
app.use(
  '/',
  express.static(path.join(__dirname, 'public'))
);

app.get(FAVES_ENDPOINT, function(req, res){
  var data = fs.readFileSync(PATH_DATA_FILE);
  /* consider using res.json() */
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
  /* closing parens */
});

/* changed app.get to app.post
 *
 * the HTTP protocol defines several "methods," like GET and POST
 * to describe the types of things that we'd like HTTP requests
 * to do.  although there are some differences of opinion about
 * when to use which HTTP methods (like, i suppose i
 * could've used PUT here instead), GET is the most common way to
 * get data from the server, and POST is usually how people send
 * data to a server.
 *
 * note that both GET and POST requests recieve
 * responses from the server, so it's *not* necessary to POST data
 * and then GET a response to see what happened.
 */
/* changed 'favorites' to '/favorites'
 *
 * express does not add a preceeding '/' to url paths for its users,
 * although some frameworks might and express could be extended to do so.
 *
 * the node HTTP server runs one of the two function(req, res) written
 * here according to the method of the request, so it's ok to have
 * two handlers at the same url path as long as they're attached to
 * different methods.
 */
app.post(FAVES_ENDPOINT, function(req, res){
  if(!req.body.name || !req.body.oid){
    res.send("Error");
    /* semicolon */
    return;
    /* close paren */
  }

  /* tangentially, a node-specific trick: require('./file.json')
   * can read a file and parse its contents as json.
   * i consider that usage of require somewhat idomatic, though,
   * and best reserved for things like init/config files.
   */
  var data = JSON.parse(fs.readFileSync(PATH_DATA_FILE));
  data.push(req.body);
  /* see the above remarks about concurrency and additionally note
   * the difference between between writeFile and writeFileSync:
   * as is, res.send might be called before the file write is complete.
   * this is not necessarily "wrong."  it is something to be aware of.
   */
  fs.writeFile(PATH_DATA_FILE, JSON.stringify(data));
  /* consider using res.json() */
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
});

/* changed 'list' to 'listen' */
app.listen(PORT, function(){
  console.log("Listening on port " + PORT);
});
