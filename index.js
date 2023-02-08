const express = require('express')
const cors = require('cors');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const app = express();

//middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzfwzfk.mongodb.net/?retryWrites=true&w=majority`;
//console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//verigyjwt
function verifyJWT(req, res, next) {
  console.log('verfi', req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized cheak')
  }
  const tokan = authHeader.split(''[1]);
  jwt.verify(tokan, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
  })

}


async function run() {
  try {
    const appointmentOPtinoCollection = client.db('doctorsprotal').collection('appointmentOption')
    const bookingsColleaction = client.db('doctorsprotal').collection('bookings')
    const usersColleaction = client.db('doctorsprotal').collection('users')
    //use aggregate to quert multiple and then merge data

    app.get('/appointmentOption', async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentOPtinoCollection.find(query).toArray();

      // get the bookings of the provided date
      const bookingQuery = { appointmentDate: date }
      const alreadyBooked = await bookingsColleaction.find(bookingQuery).toArray();

      // code carefully :D
      options.forEach(option => {
        const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
        const bookedSlots = optionBooked.map(book => book.slot);
        // console.log(option.name,bookedSlots)
        const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
        option.slots = remainingSlots;
      })
      res.send(options);
    });



    //deep mongodb

    //   app.get('/v2/appointmentOptions', async (req, res) => {
    //     const date = req.query.date;
    //     const options = await appointmentOptionCollection.aggregate([
    //         {
    //             $lookup: {
    //                 from: 'bookings',
    //                 localField: 'name',
    //                 foreignField: 'treatment',
    //                 pipeline: [
    //                     {
    //                         $match: {
    //                             $expr: {
    //                                 $eq: ['$appointmentDate', date]
    //                             }
    //                         }
    //                     }
    //                 ],
    //                 as: 'booked'
    //             }
    //         },
    //         {
    //             $project: {
    //                 name: 1,
    //                 slots: 1,
    //                 booked: {
    //                     $map: {
    //                         input: '$booked',
    //                         as: 'book',
    //                         in: '$$book.slot'
    //                     }
    //                 }
    //             }
    //         },
    //         {
    //             $project: {
    //                 name: 1,
    //                 slots: {
    //                     $setDifference: ['$slots', '$booked']
    //                 }
    //             }
    //         }
    //     ]).toArray();
    //     res.send(options);
    // })

    /***
     * API Naming Convention 
     * app.get('/bookings')
     * app.get('/bookings/:id')
     * app.post('/bookings')
     * app.patch('/bookings/:id')
     * app.delete('/bookings/:id')
    */



    //booing
    //get
    // email user
    app.get('/booking', verifyJWT, async (req, res) => {
      const email = req.query.email;
      //   const decodeEmail=req.query.email;
      //   if(email==decodeEmail){
      //  return res.status(403).send({message:'forbidden access'})
      //   }
      const query = { email: email };
      const booking = await bookingsColleaction.find(query).toArray();
      res.send(booking)
    })



    //post

    app.post('/bookings', async (req, res) => {
      const booking = req.body;


      console.log(booking);
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment
      }

      const alreadyBooked = await bookingsColleaction.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You already have a booking on ${booking.appointmentDate}`
        return res.send({ acknowledged: false, message })
      }



      const result = await bookingsColleaction.insertOne(booking);
      res.send(result);
    })
    //jwt
    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersColleaction.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    });


    //alluers
    app.get('/users', async (req, res) => {
      const query = {};
      const users = await usersColleaction.find(query).toArray();
      res.send(users);
    })

    //users
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersColleaction.insertOne(user);
      res.send(result);
    })

   //who is admin
   app.get('/users/admin/:email',async(req,res)=>{
    const email=req.params.email;
    const query={email};
    const user=await usersColleaction.findOne(query);
    res.send({isAdmin:user?.role==='admin'});

   })


    //admin role
    app.put('/users/admin/:id',verifyJWT, async (req, res) => {
      const decodeEmail=req.decoded.email;
      const query={email: decodeEmail}

      if(user?.rle !=='admin'){
        return res.status(403).send({message:'forbidden access'})
      }
      const user=await usersColleaction.aggregate.findOne(query)

      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const UpdataedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersColleaction.updateOne(filter, UpdataedDoc, options)
      res.send(result);
    })

  }
  finally {

  }
}
run().catch(console.log)


app.get('/', async (req, res) => {
  res.send('doctors protal servar is running')
})
app.listen(port, () => console.log(`Doctors protal running on ${port}`))