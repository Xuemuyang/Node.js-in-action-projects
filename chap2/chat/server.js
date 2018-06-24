const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

const cache = {};

const send404 = (response) => {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

// 提供文件数据服务
const sendFile = (response, filePath, fileContents) => {
    response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))});
    response.end(fileContents);
}

// 提供静态文件服务
const serveStatic = (response, cache, absPath) => {
    if (cache[absPath]) { // 检查文件是否缓存在内存中
        sendFile(response, absPath, cache[absPath]); // 从内存中返回文件
    } else {
        fs.readFile(absPath, (err, data) => { // 从硬盘中读取文件
            if (err) send404(response);

            cache[absPath] = data;
            sendFile(response, absPath, data); // 从硬盘中读取文件并返回
        })
    }
}

// 创建HTTP服务器，用匿名函数定义对每个请求的处理行为
const server = http.createServer((request, response) => {
    let filePath = false;
    if (request.url == '/') {
        filePath = 'public/index.html'; // 返回默认的HTML文件
    } else {
        filePath = 'public' + request.url; // 将URL路径转为文件的相对路径
    }
    let absPath = path.resolve(__dirname, filePath);
    serveStatic(response, cache, absPath); // 返回静态文件
})

server.listen(3000, () => {
    console.log('Server listening on port 3000.');
})

const chatServer = require('./lib/chat_server');
chatServer.listen(server);