/*
 * @Author: Akira
 * @Date: 2022-11-13 15:12:53
 * @LastEditTime: 2023-04-07 23:21:23
 */
const { Socket, User, Record } = require("../model");
const { result, err } = require("../util");

const { mergeSockets } = require("../util/merge");

/** 同步更新记录 */
const companionSocket = async (data) => {
  const { userID1, userID2 } = data;

  /** 此处不需要考虑顺序 */
  const records = await Record.find({ userID: { $in: [userID1, userID2] } });

  /** 新增同步 */
  records[0].socket.unshift(data._id.toString());
  records[1].socket.unshift(data._id.toString());

  await Record.findByIdAndUpdate(records[0]._id, records[0]);
  await Record.findByIdAndUpdate(records[1]._id, records[1]);
};

/** 新增对话 */
const addSocket = async (req, res, next) => {
  try {
    const { userID1, userID2, treeID } = req.body;
    let socket = await Socket.findOne({ $or: [{ $and: [{ userID1 }, { userID2 }, { treeID }] }, { $and: [{ userID1: userID2 }, { userID2: userID1 }, { treeID }] }] });

    /** 会话已存在 */
    if (socket) {
      /** 会话引用数不足2 */
      if (socket.refer != 2) {
        // 获取会话成员的记录
        const records = await Record.find({ userID: { $in: [userID1, userID2] } });
        const index_0 = records[0].socket.indexOf(socket._id);
        const index_1 = records[1].socket.indexOf(socket._id);

        /** 同步删除记录 */
        if (index_0 != -1) records[0].socket.splice(index_0, 1);
        if (index_1 != -1) records[1].socket.splice(index_1, 1);

        /** 同步新增记录 */
        records[0].socket.unshift(socket._id.toString());
        records[1].socket.unshift(socket._id.toString());

        /** 更新记录 */
        await Record.findByIdAndUpdate(records[0]._id, records[0]);
        await Record.findByIdAndUpdate(records[1]._id, records[1]);

        /** 更新会话 */
        socket.refer = 2;
        await Socket.findByIdAndUpdate(socket._id, { refer: 2 });
      }
      res.send(result(200, socket, "ok"));
    } else {
      /** 会话不存在 */
      socket = new Socket(req.body);
      const data = await socket.save();

      /** 级联新增记录 */
      await companionSocket(data);
      res.send(result(200, data, "ok"));
    }
  } catch (e) {
    next(err(e));
  }
};

/** 查询会话集合列表 */
const getSocketListByID = async (req, res, next) => {
  try {
    let { sockets, pageNo, limit } = req.body;
    sockets = sockets.slice((pageNo - 1) * limit, pageNo * limit);
    let data = null;
    data = await Socket.find({ _id: { $in: sockets } });
    data = await mergeSockets(data);
    res.send(result(200, data, "ok"));
  } catch (e) {
    next(err(e));
  }
};

module.exports = {
  addSocket,
  getSocketListByID,
};
