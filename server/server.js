const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("./schema/signup");
const Message = require("./schema/Message");
const jwtSecret = "hyceecdghbsedscushdxnsuigxcyushdhwuidhuwgduwhduw";
const bcryptSalt = bcrypt.genSaltSync(10);
const ws =require("ws")
const mongoose = require("mongoose");
const fs = require('fs');
mongoose.connect(process.env.MONGO_URL).then(() => { console.log("mongodb-connected");});

app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
//app.use(cors({ credentials: true, origin: process.env.CLIENT_URL || "http://localhost:5173" }));


const corsOptions = {
  credentials: true,
  origin: ["https://chat-app-hishan03.vercel.app", "https://chat-4778gwoiq-hishan03.vercel.app/","https://adorable-dodol-b60c24.netlify.app"],
  allowedHeaders: "*",
};

app.use(cors(corsOptions));


app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) console.log(err);
      res.json(userData);
      console.log("profile-connected")
    });
  } else {
    res.status(401).json("no token");
    console.log("profile-NOT-connected")
    
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: foundUser._id,
          });
        }
      );
      console.log("login Sucessfull")
    }
  }
});

app.get('/people', async (req,res) => {
  const users = await User.find({}, {'_id':1,username:1});
  res.json(users);
 
});







app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    if (err) throw err;
    res.status(500).json("error");
  }
});


const server = app.listen(process.env.PORT || 3000, () => {
  console.log("server-connected");
});
const wss= new ws.WebSocketServer({server});


wss.on('connection',(connection,req)=>{

  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
      }));
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('dead');
    }, 1000);
  }, 5000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });

const cookie=req.headers.cookie;
if(cookie)
{
  const tokenCookieString=cookie.split(';').find(str=>str.startsWith('token='))
  if(tokenCookieString)
  {
  const token =  tokenCookieString.split('=')[1];
  jwt.verify(token,jwtSecret,{},(err,Userdata)=>
  {
    if(err) console.log(err)
    const {userId,username}=Userdata;
    connection.userId=userId;
    connection.username=username;
   })}}


async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject('no token');
    }
  });
}

app.get('/messages/:userId', async (req,res) => {
  const {userId} = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
  }).sort({createdAt: 1});
  res.json(messages);
});

app.post('/logout', (req,res) => {
  res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
});

connection.on('message', async (message) => {
  const messageData = JSON.parse(message.toString());
  const {recipient, text, file} = messageData;
  let filename = null;
  if (file) {
    console.log('size', file.data.length);
    const parts = file.name.split('.');
    const ext = parts[parts.length - 1];
    filename = Date.now() + '.'+ext;
    const path = __dirname + '/uploads/' + filename;
    const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
    fs.writeFile(path, bufferData, () => {
      console.log('file saved:'+path);
    });
  }
  if (recipient && (text || file)) {
    const messageDoc = await Message.create({
      sender:connection.userId,
      recipient,
      text,
      file: file ? filename : null,
    });
    console.log('created message');
    [...wss.clients]
      .filter(c => c.userId === recipient)
      .forEach(c => c.send(JSON.stringify({
        text,
        sender:connection.userId,
        recipient,
        file: file ? filename : null,
        _id:messageDoc._id,
      })));
  }
});
notifyAboutOnlinePeople();

})
