const express = require('express')
const app = express();
const axios = require('axios')
const dotenv = require('dotenv')
dotenv.config();
const cookieParser = require("cookie-parser");
const { MongoClient } = require('mongodb');
const compressor = require('lzutf8');
const username = process.env.USER
const password = process.env.PASSWORD
const uri = `mongodb+srv://${username}:${password}@cluster0.pqm20.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cookieParser());
app.set("view engine", "ejs");
app.use(require('body-parser').urlencoded({ extended: false }));

app.use(express.static(__dirname + '/src'));

app.get("/", (req, res) => {
    if(req.cookies.access_token)
        res.redirect("/profile")
    res.render("home.ejs")
})

app.get("/logout", (req, res) => {
    cookie = req.cookies;
    for (var prop in cookie) {
        if (!cookie.hasOwnProperty(prop))
            continue;
        res.cookie(prop, '', {expires: new Date(0)});
    }
    res.redirect("/")
})

app.get("/login", (req, res) => {
    res.redirect("https://discord.com/api/oauth2/authorize?response_type=token&client_id=551825154108293140&state=15773059ghq9183habn&scope=identify&redirect_uri=https://discord.rub1gg.com/oauth2")
})

app.get("/oauth2", (req, res) => {
    res.render("oauth.ejs")
})

app.get("/profile", async (req, res) => {

    const headers = {
        'Authorization': 'Bearer ' + req.cookies.access_token
    }
    var userData = await axios.get("https://discord.com/api/v8/users/@me", {headers: headers})
    var userPlaylist = await getPlaylist(userData.data.id)
    res.render("profile.ejs", {user: userData.data, playlist: userPlaylist})
})

app.post("/profile", async (req, res) => {
    if(req.body.reset == "") return res.redirect("/profile")
    const headers = {'Authorization': 'Bearer ' + req.cookies.access_token}
    var userData = await axios.get("https://discord.com/api/v8/users/@me", {headers: headers})
    let playList = []
    if(req.body.save == "") {
        if(typeof(req.body.music) != "object") playList = [req.body.music]
        else {
            for(var i = 0; i < req.body.music.length; i++)
                if(req.body.music[i] != "")
                    playList.push(req.body.music[i])
        }
    }
    var result = await updatePlaylist(userData.data.id, JSON.stringify(playList))
    return res.redirect("/profile")
})

app.listen(process.env.PORT || 80, () => {
    console.log("Started")   
});

async function getPlaylist(user) {
    await client.connect()
    const collection = client.db("rub1bot").collection("users");
    var result = await collection.findOne({"id": user});
    if(!result) await collection.insertOne(result = {"id": user, playlist: ""})
    if(result.playlist != "") result.playlist = JSON.parse(compressor.decompress(result.playlist, {inputEncoding: "StorageBinaryString"}))
    client.close();
    return result.playlist;
}

async function updatePlaylist(user, playlist) {
    playlist = compressor.compress(playlist, {outputEncoding: "StorageBinaryString"});
    await client.connect()
    const collection = client.db("rub1bot").collection("users");
    var result = await collection.findOne({"id": user});
    if(!result) await collection.insertOne(result = {"id": user, 'playlist': playlist})
    if(result) await collection.updateOne({"id": user}, { $set: {'playlist': playlist} });
    client.close();
    return result.playlist;
}
