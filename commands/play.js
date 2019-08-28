const Discord = require('discord.js');
const ytdl_d = require('ytdl-core-discord');
const ytdl = require('ytdl-core');
const youtubeapi = require('simple-youtube-api');

module.exports = {
	name: 'play',
    description: 'Plays music from YT links',
    aliases: ['add'],

    async playQueue(client, connection, msg){
        var server = client.servers[msg.guild.id];
        const dispatcher = connection.play(await ytdl_d(server.queue[0], {format: "audioonly", highWaterMark:1<<25 }), {type: 'opus', highWaterMark: 1});
        dispatcher.setVolume(0.035);
        server.dispatcher = dispatcher;
        dispatcher.on('info',(info, format) => {
            if (!info.player_response.videoDetails){
                console.log(info.player_response.videoDetails);
            }
        })
        dispatcher.on('error', error => {
            console.log(error);
            if (error.message.contains("403") || error.message.contains("ECONNRESET")){
                setTimeout(playQueue, 3000, client, msg, args);
            }
        })
        dispatcher.on("end", (reason) => {
            server.queue.shift();
            if (server.queue[0]){
                let args = "";
                client.commands.get("np").run(client, msg, args);
                playQueue(client, connection, msg);
                return;
            } else {
                server.dispatcher = null;
                const embed = new Discord.MessageEmbed()
                .setTitle("Queue ended!")
                return msg.channel.send({embed});
            }
        })
    },

	async run(client, msg, args) {
        const youtube = new youtubeapi(client.config.yt_key);
        if (!client.servers[msg.guild.id]){
            client.servers[msg.guild.id] = {
                queue : [],
                dispatcher : null,
            }
        }

        var server = client.servers[msg.guild.id];


        var song = String(args[0])
        if (!msg.member.voice.channel){
            return msg.channel.send("You're not in a voice channel!");
        }

        if (args.length === 0){
            msg.member.voice.channel.join();
            return msg.channel.send("Joined");
        }

        if (!(ytdl.validateURL(song))){
                var checkForPlaylist =  JSON.stringify(youtubeapi.util.parseURL(song))
                if (checkForPlaylist.includes("playlist")){
                    let playlistURL = song;
                    song = "";
                    const playlist = await youtube.getPlaylist(playlistURL);
                    const videos = await playlist.getVideos();
                    for (let i = 0; i < videos.length-1; i++){
                            song = "https://www.youtube.com/watch?v=" + videos[i].id;
                            server.queue.push(song);
                         }
                    song = "https://www.youtube.com/watch?v=" + videos[videos.length-1].id;
                } else {
                    var result = await youtube.searchVideos(args.join(' '), 1)
                    song = "https://www.youtube.com/watch?v=" + result[0].id;
                }
        }

        if (server.dispatcher ){
            server.queue.push(song);
            return msg.react('👍');
        }

        msg.member.voice.channel.join().then(connection =>{
            server.queue.push(song);
            client.commands.get("np").run(client, msg, args);
            module.exports.playQueue(client, connection, msg);
            })
        },
}
