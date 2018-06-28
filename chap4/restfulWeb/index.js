const http = require('http');
const url = require('url');
const items = []; // 用一个JS数组存放数据

const server = http.createServer((req, res) => {
    switch (req.method) {
        case 'POST':
            let item = '';
            req.setEncoding('utf8');
            req.on('data', (chunk) => {
                item += chunk;
            });
            req.on('end', () => {
                items.push(item);
                res.end('OK\n');
            });
            break;
        case 'GET':
            let body = items.map((item, i) => {
                return i + ') ' + item;
            }).join('\n');
            res.setHeader('Content-Length', Buffer.byteLength(body));
            res.setHeader('Content-Type', 'text/plain; charset="utf-8"');
            res.end(body);
            break;
        case 'DELETE':
            let path = url.parse(req.url).pathname;
            let i = parseInt(path.slice(i), 10);

            if (isNaN(i)) {
                res.statusCode = 400;
                res.end('Invalid item id');
            } else if (!items[i]) {
                res.statusCode = 404;
                res.end('Item not found');
            } else {
                items.splice(i, 1);
                res.end('OK\n');
            }
            break;
    }

});

server.listen(3000, () => {
    console.log('Server listening on port 3000.');
})