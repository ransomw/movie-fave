## movie-fave

Yet Another Reference App that seeks to explore the role of 3rd-party libraries in javascript development and serve as a teaching tool.

![layered](http://www.euclidlibrary.org/images/tickle-your-brain/icecreamcone.jpg?sfvrsn=0) ![vanilla](http://texaschickenme.com/datajordan/modules/Cms/mealitems/f/114/image/original/Ice_Cream_Cone1.png)

### Setup

* `npm install`
* `./make_doc.sh`
* `PORT=<port-number> node bin/run`

Developed on node v5.5.0, npm 3.3.2, and Chromium 47.

##### browser support

* IE, Chrome < 32, and Firefox < 29 do not ES6 Promise spec

### Remarks

There are quite a few comments in the markup and style files as well as the generated documentation.  There are also several comments in `starter_code/server_review.js`.

##### regarding 3rd party client-side libs

Sometimes 3rd party libs abstract web standards or new techniques in a useful way.
a good routing library could be updated to support `pushState` without substantial edits to the code bases that depend on it.  similarly, upstream edits to a "view-layer" library could allow an application to support
[incremental-dom](https://github.com/google/incremental-dom)
as a matter of a small configuration change.
in some sense, web standards themselves require an even higher level of buy-in than 3rd party libs since, in their current state, most browsers are large, nearly-monolithic systems that would be much more difficult to maintain without funding than client-side libraries.

Rather than either using a monolithic client-side library or insisting upon no libraries at all, a middle path might involve teaching students learn to compose a number of small libraries, such as
[lodash](https://lodash.com/),
[moustache](https://github.com/janl/mustache.js), and
[superagent](https://visionmedia.github.io/superagent/).
Other libraries such as
[backbone](http://backbonejs.org/),
[less](http://lesscss.org/), and
[director](https://github.com/flatiron/director)
could be useful as well, although there are some judgement calls to make about where to draw the line between what libraries students should be able to use.
Learning to use libraries by reading documentation, working with the debugger, and reading source is a key skill for developers of all sorts.
Students who wish to go above and beyond may choose to substitute their own implementations of some common web functionality or extend the existing implementations.

##### on marionette

[marionette](http://marionettejs.com/)
is a mature, actively-maintained and -developed frontend framework built on top of backbone with good
[documentation](http://marionette.gitbooks.io),
solid
[tooling](http://marionettejs.com/inspector/),
and a friendly [community](http://gitter.im/marionettejs/backbone.marionette).
it at once provides a complete solution for most single-page applications and enables developers to extend functionality with other libraries, plugins, and custom implementations.  as such, marionette represents the first steps toward a middle-of-the-road solution from the direction of a frontend framework.

documented patterns use
[events](https://en.wikipedia.org/wiki/Event-driven_programming)
and
[triggers](http://marionettejs.com/annotated-src/backbone.marionette.html#section-96)
([also see](https://marionette.gitbooks.io/marionette-guides/content/en/views/events.html)) in a way that i found somewhat jarring after acclimating to, for instance,
[Angular](http://angularjs.org/)
v1's two-way data binding or
[Om](https://github.com/omcljs/om)'s
data flow.  like any design pattern, marionette's use of events and triggers takes some time to digest, and whether it is objectively "better" or "worse" for a given project depends upon the use case.

backbone's defaults make some assumptions that do not fit the specifications for this project.  for example, by default, backbone expects per-instance HTTP Create endpoints for
[`Backbone.Model`](http://backbonejs.org/#Model)s that model data.
while, for the sake of example, the current frontend implementation treats the create endpoint as non-instance-specific and expects no data other than HTTP headers.
since backbone, like marionette, is fairly clear and concise and has solid reference documentation, adapting the library to non-default use cases is a potentially helpful exercise in reading and learning from others' code.

note that most of the example apps listed on the marionette homepage choose not to use
[`AppRouter`](http://marionettejs.com/docs/v2.4.4/marionette.approuter.html).

##### misc

Consider teaching how to use a module system.  modularity is an idea fundamental to good software design.
ES6 would be good for a standards-based approach.  although, since students are using nodejs on the server-side anyway, CommonJS modules and browserify or webpack might be less confusing, even though it's more tooling to set up.

Instructions specify using express, a 3rd party server-side lib, yet
* using the built-in [`http`](https://nodejs.org/api/http.html) module would not be significantly more difficult for this app's use case and would allow students to learn about [streams](https://github.com/substack/stream-handbook)
* `__proto__`-based inheritance in express:  i've seen [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto) suggesting that this pattern has performance concerns, although i'm not sure if they apply to the node runtime.  i do know that `__proto__`-based inheritance [was removed](https://github.com/mochajs/mocha/issues/1728) from [mocha](http://mochajs.org/), another popular library
* [koa](http://koajs.com/) might supplant express
* there are several other server-side libraries such as [fortune.js](http://fortunejs.com/) and [hoodie](http://hood.ie/) that could enable students to start focusing on really solid client-side patterns with even less cognitive overhead than that required to use express

On the whole, this is a very interesting project, and it is, in some ways, more informative to me than learning Yet Another framework.  I hope to have to opportunity to contiue detailed discussion about software design with other people.

### license
Code is licensed Apache v2.  Comments and documentation under Creative Commons Attribution+ShareAlike.

So the code is free to be reused as in any Apache-licensed project,
and the comments are documentation are available for commercial use but "copyleft" under the condition that the email address
`auvergnerw@gmail.com`
and website
[ransomw.github.io](http://ransomw.github.io)
be included in any usage or "remix" thereof.
