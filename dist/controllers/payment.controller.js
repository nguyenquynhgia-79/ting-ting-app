"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPayments = exports.getGroupPayments = exports.getDebts = exports.rejectPayment = exports.confirmPayment = exports.createPayment = void 0;
const payment_service_1 = require("../services/payment.service");
const error_handler_1 = require("../middleware/error-handler");
exports.createPayment = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { group_id, payee_id, amount } = req.body;
    const userId = req.user.userId;
    const payment = await payment_service_1.paymentService.createPayment({
        group_id,
        payer_id: userId,
        payee_id,
        amount,
    });
    res.status(201).json(payment);
});
exports.confirmPayment = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const paymentId = req.params.paymentId;
    const userId = req.user.userId;
    const payment = await payment_service_1.paymentService.confirmPayment(paymentId, userId);
    res.json(payment);
});
exports.rejectPayment = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const paymentId = req.params.paymentId;
    const userId = req.user.userId;
    const payment = await payment_service_1.paymentService.rejectPayment(paymentId, userId);
    res.json(payment);
});
exports.getDebts = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const groupId = req.params.groupId;
    const debts = await payment_service_1.paymentService.getSimplifiedDebts(groupId);
    res.json(debts);
});
exports.getGroupPayments = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const groupId = req.params.groupId;
    const payments = await payment_service_1.paymentService.getGroupPayments(groupId);
    res.json(payments);
});
exports.getUserPayments = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const payments = await payment_service_1.paymentService.getUserPayments(userId);
    res.json(payments);
});
