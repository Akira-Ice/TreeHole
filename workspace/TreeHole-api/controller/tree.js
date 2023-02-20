/*
 * @Author: Akira
 * @Date: 2023-02-15 11:20:39
 * @LastEditTime: 2023-02-20 16:42:25
 */
const { Tree, User, Comment } = require("../model");
const { result, err } = require("../util");

const { mergeTrees } = require("../util/merge");

// 增加苗木
const addTree = async (req, res, next) => {
  try {
    const tree = new Tree(req.body);
    const data = await tree.save();
    res.send(result(200, data, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 删除苗木
const removeById = async (req, res, next) => {
  try {
    const { _id } = req.body;
    let data = await Tree.findByIdAndRemove(_id);

    // 苗木不存在
    if (!data) {
      next(err("该苗木不存在", 403, ""));
      return;
    }

    // 同步删除评论
    await Comment.deleteMany({ treeID: _id });

    res.send(result(200, data, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 修改
const modifyById = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const data = await Tree.findByIdAndUpdate(_id, req.body);

    // 苗木不存在
    if (!data) {
      next(err("苗木不存在", 403, ""));
      return;
    }

    res.send(result(200, data, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 查询苗木
const getTreeById = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const data = await Tree.find({ _id });
    const trees = await mergeTrees(data);
    res.send(result(200, trees[0] || null, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 查询苗木列表
const getTreeList = async (req, res, next) => {
  try {
    const { pageNo, limit } = req.body;
    const data = await Tree.find()
      .skip((pageNo - 1) * limit)
      .limit(limit);
    const trees = await mergeTrees(data);
    res.send(result(200, trees, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 查询用户苗木列表
const getTreeListByUserID = async (req, res, next) => {
  try {
    const { userID, pageNo, limit } = req.body;
    const trees = await Tree.find({ ownerID: userID })
      .sort({ _id: -1 })
      .skip((pageNo - 1) * limit)
      .limit(limit);

    // 苗木不存在
    if (!trees) {
      next(err("该苗木不存在", 403, ""));
      return;
    }

    const treeList = await mergeTrees(trees);
    res.send(result(200, treeList, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 查询苗木集合列表
const getTreeListByID = async (req, res, next) => {
  try {
    let { trees, pageNo, limit } = req.body;
    trees = trees.slice((pageNo - 1) * limit, pageNo * limit);
    const data = await Tree.find({ _id: { $in: trees } });
    const treeList = await mergeTrees(data);
    res.send(result(200, treeList, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 查询推荐苗木列表
const getRecommendTreeList = async (req, res, next) => {
  try {
    let { trees, pageNo, limit } = req.body;
    let hci_gt = 0;
    let hci_lt = 5;
    if (trees.length != 0) {
      // 用户浏览记录前十条
      trees = trees.slice(0, 10);
      let data = await Tree.find({ _id: { $in: trees } });
      // 计算 hci
      let hci = 0;
      data.forEach((item) => {
        hci += item.hci;
      });
      hci = hci / data.length;
      // 上下浮动 hci
      hci_gt = (hci - 0.5).toFixed(2);
      hci_lt = (hci + 0.5).toFixed(2);
      // 出界特判
      if (hci_gt < 0) hci_gt = 0;
    }

    data = await Tree.find({ hci: { $gt: hci_gt, $lt: hci_lt } })
      .sort({ _id: -1 })
      .skip((pageNo - 1) * limit)
      .limit(limit);
    const treeList = await mergeTrees(data);
    res.send(result(200, treeList, "ok"));
  } catch (e) {
    next(err(e));
  }
};

// 查询地区苗木列表
const getAreaTreeList = async (req, res, next) => {
  try {
    const { area, pageNo, limit } = req.body;
    const re = new RegExp(`${area}`, "i");
    const data = await Tree.find({ location: re })
      .skip((pageNo - 1) * limit)
      .limit(limit);
    const trees = await mergeTrees(data);
    res.send(result(200, trees, "ok"));
  } catch (e) {
    next(err(e));
  }
};

module.exports = {
  addTree,
  removeById,
  modifyById,
  getTreeById,
  getTreeList,
  getTreeListByUserID,
  getTreeListByID,
  getRecommendTreeList,
  getAreaTreeList,
};
