import mongoose ,{model,Schema} from "mongoose";
mongoose.connect("mongodb://localhost:27017/NEXPLAY")
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log("not connected");
});
const userSchema= new Schema({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,  required:true },
    location:{type:String},
     sports: [String]


    }
)

const venueSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    sport: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    pricePerHour: {
        type: Number,
        required: true
    },

    image: {
        type: String
    },

    description: {
        type: String
    }
}, {
    timestamps: true
});


const gameSchema = new Schema({

    title:{
        type:String,
        required:true
    },

    sport:{
        type:String,
        required:true
    },

    bookingId:{
        type:Schema.Types.ObjectId,
        ref:"Booking",
        required:true
    },

    organizerId:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true
    },

    maxPlayers:{
        type:Number,
        required:true
    },

    joinedPlayers:[{
        type:Schema.Types.ObjectId,
        ref:"user"
    }],

    skillLevel:{
        type:String,
        enum:[
            "Beginner",
            "Intermediate",
            "Advanced"
        ],
        default:"Beginner"
    },

    description:{
        type:String
    },

    status:{
        type:String,
        enum:["Open","Full","Cancelled"],
        default:"Open"
    }

},{
    timestamps:true
});



const bookingSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true
    },

    venueId:{
        type:Schema.Types.ObjectId,
        ref:"Venue",
        required:true
    },

    bookingDate:{
        type:Date,
        required:true
    },

    slot:{
        type:String,
        required:true
    },

    status:{
        type:String,
        enum:["Booked","Cancelled"],
        default:"Booked"
    }

},{
    timestamps:true
});

export const bookingModel = model( "Booking",bookingSchema
);

export const gameModel = model("Game", gameSchema);

export const venueModel = model("Venue", venueSchema);



export const userModel=model("user",userSchema);