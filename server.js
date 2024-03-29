const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
//The bcryptjs module is used to hash/encrypt passwords so that we don't include the actual password in our database
const bcrypt = require('bcryptjs');

// Require the config file
const config = require('./config.json');

// Get the Model for our Product
const Product = require('./models/products');
// Get the Model for our Users
const User = require('./models/users');

// Connect to Mongoose
// To get the url to connect with you need to first have a cluster on mongodb, as well as a username and password for a user that has read and write permissions.
// In our config.json we have a MONGO_USER, MONGO_PASSWORD AND MONGO_CLUSTER_NAME. You can find all of these through mongodb
// you also need to tell it what database are you wanting to connect to. In the example bellow we are connecting to the shop database.
// You will need to replace that with the name of the database you are wanting to connect to.
// You do NOT need to create the database and tables on mongoDB itself, mongoose will do it for you. If it can't find the database or tables you are wanting to connect to, then it will create them for you.
mongoose.connect(`mongodb+srv://${config.MONGO_USER}:${config.MONGO_PASSWORD}@${config.MONGO_CLUSTER_NAME}.mongodb.net/shop?retryWrites=true&w=majority`, {useNewUrlParser: true});

// Test the connection to mongoose
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('we are connected to mongo db');
});

// Convert our json data which gets sent into JS so we can process it
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

// Allow Cross Origin requests, ie http to https requests
app.use(cors());

// Create a console message showing us what request we are asking for
app.use(function(req, res, next){
    console.log(`${req.method} request for ${req.url}`);
    next();
});

//Home Route
app.get('/', function(req, res){
    res.send('Welcome to our Products API. Use endpoints to filter out the data');
});

//Add a new Product
app.post('/product', function(req, res){
    const product = new Product({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        price: req.body.price,
        user_id: req.body.userId
    });

    product.save().then(result => {
        res.send(result);
    }).catch(err => res.send(err));
});

// Get all Products
app.get('/allProducts', function(req, res){
    Product.find().then(result => {
        res.send(result);
    })
})

app.get('/product/:id', function(req, res) {
    const id = req.params.id;

    Product.findById(id, function(err, product) {
        if (err) {
            res.send(err);
        } else {
            res.send(product);
        }
    });
})

//Get single Product based on ID
app.post('/product/:id', function(req, res){
    const id = req.params.id;
    // we need to check to see if the product which we are asking for actually belongs to the
    // user who is requesting it. If they aren't then we will send them back a 401 error
    // The same thing is being done with the edit and delete functions
    Product.findById(id, function (err, product) {
        if(product['user_id'] == req.body.userId){
            res.send(product);
        } else {
            res.send('401');
        }
    });
});

// Update a product based on id
app.patch('/product/:id', function(req, res){
    const id = req.params.id;
    Product.findById(id, function(err, product){
        if(product['user_id'] == req.body.userId){
            const newProduct = {
                name: req.body.name,
                price: req.body.price
            };
            Product.updateOne({ _id : id }, newProduct).then(result => {
                res.send(result);
            }).catch(err => res.send(err));
        } else {
            res.send('401');
        }
    }).catch(err => res.send('cannot find product with that id'));
})


// Delete a product based on id
app.delete('/product/:id', function(req, res){
    const id = req.params.id;
    Product.findById(id, function(err, product){
        if(product['user_id'] == req.body.userId){
            Product.deleteOne({ _id: id }, function (err) {
                res.send('deleted');
            });
        } else {
            res.send('401');
        }
    }).catch(err => res.send('cannot find product with that id'));

});

// Register Route
app.post('/users', function(req, res){
    // We first want to check the database to see if there is already a user with the username we are registering
    // The findOne function requires you to specify what column you are searching in and then with what value.
    // In this example we are searching the User table, for the row which for the column username, mathces the value we type in the front end (req.body.username)
    User.findOne({ username: req.body.username }, function (err, checkUser) {
        // checkUser is the result of the findOne() function.
        // if we find one then checkUser is an object with all the information about the user, but if we don't then checkUser is nothihng/null/empty
        if(checkUser){
            // the username you are asking for already exists
            res.send('user already exists');
        } else {
            // the username you are asking for is available

            //hash the password
            const hash = bcrypt.hashSync(req.body.password);
            // Create a user based on the User Model and fill it with the values from the front end
            // Make sure to save your hashed password and not the regular one
            const user = new User({
                _id: new mongoose.Types.ObjectId(),
                username: req.body.username,
                email: req.body.email,
                password: hash
            });
            // Save the user in the database
            user.save().then(result => {
                // send the result back to the front end.
                res.send(result);
            }).catch(err => res.send(err));
        }
    });
})

// Login Route
app.post('/getUser', function(req, res){
    // Just like the register route, we need to check to see if the username already exists (each username needs to be unique)
    User.findOne({ username: req.body.username }, function (err, checkUser) {;
        // If it already exists then we want to tell the user to choose another username
        if(checkUser){
            // A user exists

            // Now that we have checked to see if a username exists in the database, we need to check to see if the password matches
            // we need to check to see if the password the user is inputting matches the hashed password which is saved in the database
            // bcrypt.compareSync() checks to if they match
            if(bcrypt.compareSync(req.body.password, checkUser.password)){
                // password matches the hased password and sends back the information about the user
                res.send(checkUser);
            } else {
                // We found a user with the username you are asking for, but the password doesn't match
                res.send('invalid password');
            }
        } else {
            // A user doesnt exist
            // The front end user needs to register before logging in
            res.send('invalid user');
        }
    });

})

// Listen to the port number
// This NEEDS to be at the end of your file, other wise you won't see any of the errors which come up
app.listen(port, () => {
    // This will clear the console
    console.clear();
    console.log(`application is running on port ${port}`)
});
