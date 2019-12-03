const Discord = require('discord.js');
const ytdl_d = require('ytdl-core-discord');
const ytdl = require('ytdl-core');
const youtubeapi = require('simple-youtube-api');

module.exports = {
	name: 'play',
    description: 'Plays music from YT links',
    aliases: ['add'],

    async playQueue(client, connection, msg){
        let server = client.servers[msg.guild.id];
        try {
            client.commands.get("np").run(client, msg, "");
            var getSong = await ytdl_d(server.queue[0], {format: "audioonly", highWaterMark:1<<25});
        } catch (error){
            console.log("[BOT] Error playing music: \n");
            console.log(error);
            server.queue.shift();
            if (server.queue[0]){
                this.playQueue(client, connection, msg);
                return;
            } else {
                server.dispatcher = null;
                const embed = new Discord.MessageEmbed()
                .setTitle("Queue ended!")
                return msg.channel.send({embed});
            }
        }

        var dispatcher = connection.play(getSong, {type: 'opus'});
        dispatcher.setVolume(0.035);
        server.dispatcher = dispatcher;

        dispatcher.on("end", (reason) => {
            server.queue.shift();
            if (server.queue[0]){
                this.playQueue(client, connection, msg);
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

        let server = client.servers[msg.guild.id];


        let song = String(args[0])
        if (!msg.member.voice.channel){
            return msg.channel.send("You're not in a voice channel!");
        }

        if (args.length === 0 && !msg.guild.voice){
            msg.member.voice.channel.join();
            return msg.channel.send("Joined");
        } else if (args.length === 0){
            return msg.channel.send("No args provided?");
        }

        if (!(ytdl.validateURL(song))){
                let checkForPlaylist =  JSON.stringify(youtubeapi.util.parseURL(song))
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
                    let result = await youtube.searchVideos(args.join(' '), 1)
                    song = "https://www.youtube.com/watch?v=" + result[0].id;
                }
        }

        if (server.dispatcher){
            server.queue.push(song);
            return msg.react('👍');
        }

        msg.member.voice.channel.join().then(connection =>{
            server.queue.push(song);
            module.exports.playQueue(client, connection, msg);
            })

        return true
        },
}
