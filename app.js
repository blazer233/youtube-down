require('dotenv').config();
const readline = require('readline');
const ytdl = require('ytdl-core');
const axios = require('axios');
const fs = require('fs');

let folder = '新建文件夹';
let starttime;

// 用于获取播放列表中的所有视频 URL
async function getPlaylistVideos(playlistId) {
  const queryTmp = {
    part: 'snippet',
    maxResults: 50,
    playlistId,
    key: process.env.API_KEY,
  };
  const response = await axios.get(
    `${process.env.BASE_URL}${Object.entries(queryTmp)
      .map(pair => pair.join('='))
      .join('&')}`
  );

  const items = response.data.items || [];
  folder = items[0]?.snippet?.title || response.data.etag;
  if (!fs.existsSync(`./dist`)) fs.mkdirSync(`./dist`);
  if (!fs.existsSync(`./dist/${folder}`)) fs.mkdirSync(`./dist/${folder}`);
  return items.map(
    item => `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
  );
}

// 下载单个视频
async function downloadVideo(url) {
  const videoInfo = await ytdl.getInfo(url);
  const videoFormat = ytdl.chooseFormat(videoInfo.formats, {
    quality: 'highest',
  });
  const videoStream = ytdl.downloadFromInfo(videoInfo, { format: videoFormat });
  return new Promise((resolve, reject) => {
    videoStream
      .pipe(
        fs.createWriteStream(
          `./dist/${folder}/${videoInfo.videoDetails.title}.mp4`
        )
      )
      .on('finish', resolve)
      .on('error', reject);

    videoStream.once('response', () => {
      starttime = Date.now();
    });
    videoStream.on('progress', (_, downloaded, total) => {
      const percent = downloaded / total;
      const downloadedMinutes = (Date.now() - starttime) / 1000 / 60;
      const estimatedDownloadTime =
        downloadedMinutes / percent - downloadedMinutes;
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded `);
      process.stdout.write(
        `(${(downloaded / 1024 / 1024).toFixed(2)}MB of ${(
          total /
          1024 /
          1024
        ).toFixed(2)}MB)\n`
      );
      process.stdout.write(
        `${
          videoInfo.videoDetails.title
        }--running for: ${downloadedMinutes.toFixed(2)}minutes`
      );
      process.stdout.write(
        `, estimated time left: ${estimatedDownloadTime.toFixed(2)}minutes `
      );
      readline.moveCursor(process.stdout, 0, -1);
    });
    videoStream.on('end', () => {
      process.stdout.write('\n\n');
    });
  });
}

// 下载播放列表中的所有视频
async function downloadPlaylist(playlistId) {
  const videoUrls = await getPlaylistVideos(playlistId);
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    console.log(`Downloading video ${i + 1}...`);
    await downloadVideo(url);
    console.log(`Downloaded video ${i + 1} success`);
  }
}

// 使用播放列表 ID 调用 downloadPlaylist 函数
downloadPlaylist('PLSRvICzY_rBOIB2ixrGcwn4DNgh3Q8jxW'); // 播放列表 ID
