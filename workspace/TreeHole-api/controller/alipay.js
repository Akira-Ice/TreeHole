/*
 * @Author: Akira
 * @Date: 2023-01-08 12:10:10
 * @LastEditTime: 2023-02-20 16:18:04
 */
const { result, err } = require("../util");
const AliPayForm = require("alipay-sdk/lib/form").default;
const alipaySdk = require("../util/alipay");
const axios = require("axios").default;

const pagePay = async (req, res, next) => {
  try {
    const { orderID, title, describe, price } = req.body;
    const bizContent = {
      /** 单号 */
      out_trade_no: orderID,
      /** 这个固定写法就行了 */
      product_code: "FAST_INSTANT_TRADE_PAY",
      /** 本次支付单的名字 */
      subject: title,
      /** 商品的描述 */
      body: describe,
      /** 总共的价格 */
      total_amount: price,
    };
    const formData = new AliPayForm();

    formData.setMethod("get");
    formData.addField("bizContent", JSON.stringify(bizContent));

    const url = await alipaySdk.exec("alipay.trade.page.pay", {}, { formData });
    res.send(result(200, url, "ok"));
  } catch (e) {
    next(err(e));
  }
};

const refund = async (req, res, next) => {
  try {
    const { orderID, price } = req.body;
    const bizContent = {
      /** 退款金额 */
      refund_amount: price,
      /** 单号 */
      out_trade_no: orderID,
    };

    const formData = new AliPayForm();

    formData.setMethod("get");
    formData.addField("bizContent", JSON.stringify(bizContent));

    const url = await alipaySdk.exec("alipay.trade.refund", {}, { formData });
    let refundRes = await axios.get(url);
    refundRes = refundRes.data.alipay_trade_refund_response;

    if (refundRes.code == "10000") {
      /** 接口调用成功 */
      if (refundRes?.fund_change == "Y") res.send(result(200, { status: 1, message: "退款成功" }, "ok"));
      else if (refundRes?.fund_change == "N") {
        res.send(result(200, { status: 0, message: "正在退款，请稍后进一步确认退款状态" }, "ok"));
      }
    } else if (refundRes.code == "20000") {
      res.send(result(500, { status: -1, message: "系统繁忙" }, "ok"));
    }
  } catch (e) {
    next(err(e));
  }
};

const query = async (req, res, next) => {
  try {
    const { orderID } = req.body;
    const bizContent = {
      out_trade_no: orderID,
    };

    const formData = new AliPayForm();

    formData.setMethod("get");
    formData.addField("bizContent", JSON.stringify(bizContent));

    const url = await alipaySdk.exec("alipay.trade.query", {}, { formData });
    let queryRes = await axios.get(url);
    queryRes = queryRes.data.alipay_trade_query_response;

    if (queryRes.code == "10000") {
      /** 接口调用成功 */
      switch (queryRes.trade_status) {
        case "WAIT_BUYER_PAY":
          res.send(result(200, { ...queryRes, status: 0, massage: "交易创建，等待买家付款" }, "ok"));
          break;
        case "TRADE_CLOSED":
          res.send(result(200, { ...queryRes, status: 1, massage: "未付款交易超时关闭，或支付完成后全额退款" }, "ok"));
          break;
        case "TRADE_SUCCESS":
          res.send(result(200, { ...queryRes, status: 2, massage: "交易支付成功" }, "ok"));
          break;
        case "TRADE_FINISHED":
          res.send(result(200, { ...queryRes, status: 3, massage: "交易结束，不可退款" }, "ok"));
          break;
      }
    } else if (queryRes.code == "40004") {
      res.send(result(200, { ...queryRes, status: -1, massage: "交易不存在，请立即支付" }, "ok"));
    }
  } catch (e) {
    next(err(e));
  }
};

module.exports = { pagePay, refund, query };
