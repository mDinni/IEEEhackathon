const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const jwt = require('jwt-simple');
const bcrypt = require('bcryptjs')
const app = express();

const JWT_SECRET_KEY = <YOUR_SECRET_KEY>

app.use(express.static('public'));
app.use(bodyParser.json());

var dbconn = null;

MongoClient.connect('mongodb://<USERNAME>:<PASSWORD>@ds261078.mlab.com:61078/das', function(err, db) {
    if (err) throw err
    console.log("We are connected!");
    dbconn = db;
})  



app.route('/routine').get(function(req, res, next) {
    teachers_data = req.query.username
    lect = req.query.lecture
    day = req.query.day
    dbconn.collection('routine', { w: 1 }, function(err, routineCollection) {

        routineCollection.find({"lecture": lect, "username": teachers_data, "day": day}).toArray(function(err, routine_data) {
            if (err) throw err;
            class_name = routine_data[0].class
            console.log(class_name)
            if(!routine_data.length) return res.send("No data found!!!");

            dbconn.collection('studentlist', { w: 1 }, function(err, studentlistCollection) {
                studentlistCollection.find({"class": class_name}).toArray(function(err, studentlist_data) {
                    if (err) throw err;
                    return res.send(studentlist_data);
                })
            });
            
            
        })
    });

});

app.post('/meows', function(req, res, next) {
    dbconn.collection('routine', { w: 1 }, function(err, routineCollection) {

        var token = req.headers.authorization;
        var user = jwt.decode(token, JWT_SECRET_KEY);


        var insertMeow = {
            text: req.body.newMeow,
            user: user[0]._id,
            username: user[0].username
        };

        routineCollection.insertOne(insertMeow, { w: 1 }, function(err, routine) {
            if (err) throw err;
            return res.json();
        })
    });
});


app.post('/users', function(req, res, next) {
    dbconn.collection('teachers', function(err, teachersCollection) {

        teachersCollection.findOne({ username: req.body.username }, function(err, user) {
            if (err || user == null) {
                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(req.body.password, salt, function(err, hash) {
                        var newUser = {
                            username: req.body.username,
                            password: hash
                        }

                        teachersCollection.insertOne(newUser, { w: 1 }, function(err, teachers) {
                            if (err) throw err;
                            return res.json();
                        });
                    });
                });
            } else {
                return res.status(400).json({ userFound: true });
            }
        })

    });
});

app.put('/users/signin', function(req, res, next) {

    dbconn.collection('teachers', function(err, teachersCollection) {
        teachersCollection.find({ username: req.body.username }).toArray(function(err, user) {
            if (!err) {
                bcrypt.compare(req.body.password, user[0].password, function(err, result) {
                    if (!result) {
                        return res.status(400).send();
                    }
                    var token = jwt.encode(user, JWT_SECRET_KEY);
                    return res.json({ token: token });
                })
            }

            return;

        })
    });
});

app.listen(3000, function() {
    console.log('App listening on port 3000!')
});