import express from 'express';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import {auth} from "./middlewares/authmiddleware.js";
import { userModel,venueModel,gameModel,bookingModel} from "./models/userschema.js";
const SLOTS = [
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
  "19:00-20:00",
  "20:00-21:00"
];

const app=express();

app.use(cors({
    origin: "https://nexplay-jtot.vercel.app/"
})); //cors is a middleware that allows cross-origin requests. It enables the server to accept requests from different origins (domains) and is commonly used in web applications to allow communication between the frontend and backend hosted on different domains or ports.
app.use(express.json()); //it is a built-in middleware in Express that parses incoming requests with JSON payloads. It allows the server to automatically parse the JSON data sent in the request body and makes it accessible through req.body in route handlers. This is useful for handling API requests that send data in JSON format.


app.post("/api/v1/signup",async (req,res)=>{
    try{
        const name=req.body.name;
        const password=req.body.password;
        const email=req.body.email;
        const location=req.body.location;

        const exisitinguser=await userModel.findOne({
            email:email
        })
        if(exisitinguser){
            return res.status(403).json({
                message:"user already exists"
            })
        }
        //10 is like cost factor more secure higher number
            const hashedPassword = await bcrypt.hash(password, 10);

        await userModel.create({
                name:name,
                email:email,
                password:hashedPassword,
                location:location
        })
        res.status(201).json({
            message:"user created successfully"
        })

    }
    catch(error){
        return res.status(500).json({
            message:"internal server error"
        })
    }
});


app.post("/api/v1/signin", async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await userModel.findOne({
            email: email
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
        const token = jwt.sign(
    {
        userId: user._id
    },
    "secret123"
);

        return res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal server error"
        });

    }
});

app.get("/api/v1/venues/:venueId", async (req, res) => {

    try {

        const venue = await venueModel.findById(req.params.venueId);

        if (!venue) {

            return res.status(404).json({
                message: "Venue not found"
            });

        }

        return res.status(200).json({
            venue
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal server error"
        });

    }

});

app.post("/api/v1/venues", async (req, res) => {

    try {

        const { name, sport, location, pricePerHour, description } = req.body;

        const venue = await venueModel.create({
            name,
            sport,
            location,
            pricePerHour,
            description
        });

        return res.status(201).json({
            message: "Venue created successfully",
            venue
        });

    } catch (error) {

        return res.status(500).json({
            message: "Internal server error"
        });

    }

});


app.get("/api/v1/venues", async (req, res) => {

    try{

        const sport = req.query.sport;

        const filter = {};

        if(sport){
            filter.sport = sport;
        }

        const venues = await venueModel.find(filter);

        return res.status(200).json({
            venues
        });

    }
    catch(error){

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});


app.post("/api/v1/bookings", auth, async (req,res)=>{

    try{

        const {
            venueId,
            bookingDate,
            slot
        } = req.body;

        const venue = await venueModel.findById(venueId);

        if(!venue){
            return res.status(404).json({
                message:"Venue not found"
            });
        }

        if(!SLOTS.includes(slot)){
            return res.status(400).json({
                message:"Invalid slot"
            });
        }

        const selectedDate = new Date(bookingDate);

        const today = new Date();
        today.setHours(0,0,0,0);//sets the time of the date object to midnight (00:00:00) to compare only the date part without considering the time.

        const startOfDay = new Date(selectedDate);//
        startOfDay.setHours(0,0,0,0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23,59,59,999);

        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 10);

        if(
            selectedDate < today ||
            selectedDate > maxDate
        ){
            return res.status(400).json({
                message:"Bookings allowed only for next 10 days"
            });
        }

        const existingBooking =
        await bookingModel.findOne({

            venueId,

            bookingDate:{
                $gte:startOfDay,
                $lte:endOfDay
            },

            slot,

            status:"Booked"

        });

        if(existingBooking){

            return res.status(400).json({
                message:"Slot already booked"
            });

        }

        const booking =
        await bookingModel.create({

            userId:req.userId,

            venueId,

            bookingDate:startOfDay,

            slot

        });

        return res.status(201).json({

            message:"Venue booked successfully",

            booking

        });

    }
    catch(error){

        console.log(error);

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});


app.get(
"/api/v1/venues/:venueId/slots",
async (req,res)=>{

    try{

        const venueId = req.params.venueId;

        const selectedDate = new Date(req.query.date);

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0,0,0,0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23,59,59,999);

        const bookings = await bookingModel.find({

            venueId,

            bookingDate:{
                $gte:startOfDay,
                $lte:endOfDay
            },

            status:"Booked"

        });

        const bookedSlots = bookings.map(
            booking => booking.slot
        );

        const availableSlots = SLOTS.filter(
            slot => !bookedSlots.includes(slot)
        );

        return res.status(200).json({
            availableSlots
        });

    }
    catch(error){

        console.log(error);

        return res.status(500).json({
            error:error.message
        });

    }

});

