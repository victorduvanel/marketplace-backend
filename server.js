import express from 'express';
import { readdirSync } from "fs";
import cors from 'cors';
import mongoose from 'mongoose';
const morgan = require('morgan');
require ('dotenv').config();

const app = express();
// const path = require('path')

//db connection
mongoose
.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
})
.then(() => console.log('Well done Totor, your DB connected'))
.catch((err) => console.log('Wake up man! DB connection error!', err))

// middleware (cors is the XMLHTTPREQUEST permitter)
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
// app.use(express.static(path.join(__direname, '/marketplace')));


// route middleware
readdirSync("./routes").map((r) => app.use("/api", require(`./routes/${r}`)));

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Hey Totor, the server is running on port ${port}!`));
