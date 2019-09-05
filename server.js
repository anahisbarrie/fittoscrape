var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
// cheerio is a module to download data and scrapping
var cheerio = require("cheerio");
var db = require("./models");


const PORT = process.env.PORT || 8080;

var app = express();

app.use(logger("dev"));
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
app.use(express.static("public"));

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database/ /
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true })

//mongoose.connect('mongodb://user:password@sample.com:port/dbname', { useNewUrlParser: true })


// Get route for scraping the website 
app.get("/scrape", function (req, res) {
    //grabbing the body of the html with axios 
    console.log("getting to this route");

    console.log("SCRAPE LIVES")
    axios.get("https://www.buzzfeednews.com/").then(function (response) {
        // console.log(response.data)
        //to download data from NYT load cheerios and save it into a variablew
        var $ = cheerio.load(response.data);
        // to grab every h2 with an article tag:
        var resultList = [];
      
        $("article.newsblock-story-card").each(function (i, element) {
            //add an empty array to save the data  that user will scrape
            //    console.log(element)
            //save the results of th eobject and every property 
            var link = $(element).children("span.newsblock-story-card__info")
                .children("h2")
                .children("a")
                .attr("href");

            var title = $(element).children("span.newsblock-story-card__info")
                .children("h2")
                .children("a")
                .text();

            var sum = $(element).children("span.newsblock-story-card__info")
                .children("p")
                // .children("a")
                .text();

            if (title && sum && link) {
                var results = {
                    title: title,
                    link: link,
                    summary: sum
                };
                resultList.push(results);
            }
        });
        db.Question.create(resultList)
            .then(function (dbArticle) {
                console.log(dbArticle);
            })
            .catch(function (err) {
                console.log(err)
            });
    })
});

// Route for getting articles from the db 
app.get("/questions", function (req, res) {
    // To grab every article
    console.log("calling route question")
    db.Question.find({})
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

//Route to grabb a specific article by id
app.get("/questions/:id", function (req, res) {
    db.Question.findOne({ _id: req.params.id })
        .populate("note")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});


// Route for saving/updating an Article's associated Note
app.post("/questions/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {
            console.log("dbNote", dbNote)
            // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
            // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
            // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
            return db.Question.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
        })
        .then(function (dbArticle) {
            console.log("dbarticle", dbArticle)
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            console.log(err)
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