app.delete(
"/api/v1/bookings/:bookingId",
auth,
async (req,res)=>{

    try{

        const booking =
        await bookingModel.findById(
            req.params.bookingId
        );

        if(!booking){
            return res.status(404).json({
                message:"Booking not found"
            });
        }

        if(
            booking.userId.toString()
            !== req.userId
        ){
            return res.status(403).json({
                message:"Unauthorized"
            });
        }

        booking.status =
        "Cancelled";

        await booking.save();
        await gameModel.deleteOne({
    bookingId: booking._id
});

        return res.status(200).json({
            message:"Booking cancelled"
        });

    }
    catch(error){

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});




app.get("/api/v1/bookings", auth, async (req,res)=>{

    try{

        const bookings = await bookingModel
        .find({
            userId:req.userId,
            status:"Booked"
        })
        .populate("venueId");

        return res.status(200).json({
            bookings
        });

    }
    catch(error){

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});


app.post("/api/v1/games", auth, async (req,res)=>{

    try{

        const {
            title,
            bookingId,
            maxPlayers,
            skillLevel,
            description
        } = req.body;

        const booking = await bookingModel
        .findById(bookingId)
        .populate("venueId");

        if(!booking){
            return res.status(404).json({
                message:"Booking not found"
            });
        }

        if(
            booking.userId.toString()
            !== req.userId
        ){
            return res.status(403).json({
                message:"Unauthorized"
            });
        }

        const existingGame =
        await gameModel.findOne({
            bookingId
        });

        if(existingGame){
            return res.status(400).json({
                message:"Game already exists for this booking"
            });
        }

        const game = await gameModel.create({

            title,

            sport: booking.venueId.sport,

            bookingId,

            organizerId:req.userId,

            maxPlayers,

            joinedPlayers:[
                req.userId
            ],

            skillLevel,

            description,

            status:"Open"

        });

        return res.status(201).json({

            message:"Game created successfully",

            game

        });

    }
    catch(error){

        console.log(error);

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});



app.get("/api/v1/games", async (req, res) => {

    try {

        const games = await gameModel
            .find({ status: "Open" })
            .populate("organizerId", "name")
            .populate({
                path: "bookingId",
                populate: {
                    path: "venueId"
                }
            });

        return res.status(200).json({
            games
        });

    }

    catch (error) {

        console.log(error);

        return res.status(500).json({
            error: error.message
        });

    }

});

app.post(
"/api/v1/games/:gameId/join",
auth,
async (req,res)=>{

    try{

        const game = await gameModel.findById(
            req.params.gameId
        );

        if(!game){
            return res.status(404).json({
                message:"Game not found"
            });
        }

        const alreadyJoined =
        game.joinedPlayers.some(
            player =>
            player.toString() === req.userId
        );

        if(alreadyJoined){
            return res.status(400).json({
                message:"Already joined"
            });
        }

        if(
            game.joinedPlayers.length
            >= game.maxPlayers
        ){
            return res.status(400).json({
                message:"Game is full"
            });
        }

        game.joinedPlayers.push(
            req.userId
        );

        if(
            game.joinedPlayers.length
            === game.maxPlayers
        ){
            game.status = "Full";
        }

        await game.save();

        return res.status(200).json({
            message:"Joined game successfully"
        });

    }
    catch(error){

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});

app.delete(
"/api/v1/games/:gameId/leave",
auth,
async (req,res)=>{

    try{

        const game = await gameModel.findById(
            req.params.gameId
        );

        if(!game){
            return res.status(404).json({
                message:"Game not found"
            });
        }

        game.joinedPlayers =
        game.joinedPlayers.filter(
            player =>
            player.toString()
            !== req.userId
        );

        if(game.status === "Full"){
            game.status = "Open";
        }

        await game.save();

        return res.status(200).json({
            message:"Left game successfully"
        });

    }
    catch(error){

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});

app.get("/api/v1/me", auth, async (req, res) => {

    try {

        const user = await userModel
        .findById(req.userId)
        .select("-password");

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        return res.status(200).json({

            user

        });

    }

    catch(error){

        console.log(error);

        return res.status(500).json({
            message:"Internal server error"
        });

    }

});

app.get("/api/v1/my-bookings", auth, async (req, res) => {

    try {

        const bookings = await bookingModel
            .find({
                userId: req.userId,
                status: "Booked"
            })
            .populate("venueId");

        return res.status(200).json({

            bookings

        });

    }

    catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal server error"
        });

    }

});

app.get("/api/v1/my-games", auth, async (req, res) => {

    try {

        const games = await gameModel
            .find({
                organizerId: req.userId
            })
            .populate({
                path: "bookingId",
                populate: {
                    path: "venueId"
                }
            });

        return res.status(200).json({
            games
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal server error"
        });

    }

});

app.get("/api/v1/joined-games", auth, async (req, res) => {

    try {

        const games = await gameModel
            .find({
                joinedPlayers: req.userId
            })
            .populate({
                path: "bookingId",
                populate: {
                    path: "venueId"
                }
            });

        return res.status(200).json({
            games
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal server error"
        });

    }

});
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTM2OWNmZDRjMWM2OTNmYWRhMjA1MDMiLCJpYXQiOjE3ODIwNDk4MTZ9.mJWkCTWq1JpKaZCs0Tv51ENglFLwozAIJH3GzmGH3HQ










export default app;