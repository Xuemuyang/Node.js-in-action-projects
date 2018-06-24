const socketio = require('socket.io');
let io;
let guestNumber = 1;
const nickNames = {};
const namesUsed = [];
const currentRoom = {};

const assignGuestName = (socket, guestNumber, nickNames, namesUsed) => {
    let name = 'Guest' + guestNumber; // 生成新昵称
    nickNames[socket.id] = name; // 把用户昵称跟客户端连接ID关联上
    socket.emit('nameResult', { // 让用户知道他们的昵称
        success: true,
        name: name
    });
    namesUsed.push(name); // 存放已经被占用的昵称
    return guestNumber + 1; // 增加用来生成昵称的计数器
};

const joinRoom = (socket, room) => {
    socket.join(room); // 让用户进入房间
    currentRoom[socket.id] = room; // 记录用户的当前房间
    socket.emit('joinResult', { // 让用户知道他们进入了新的房间
        room: room
    });
    socket.broadcast.to(room).emit('message', { // 让房间里的其他用户知道有新用户进入了房间
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    let usersInRoom = io.sockets.clients(room); // 确定有哪些用户在这个房间里
    if (usersInRoom.length > 1) { // 如果不止一个用户在这个房间里，汇总下都是谁
        let usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (let index in usersInRoom) {
            let userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', { // 将房间里其他用户的汇总发给这个用户
            text: usersInRoomSummary
        });
    }
};

const handleNameChangeAttempts = (socket, nickNames, namesUsed) => {
    socket.on('nameAttempt', (name) => { // 添加nameAttempt事件的监听器
        if (name.startsWith('Guest')) { // 昵称不能以Guest开头
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            if (!~namesUsed.indexOf(name)) { // 如果昵称还没注册就注册上
                let previousName = nickNames[socket.id];
                let previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex]; // 删除之前的昵称
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                socket.emit('nameResult', { // 如果昵称已经被占用，给客户端发送错误消息
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
};

const handleMessageBroadcasting = (socket) => {
    socket.on('message', (message) => {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
};

const handleRoomJoining = (socket) => {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
};

const handleClientDisconnection = (socket) => {
    socket.on('disconnect', function () {
        let nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
};

exports.listen = (server) => {
    io = socketio.listen(server); // 启动Socket.io服务器，允许它搭载在已有的HTTP服务器上
    io.set('log level', 1);
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