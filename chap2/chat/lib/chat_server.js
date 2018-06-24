const socketio = require('socket.io');
const io;
const guestNumber = 1;
const nickNames = {};
const namesUsed = [];
const currentRoom = {};

exports.listen = (server) => {
    io = socketio.listen(server); // 启动Socket.io服务器，允许它搭载在已有的HTTP服务器上
    ios.set('log level', 1);
    io.sockets.on('connection', (socket) => { // 定义每个用户连接的处理逻辑
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); // 在用户连接上来时赋予其一个访客名
        joinRoom(socket, 'Lobby'); // 在用户连接上来时把他放入聊天室Lobby里
        handleMessageBroadcasting(socket, nickNames); // 处理用户的消息，更名，以及聊天室的创建和变更
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        socket.on('rooms', () => { // 当用户发出请求时，向其提供已经被占用的聊天室列表
            socket.emit('rooms', io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket, nickNames, namesUsed); // 定义用户断开连接后的清除逻辑
    });
};

